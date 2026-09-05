import re
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from database.db import get_db_connection


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def validate_password_complexity(password: str):
    """
    Validate password complexity:
    - At least 6 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[^A-Za-z0-9]", password):
        return False, "Password must contain at least one special character."
    return True, None


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    # -----------------------------
    # Account holder / USER details
    # -----------------------------
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    raw_age = data.get("age")
    gender = data.get("gender", "").strip()
    phone = data.get("phone", "").strip()

    # -----------------------------
    # Patient details
    # -----------------------------
    patient_name = data.get("patient_name", "").strip()
    raw_patient_age = data.get("patient_age")
    patient_gender = data.get("patient_gender", "").strip()
    patient_phone = data.get("patient_phone", "").strip()
    patient_address = data.get("patient_address", "").strip()
    relationship_type = data.get("relationship_type", "").strip()

    # -----------------------------
    # Basic validation
    # -----------------------------
    if not name or not email or not password:
        return jsonify({
            "error": "Name, email, and password are required"
        }), 400

    # Validate password complexity
    is_valid_pw, pw_error = validate_password_complexity(password)
    if not is_valid_pw:
        return jsonify({
            "error": pw_error
        }), 400

    # Validate Account Holder Age
    if raw_age is None or str(raw_age).strip() == "":
        return jsonify({
            "error": "Account holder age is required"
        }), 400

    try:
        age = int(raw_age)
    except (ValueError, TypeError):
        return jsonify({
            "error": "Account holder age must be a valid number"
        }), 400

    allowed_relationships = {
        "Self",
        "Husband",
        "Caretaker",
        "Guardian",
        "Other"
    }

    if relationship_type not in allowed_relationships:
        return jsonify({
            "error": "Invalid relationship type. Allowed options: Self, Husband, Caretaker, Guardian, Other"
        }), 400

    # -----------------------------
    # Age & Relationship Logic
    # -----------------------------
    if relationship_type == "Self":
        # Account Holder IS the Patient
        if age < 16:
            return jsonify({
                "error": "Pregnify is only available for patients aged 16 and above."
            }), 400
        if age < 18:
            return jsonify({
                "error": "Patients aged 16–17 cannot create an account independently. An adult representative (18+) must create and manage the account."
            }), 400

        # Self patient details copy from account holder
        patient_name = name
        patient_age = age
        patient_gender = gender
        patient_phone = phone
    else:
        # Account Holder IS NOT the Patient (Representative)
        if age < 18:
            return jsonify({
                "error": "The account holder / representative must be at least 18 years old."
            }), 400

        if not patient_name:
            return jsonify({
                "error": "Patient full name is required"
            }), 400

        if raw_patient_age is None or str(raw_patient_age).strip() == "":
            return jsonify({
                "error": "Patient age is required"
            }), 400

        try:
            patient_age = int(raw_patient_age)
        except (ValueError, TypeError):
            return jsonify({
                "error": "Patient age must be a valid number"
            }), 400

        if patient_age < 16:
            return jsonify({
                "error": "Patient must be at least 16 years old. Pregnify does not support registrations for patients below 16."
            }), 400

    connection = get_db_connection()

    try:
        # Check whether the email is already registered
        existing_user = connection.execute(
            """
            SELECT user_id
            FROM USER
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if existing_user:
            return jsonify({
                "error": "Email is already registered"
            }), 409

        # Hash password before storing it
        password_hash = generate_password_hash(password)

        # -----------------------------
        # Create USER
        # -----------------------------
        cursor = connection.execute(
            """
            INSERT INTO USER (
                name,
                email,
                password,
                age,
                gender,
                phone
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                email,
                password_hash,
                age,
                gender or None,
                phone or None
            )
        )

        user_id = cursor.lastrowid

        # -----------------------------
        # Create PATIENT
        # -----------------------------
        connection.execute(
            """
            INSERT INTO PATIENT (
                user_id,
                name,
                age,
                gender,
                phone,
                address,
                relationship_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                patient_name,
                patient_age,
                patient_gender or None,
                patient_phone or None,
                patient_address or None,
                relationship_type
            )
        )

        # Both USER and PATIENT are committed together
        connection.commit()

        return jsonify({
            "message": "Registration successful",
            "user": {
                "user_id": user_id,
                "name": name,
                "email": email
            },
            "patient": {
                "name": patient_name,
                "relationship_type": relationship_type
            }
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    connection = get_db_connection()

    try:
        user = connection.execute(
            """
            SELECT user_id, name, email, password
            FROM USER
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if not user:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        if not check_password_hash(user["password"], password):
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["user_id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200

    finally:
        connection.close()