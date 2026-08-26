
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

from database.db import get_db_connection


doctor_bp = Blueprint(
    "doctor",
    __name__,
    url_prefix="/api/doctors"
)


# --------------------------------
# GET ALL DOCTORS
# --------------------------------

@doctor_bp.route("", methods=["GET"])
def get_doctors():
    connection = get_db_connection()

    try:
        doctors = connection.execute(
            """
            SELECT
                doctor_id,
                name,
                email,
                phone,
                specialization,
                nmc_number,
                experience,
                practice_at,
                consultation_fee,
                status
            FROM DOCTOR
            ORDER BY name
            """
        ).fetchall()

        return jsonify({
            "doctors": [dict(doctor) for doctor in doctors]
        }), 200

    finally:
        connection.close()


# --------------------------------
# CREATE DOCTOR
# --------------------------------

@doctor_bp.route("", methods=["POST"])
def create_doctor():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    # -----------------------------
    # Doctor details
    # -----------------------------

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    specialization = data.get("specialization", "").strip()
    nmc_number = data.get("nmc_number", "").strip()
    experience = data.get("experience")
    practice_at = data.get("practice_at", "").strip()
    consultation_fee = data.get("consultation_fee")

    # -----------------------------
    # Basic validation
    # -----------------------------

    if not name or not email or not specialization:
        return jsonify({
            "error": "Name, email, and specialization are required"
        }), 400

    if not nmc_number:
        return jsonify({
            "error": "NMC number is required"
        }), 400

    if experience is None:
        return jsonify({
            "error": "Experience is required"
        }), 400

    if not practice_at:
        return jsonify({
            "error": "Practice location is required"
        }), 400

    if consultation_fee is None:
        return jsonify({
            "error": "Consultation fee is required"
        }), 400

    # -----------------------------
    # Validate numeric fields
    # -----------------------------

    try:
        experience = int(experience)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Experience must be a valid number"
        }), 400

    if experience < 0:
        return jsonify({
            "error": "Experience cannot be negative"
        }), 400

    try:
        consultation_fee = float(consultation_fee)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Consultation fee must be a valid number"
        }), 400

    if consultation_fee < 0:
        return jsonify({
            "error": "Consultation fee cannot be negative"
        }), 400

    connection = get_db_connection()

    try:
        # -----------------------------
        # Check duplicate email
        # -----------------------------

        existing_email = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if existing_email:
            return jsonify({
                "error": "Email is already registered"
            }), 409

        # -----------------------------
        # Check duplicate NMC number
        # -----------------------------

        existing_nmc = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE nmc_number = ?
            """,
            (nmc_number,)
        ).fetchone()

        if existing_nmc:
            return jsonify({
                "error": "NMC number is already registered"
            }), 409

        # -----------------------------
        # Generate temporary password
        # -----------------------------

        temporary_password = secrets.token_urlsafe(8)

        password_hash = generate_password_hash(
            temporary_password
        )

        # -----------------------------
        # Create doctor
        # -----------------------------

        cursor = connection.execute(
            """
            INSERT INTO DOCTOR (
                name,
                email,
                password,
                phone,
                specialization,
                nmc_number,
                experience,
                practice_at,
                consultation_fee,
                status,
                must_change_password
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                email,
                password_hash,
                phone or None,
                specialization,
                nmc_number,
                experience,
                practice_at,
                consultation_fee,
                "Active",
                1
            )
        )

        doctor_id = cursor.lastrowid

        connection.commit()

        return jsonify({
            "message": "Doctor registered successfully",
            "doctor": {
                "doctor_id": doctor_id,
                "name": name,
                "email": email,
                "phone": phone or None,
                "specialization": specialization,
                "nmc_number": nmc_number,
                "experience": experience,
                "practice_at": practice_at,
                "consultation_fee": consultation_fee,
                "status": "Active"
            },
            "temporary_credentials": {
                "email": email,
                "password": temporary_password
            }
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

# --------------------------------
# GET ONE DOCTOR
# --------------------------------

@doctor_bp.route("/<int:doctor_id>", methods=["GET"])
def get_doctor(doctor_id):
    connection = get_db_connection()

    try:
        doctor = connection.execute(
            """
            SELECT
                doctor_id,
                name,
                email,
                phone,
                specialization,
                nmc_number,
                experience,
                practice_at,
                consultation_fee,
                status
            FROM DOCTOR
            WHERE doctor_id = ?
            """,
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Doctor not found"
            }), 404

        return jsonify({
            "doctor": dict(doctor)
        }), 200

    finally:
        connection.close()        


# --------------------------------
# UPDATE DOCTOR
# --------------------------------

@doctor_bp.route("/<int:doctor_id>", methods=["PUT"])
def update_doctor(doctor_id):
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    # -----------------------------
    # Get updated values
    # -----------------------------

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    specialization = data.get("specialization", "").strip()
    nmc_number = data.get("nmc_number", "").strip()
    experience = data.get("experience")
    practice_at = data.get("practice_at", "").strip()
    consultation_fee = data.get("consultation_fee")
    status = data.get("status", "Active").strip()

    # -----------------------------
    # Basic validation
    # -----------------------------

    if not name or not email or not specialization:
        return jsonify({
            "error": "Name, email, and specialization are required"
        }), 400

    if not nmc_number:
        return jsonify({
            "error": "NMC number is required"
        }), 400

    if experience is None:
        return jsonify({
            "error": "Experience is required"
        }), 400

    if not practice_at:
        return jsonify({
            "error": "Practice location is required"
        }), 400

    if consultation_fee is None:
        return jsonify({
            "error": "Consultation fee is required"
        }), 400

    if status not in {"Active", "Inactive"}:
        return jsonify({
            "error": "Status must be Active or Inactive"
        }), 400

    # -----------------------------
    # Validate numeric fields
    # -----------------------------

    try:
        experience = int(experience)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Experience must be a valid number"
        }), 400

    if experience < 0:
        return jsonify({
            "error": "Experience cannot be negative"
        }), 400

    try:
        consultation_fee = float(consultation_fee)
    except (TypeError, ValueError):
        return jsonify({
            "error": "Consultation fee must be a valid number"
        }), 400

    if consultation_fee < 0:
        return jsonify({
            "error": "Consultation fee cannot be negative"
        }), 400

    connection = get_db_connection()

    try:
        # -----------------------------
        # Check doctor exists
        # -----------------------------

        existing_doctor = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE doctor_id = ?
            """,
            (doctor_id,)
        ).fetchone()

        if not existing_doctor:
            return jsonify({
                "error": "Doctor not found"
            }), 404

        # -----------------------------
        # Check duplicate email
        # -----------------------------

        existing_email = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE email = ?
              AND doctor_id != ?
            """,
            (email, doctor_id)
        ).fetchone()

        if existing_email:
            return jsonify({
                "error": "Email is already registered"
            }), 409

        # -----------------------------
        # Check duplicate NMC number
        # -----------------------------

        existing_nmc = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE nmc_number = ?
              AND doctor_id != ?
            """,
            (nmc_number, doctor_id)
        ).fetchone()

        if existing_nmc:
            return jsonify({
                "error": "NMC number is already registered"
            }), 409

        # -----------------------------
        # Update doctor
        # -----------------------------

        connection.execute(
            """
            UPDATE DOCTOR
            SET
                name = ?,
                email = ?,
                phone = ?,
                specialization = ?,
                nmc_number = ?,
                experience = ?,
                practice_at = ?,
                consultation_fee = ?,
                status = ?
            WHERE doctor_id = ?
            """,
            (
                name,
                email,
                phone or None,
                specialization,
                nmc_number,
                experience,
                practice_at,
                consultation_fee,
                status,
                doctor_id
            )
        )

        connection.commit()

        # -----------------------------
        # Return updated doctor
        # -----------------------------

        doctor = connection.execute(
            """
            SELECT
                doctor_id,
                name,
                email,
                phone,
                specialization,
                nmc_number,
                experience,
                practice_at,
                consultation_fee,
                status
            FROM DOCTOR
            WHERE doctor_id = ?
            """,
            (doctor_id,)
        ).fetchone()

        return jsonify({
            "message": "Doctor updated successfully",
            "doctor": dict(doctor)
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------
# DOCTOR LOGIN
# --------------------------------

@doctor_bp.route("/login", methods=["POST"])
def doctor_login():
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
        doctor = connection.execute(
            """
            SELECT
                doctor_id,
                name,
                email,
                password,
                specialization,
                status,
                must_change_password
            FROM DOCTOR
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        if not check_password_hash(
            doctor["password"],
            password
        ):
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        if doctor["status"] != "Active":
            return jsonify({
                "error": "Doctor account is inactive"
            }), 403

        return jsonify({
            "message": "Login successful",
            "doctor": {
                "doctor_id": doctor["doctor_id"],
                "name": doctor["name"],
                "email": doctor["email"],
                "specialization": doctor["specialization"]
            },
            "must_change_password": bool(
                doctor["must_change_password"]
            )
        }), 200

    finally:
        connection.close()



