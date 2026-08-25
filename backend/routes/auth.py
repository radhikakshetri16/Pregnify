from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from database.db import get_db_connection


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


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

    age = data.get("age")
    gender = data.get("gender", "").strip()
    phone = data.get("phone", "").strip()

    # -----------------------------
    # Patient details
    # -----------------------------
    patient_name = data.get("patient_name", "").strip()
    patient_age = data.get("patient_age")
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

    if len(password) < 6:
        return jsonify({
            "error": "Password must be at least 6 characters"
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
            "error": "Invalid relationship type"
        }), 400

    if not patient_name:
        return jsonify({
            "error": "Patient name is required"
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