# --------------------------------
# CHANGE DOCTOR PASSWORD
# --------------------------------

@doctor_bp.route("/change-password", methods=["POST"])
def change_doctor_password():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    doctor_id = data.get("doctor_id")
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not doctor_id or not current_password or not new_password:
        return jsonify({
            "error": "doctor_id, current_password, and new_password are required"
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "error": "New password must be at least 6 characters"
        }), 400

    if current_password == new_password:
        return jsonify({
            "error": "New password must be different from current password"
        }), 400

    connection = get_db_connection()

    try:
        doctor = connection.execute(
            """
            SELECT
                doctor_id,
                password,
                must_change_password
            FROM DOCTOR
            WHERE doctor_id = ?
            """,
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Doctor not found"
            }), 404

        if not check_password_hash(
            doctor["password"],
            current_password
        ):
            return jsonify({
                "error": "Current password is incorrect"
            }), 401

        new_password_hash = generate_password_hash(
            new_password
        )

        connection.execute(
            """
            UPDATE DOCTOR
            SET
                password = ?,
                must_change_password = 0
            WHERE doctor_id = ?
            """,
            (
                new_password_hash,
                doctor_id
            )
        )

        connection.commit()

        return jsonify({
            "message": "Password changed successfully",
            "must_change_password": False
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()

