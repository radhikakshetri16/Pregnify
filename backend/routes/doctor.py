
import re
from datetime import date, datetime
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from database.db import get_db_connection


doctor_bp = Blueprint(
    "doctor",
    __name__,
    url_prefix="/api/doctors"
)


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
                d.doctor_id,
                d.name,
                d.email,
                d.phone,
                d.specialization,
                d.nmc_number,
                d.experience,
                d.practice_at,
                d.consultation_fee,
                d.status,
                COUNT(a.appointment_id) AS scheduled_appointments,
                COALESCE(SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END), 0)
                    AS completed_appointments,
                ROUND(d.consultation_fee * COUNT(a.appointment_id), 2) AS earnings
            FROM DOCTOR d
            LEFT JOIN APPOINTMENT a
                ON a.doctor_id = d.doctor_id
               AND a.status <> 'Cancelled'
            GROUP BY d.doctor_id
            ORDER BY d.name
            """
        ).fetchall()

        return jsonify({
            "doctors": [
                {
                    **dict(doctor),
                    "progress_goal": 10,
                    "progress_percent": min(
                        (doctor["completed_appointments"] / 10) * 100,
                        100,
                    ),
                }
                for doctor in doctors
            ]
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
    password = data.get("password", "")
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

    if not password:
        return jsonify({
            "error": "Initial password is required"
        }), 400

    is_valid_pw, pw_error = validate_password_complexity(password)
    if not is_valid_pw:
        return jsonify({
            "error": pw_error
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
        # Hash provided password
        # -----------------------------

        password_hash = generate_password_hash(password)

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

    is_valid_pw, pw_error = validate_password_complexity(new_password)
    if not is_valid_pw:
        return jsonify({
            "error": pw_error
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


# --------------------------------
# DELETE DOCTOR (ADMIN ACTION)
# --------------------------------
@doctor_bp.route("/<int:doctor_id>", methods=["DELETE"])
def delete_doctor(doctor_id):
    connection = get_db_connection()

    try:
        doctor = connection.execute(
            "SELECT doctor_id FROM DOCTOR WHERE doctor_id = ?",
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Doctor not found"
            }), 404

        # Check if doctor has associated appointments or medications
        has_appointments = connection.execute(
            "SELECT 1 FROM APPOINTMENT WHERE doctor_id = ? LIMIT 1",
            (doctor_id,)
        ).fetchone()

        has_medications = connection.execute(
            "SELECT 1 FROM MEDICATION WHERE prescribed_by = ? LIMIT 1",
            (doctor_id,)
        ).fetchone()

        if has_appointments or has_medications:
            return jsonify({
                "error": "Cannot delete doctor with existing appointment or medication records. Please deactivate doctor instead."
            }), 400

        connection.execute(
            "DELETE FROM DOCTOR WHERE doctor_id = ?",
            (doctor_id,)
        )
        connection.commit()

        return jsonify({
            "message": "Doctor deleted successfully"
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------
# TOGGLE / UPDATE DOCTOR STATUS
# --------------------------------
@doctor_bp.route("/<int:doctor_id>/status", methods=["PATCH"])
def update_doctor_status(doctor_id):
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    status = data.get("status")

    if status not in {"Active", "Inactive"}:
        return jsonify({
            "error": "Status must be Active or Inactive"
        }), 400

    connection = get_db_connection()

    try:
        doctor = connection.execute(
            "SELECT doctor_id FROM DOCTOR WHERE doctor_id = ?",
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Doctor not found"
            }), 404

        connection.execute(
            "UPDATE DOCTOR SET status = ? WHERE doctor_id = ?",
            (status, doctor_id)
        )
        connection.commit()

        return jsonify({
            "message": f"Doctor status updated to {status}",
            "status": status
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------
# DOCTOR AUTHORIZATION HELPER
# --------------------------------
def verify_doctor_authorization(connection, doctor_id):
    """
    Determines and verifies the authenticated doctor.
    Derives authenticated doctor identity from:
    1. Header: X-Doctor-Id, Doctor-Id, X-Authenticated-Doctor-Id
    2. Header: Authorization: Bearer <id>
    3. Query param / JSON body: auth_doctor_id

    Returns (doctor_row, None) if authorized, or (None, (error_response, status_code)).
    """
    auth_header = (
        request.headers.get("X-Doctor-Id")
        or request.headers.get("Doctor-Id")
        or request.headers.get("X-Authenticated-Doctor-Id")
    )
    if not auth_header:
        bearer = request.headers.get("Authorization", "")
        if bearer.startswith("Bearer "):
            auth_header = bearer[7:].strip()
    if not auth_header:
        auth_header = request.args.get("auth_doctor_id") or (
            request.get_json(silent=True) or {}
        ).get("auth_doctor_id")

    if not auth_header:
        return None, (jsonify({"error": "Authentication required. Please log in as a doctor."}), 401)

    try:
        auth_doctor_id = int(auth_header)
    except (TypeError, ValueError):
        return None, (jsonify({"error": "Invalid doctor authentication credential"}), 401)

    if auth_doctor_id != doctor_id:
        return None, (jsonify({"error": "Access denied. You are not authorized to access another doctor's data."}), 403)

    doctor = connection.execute(
        "SELECT doctor_id, name, status FROM DOCTOR WHERE doctor_id = ?",
        (auth_doctor_id,),
    ).fetchone()

    if not doctor:
        return None, (jsonify({"error": "Doctor not found"}), 404)
    if doctor["status"] != "Active":
        return None, (jsonify({"error": "Doctor account is inactive"}), 403)

    return doctor, None


# --------------------------------
# DOCTOR DASHBOARD STATS
# --------------------------------
@doctor_bp.route("/<int:doctor_id>/dashboard-stats", methods=["GET"])
def get_doctor_dashboard_stats(doctor_id):
    connection = get_db_connection()

    try:
        doctor, err_response = verify_doctor_authorization(connection, doctor_id)
        if err_response:
            return err_response

        # Today's appointments count
        today_count = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM APPOINTMENT
            WHERE doctor_id = ?
              AND appointment_date = DATE('now')
              AND status <> 'Cancelled'
            """,
            (doctor_id,)
        ).fetchone()["total"]

        # Upcoming appointments count (future dates)
        upcoming_count = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM APPOINTMENT
            WHERE doctor_id = ?
              AND appointment_date >= DATE('now')
              AND status NOT IN ('Completed', 'Cancelled')
            """,
            (doctor_id,)
        ).fetchone()["total"]

        # Total distinct patients (only counting active/completed appointments)
        total_patients = connection.execute(
            """
            SELECT COUNT(DISTINCT a.patient_id) AS total
            FROM APPOINTMENT a
            WHERE a.doctor_id = ?
              AND a.status <> 'Cancelled'
            """,
            (doctor_id,)
        ).fetchone()["total"]

        # Completed appointments
        completed_count = connection.execute(
            """
            SELECT COUNT(*) AS total
            FROM APPOINTMENT
            WHERE doctor_id = ?
              AND status = 'Completed'
            """,
            (doctor_id,)
        ).fetchone()["total"]

        # Today's appointment list
        today_appointments = connection.execute(
            """
            SELECT
                a.appointment_id,
                a.patient_id,
                a.appointment_type,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                p.name AS patient_name,
                p.phone AS patient_phone
            FROM APPOINTMENT a
            JOIN PATIENT p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ?
              AND a.appointment_date = DATE('now')
              AND a.status <> 'Cancelled'
            ORDER BY a.appointment_time ASC
            """,
            (doctor_id,)
        ).fetchall()

        # Upcoming appointment list (next 5)
        upcoming_appointments = connection.execute(
            """
            SELECT
                a.appointment_id,
                a.patient_id,
                a.appointment_type,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                p.name AS patient_name,
                p.phone AS patient_phone
            FROM APPOINTMENT a
            JOIN PATIENT p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ?
              AND a.appointment_date >= DATE('now')
              AND a.status NOT IN ('Completed', 'Cancelled')
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
            LIMIT 5
            """,
            (doctor_id,)
        ).fetchall()

        return jsonify({
            "stats": {
                "today_appointments": today_count,
                "upcoming_appointments": upcoming_count,
                "total_patients": total_patients,
                "completed_appointments": completed_count
            },
            "today_appointments": [dict(r) for r in today_appointments],
            "upcoming_appointments": [dict(r) for r in upcoming_appointments]
        }), 200

    finally:
        connection.close()


# --------------------------------
# DOCTOR APPOINTMENTS
# --------------------------------
@doctor_bp.route("/<int:doctor_id>/appointments", methods=["GET"])
def get_doctor_appointments(doctor_id):
    connection = get_db_connection()

    try:
        doctor, err_response = verify_doctor_authorization(connection, doctor_id)
        if err_response:
            return err_response

        appointments = connection.execute(
            """
            SELECT
                a.appointment_id,
                a.patient_id,
                a.doctor_id,
                a.booked_by,
                a.appointment_type,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.doctor_notes,
                a.diagnosis,
                a.tests_recommended,
                a.follow_up_date,
                a.next_appointment,
                p.name AS patient_name,
                p.age AS patient_age,
                p.gender AS patient_gender,
                p.phone AS patient_phone,
                p.relationship_type
            FROM APPOINTMENT a
            JOIN PATIENT p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
            """,
            (doctor_id,)
        ).fetchall()

        return jsonify({
            "appointments": [dict(a) for a in appointments]
        }), 200

    finally:
        connection.close()


# --------------------------------
# UPDATE APPOINTMENT (STATUS / NOTES)
# --------------------------------
@doctor_bp.route("/<int:doctor_id>/appointments/<int:appointment_id>", methods=["PUT"])
def update_doctor_appointment(doctor_id, appointment_id):
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    status = data.get("status")
    if status and status not in {"Pending", "Confirmed", "Completed", "Cancelled"}:
        return jsonify({
            "error": "Invalid appointment status"
        }), 400

    updates = {
        key: data[key]
        for key in (
            "status",
            "doctor_notes",
            "diagnosis",
            "tests_recommended",
            "follow_up_date",
            "next_appointment",
            "reason",
        )
        if key in data
    }

    if not updates:
        return jsonify({"error": "No appointment fields provided"}), 400

    connection = get_db_connection()

    try:
        doctor, err_response = verify_doctor_authorization(connection, doctor_id)
        if err_response:
            return err_response

        appointment = connection.execute(
            """
            SELECT appointment_id
            FROM APPOINTMENT
            WHERE appointment_id = ? AND doctor_id = ?
            """,
            (appointment_id, doctor_id)
        ).fetchone()

        if not appointment:
            return jsonify({
                "error": "Appointment not found for this doctor"
            }), 404

        connection.execute(
            f"""
            UPDATE APPOINTMENT
            SET {", ".join(f"{key} = ?" for key in updates)}
            WHERE appointment_id = ? AND doctor_id = ?
            """,
            [*updates.values(), appointment_id, doctor_id]
        )
        connection.commit()

        updated = connection.execute(
            """
            SELECT
                a.appointment_id,
                a.patient_id,
                a.doctor_id,
                a.appointment_type,
                a.appointment_date,
                a.appointment_time,
                a.status,
                a.reason,
                a.doctor_notes,
                a.diagnosis,
                a.tests_recommended,
                a.follow_up_date,
                a.next_appointment,
                p.name AS patient_name
            FROM APPOINTMENT a
            JOIN PATIENT p ON a.patient_id = p.patient_id
            WHERE a.appointment_id = ?
            """,
            (appointment_id,)
        ).fetchone()

        return jsonify({
            "message": "Appointment updated successfully",
            "appointment": dict(updated)
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------
# DOCTOR'S CONNECTED PATIENTS
# --------------------------------
@doctor_bp.route("/<int:doctor_id>/patients", methods=["GET"])
def get_doctor_patients(doctor_id):
    connection = get_db_connection()

    try:
        doctor, err_response = verify_doctor_authorization(connection, doctor_id)
        if err_response:
            return err_response

        patients = connection.execute(
            """
            SELECT
                p.patient_id,
                p.name AS patient_name,
                p.age,
                p.gender,
                p.phone,
                p.address,
                p.relationship_type,
                MAX(a.appointment_date) AS last_appointment_date,
                COUNT(a.appointment_id) AS total_appointments
            FROM PATIENT p
            JOIN APPOINTMENT a ON p.patient_id = a.patient_id
            WHERE a.doctor_id = ?
              AND a.status <> 'Cancelled'
            GROUP BY p.patient_id
            ORDER BY last_appointment_date DESC
            """,
            (doctor_id,)
        ).fetchall()

        return jsonify({
            "patients": [dict(p) for p in patients]
        }), 200

    finally:
        connection.close()


# --------------------------------
# DOCTOR'S CONNECTED PATIENT DETAIL
# --------------------------------
@doctor_bp.route("/<int:doctor_id>/patients/<int:patient_id>", methods=["GET"])
def get_doctor_patient_detail(doctor_id, patient_id):
    connection = get_db_connection()

    try:
        doctor, err_response = verify_doctor_authorization(connection, doctor_id)
        if err_response:
            return err_response

        # Check if patient exists first
        patient = connection.execute(
            """
            SELECT
                patient_id,
                name AS patient_name,
                age,
                gender,
                phone,
                address,
                relationship_type
            FROM PATIENT
            WHERE patient_id = ?
            """,
            (patient_id,)
        ).fetchone()

        if not patient:
            return jsonify({
                "error": "Patient not found"
            }), 404

        # Verify doctor is connected to this patient through at least one active/completed appointment
        is_connected = connection.execute(
            """
            SELECT 1
            FROM APPOINTMENT
            WHERE doctor_id = ?
              AND patient_id = ?
              AND status <> 'Cancelled'
            LIMIT 1
            """,
            (doctor_id, patient_id)
        ).fetchone()

        if not is_connected:
            return jsonify({
                "error": "Access denied. Patient is not associated with this doctor."
            }), 403

        # Active pregnancy info if any
        pregnancy = connection.execute(
            """
            SELECT
                pregnancy_id,
                last_menstrual_date,
                due_date,
                pregnancy_status,
                notes
            FROM PREGNANCY
            WHERE patient_id = ? AND pregnancy_status = 'Active'
            """,
            (patient_id,)
        ).fetchone()

        # Doctor's appointment history with this patient
        appointments = connection.execute(
            """
            SELECT
                appointment_id,
                appointment_type,
                appointment_date,
                appointment_time,
                status,
                reason,
                doctor_notes,
                diagnosis,
                tests_recommended,
                follow_up_date,
                next_appointment
            FROM APPOINTMENT
            WHERE doctor_id = ? AND patient_id = ?
            ORDER BY appointment_date DESC, appointment_time DESC
            """,
            (doctor_id, patient_id)
        ).fetchall()

        # Health logs
        health_logs = connection.execute(
            """
            SELECT
                healthlog_id,
                sleep_hours,
                hydration,
                weight,
                nutrition_notes,
                symptoms,
                log_date
            FROM HEALTHLOG
            WHERE patient_id = ?
            ORDER BY log_date DESC
            LIMIT 10
            """,
            (patient_id,)
        ).fetchall()

        # Medications prescribed by this doctor or active
        medications = connection.execute(
            """
            SELECT
                medication_id,
                medication_name,
                dosage,
                frequency,
                instructions,
                reason,
                start_date,
                end_date,
                status
            FROM MEDICATION
            WHERE patient_id = ? AND prescribed_by = ?
            ORDER BY medication_id DESC
            """,
            (patient_id, doctor_id)
        ).fetchall()

        # Reports for this patient
        reports = connection.execute(
            """
            SELECT
                report_id,
                report_title,
                report_type,
                report_date,
                file_path,
                notes,
                uploaded_at
            FROM REPORT
            WHERE patient_id = ?
            ORDER BY report_date DESC
            """,
            (patient_id,)
        ).fetchall()

        return jsonify({
            "patient": dict(patient),
            "pregnancy": dict(pregnancy) if pregnancy else None,
            "appointments": [dict(a) for a in appointments],
            "health_logs": [dict(h) for h in health_logs],
            "medications": [dict(m) for m in medications],
            "reports": [dict(r) for r in reports]
        }), 200

    finally:
        connection.close()


# =========================================================
# DOCTOR SCHEDULE & DATE-SPECIFIC AVAILABILITY ENDPOINTS
# =========================================================

DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def parse_time_to_minutes(t_str: str) -> int:
    """Parses 'HH:MM', 'HH:MM:SS', or 'HH:MM AM/PM' to minutes from midnight."""
    if not t_str:
        return 0
    t_str = t_str.strip().upper()
    is_pm = "PM" in t_str
    is_am = "AM" in t_str
    clean_t = t_str.replace("AM", "").replace("PM", "").strip()
    # Handle ranges like '10:00 - 11:00' -> pick start
    if "-" in clean_t:
        clean_t = clean_t.split("-")[0].strip()
    parts = [int(p) for p in clean_t.split(":") if p.isdigit()]
    if not parts:
        return 0
    hours = parts[0]
    minutes = parts[1] if len(parts) > 1 else 0
    if is_pm and hours < 12:
        hours += 12
    elif is_am and hours == 12:
        hours = 0
    return hours * 60 + minutes


def minutes_to_12h(mins: int) -> str:
    """Converts minutes from midnight to formatted 'HH:MM AM/PM'."""
    hours = (mins // 60) % 24
    minutes = mins % 60
    period = "AM" if hours < 12 else "PM"
    display_hour = hours % 12
    if display_hour == 0:
        display_hour = 12
    return f"{display_hour:02d}:{minutes:02d} {period}"


def normalize_time_key(t_str: str) -> str:
    """Normalizes any time string for matching."""
    if not t_str:
        return ""
    return " ".join(str(t_str).strip().upper().split())


def normalize_date_str(value) -> str:
    if not value:
        return ""
    return str(value).strip()[:10]


def parse_slot_list(raw_slots):
    import json

    if not raw_slots:
        return []
    slots = raw_slots
    if isinstance(raw_slots, str):
        try:
            slots = json.loads(raw_slots)
        except (TypeError, ValueError, json.JSONDecodeError):
            slots = [part.strip() for part in raw_slots.split(",")]
    if not isinstance(slots, list):
        return []
    unique_slots = []
    seen = set()
    for slot in slots:
        text = str(slot).strip()
        key = normalize_time_key(text)
        if text and key and key not in seen:
            seen.add(key)
            unique_slots.append(text)
    return unique_slots




@doctor_bp.route("/<int:doctor_id>/schedule", methods=["GET"])
def get_doctor_schedule(doctor_id):
    connection = get_db_connection()
    try:
        doctor = connection.execute(
            "SELECT doctor_id, name, specialization, practice_at, consultation_fee, status FROM DOCTOR WHERE doctor_id = ?",
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({"error": "Doctor not found"}), 404

        today_str = date.today().isoformat()

        # Query all scheduled dates from DOCTOR_AVAILABLE_DATE
        rows = connection.execute(
            """
            SELECT id, doctor_id, available_date, time_slots
            FROM DOCTOR_AVAILABLE_DATE
            WHERE doctor_id = ? AND available_date >= ?
            ORDER BY available_date ASC
            """,
            (doctor_id, today_str)
        ).fetchall()

        date_schedules = []
        available_dates = []
        for r in rows:
            slots = parse_slot_list(r["time_slots"])
            if not slots:
                continue
            available_date = normalize_date_str(r["available_date"])
            date_schedules.append({
                "id": r["id"],
                "available_date": available_date,
                "time_slots": slots
            })
            available_dates.append(available_date)

        return jsonify({
            "doctor": dict(doctor),
            "date_schedules": date_schedules,
            "available_dates": available_dates
        }), 200

    finally:
        connection.close()


@doctor_bp.route("/<int:doctor_id>/schedule", methods=["PUT"])
def update_doctor_schedule(doctor_id):
    import json
    data = request.get_json() or {}
    date_schedules = data.get("date_schedules")
    if date_schedules is None:
        date_schedules = data.get("schedules", [])

    if not isinstance(date_schedules, list):
        date_schedules = []

    connection = get_db_connection()
    try:
        doctor = connection.execute(
            "SELECT doctor_id FROM DOCTOR WHERE doctor_id = ?",
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({"error": "Doctor not found"}), 404

        # Clear existing date schedules for this doctor (today and future dates)
        today_str = date.today().isoformat()
        connection.execute(
            "DELETE FROM DOCTOR_AVAILABLE_DATE WHERE doctor_id = ? AND available_date >= ?",
            (doctor_id, today_str)
        )

        for item in date_schedules:
            if not isinstance(item, dict):
                continue
            avail_date = normalize_date_str(item.get("available_date", ""))
            slots = parse_slot_list(item.get("time_slots", []))
            if not avail_date or not slots:
                continue

            try:
                parsed_date = date.fromisoformat(avail_date)
            except ValueError:
                return jsonify({"error": f"Invalid schedule date: {avail_date}"}), 400
            if parsed_date < date.today():
                return jsonify({"error": "Schedule dates cannot be in the past"}), 400

            slots_json = json.dumps(slots)
            connection.execute(
                """
                INSERT INTO DOCTOR_AVAILABLE_DATE (doctor_id, available_date, time_slots)
                VALUES (?, ?, ?)
                ON CONFLICT(doctor_id, available_date) DO UPDATE SET
                    time_slots = excluded.time_slots
                """,
                (doctor_id, avail_date, slots_json)
            )

        connection.commit()
        return jsonify({"message": "Doctor schedule saved successfully"}), 200

    except Exception as err:
        connection.rollback()
        return jsonify({"error": str(err)}), 500
    finally:
        connection.close()


@doctor_bp.route("/<int:doctor_id>/available-slots", methods=["GET"])
def get_available_slots(doctor_id):
    date_str = request.args.get("date")  # format: YYYY-MM-DD
    connection = get_db_connection()

    try:
        doctor = connection.execute(
            "SELECT doctor_id, name, specialization, practice_at, consultation_fee, status FROM DOCTOR WHERE doctor_id = ?",
            (doctor_id,)
        ).fetchone()

        if not doctor:
            return jsonify({"error": "Doctor not found"}), 404

        today_str = date.today().isoformat()

        requested_date_str = normalize_date_str(date_str)
        if requested_date_str:
            try:
                requested_date = date.fromisoformat(requested_date_str)
            except ValueError:
                return jsonify({"error": "Invalid date. Use YYYY-MM-DD."}), 400
            if requested_date < date.today():
                return jsonify({
                    "doctor": dict(doctor),
                    "date": requested_date_str,
                    "is_working_day": False,
                    "available_dates": [],
                    "slots": [],
                    "message": "Appointment dates cannot be in the past."
                }), 200

        # Get all upcoming available dates for this doctor
        all_date_rows = connection.execute(
            """
            SELECT available_date, time_slots
            FROM DOCTOR_AVAILABLE_DATE
            WHERE doctor_id = ? AND available_date >= ?
            ORDER BY available_date ASC
            """,
            (doctor_id, today_str)
        ).fetchall()

        available_dates = [normalize_date_str(r["available_date"]) for r in all_date_rows]

        if not requested_date_str:
            return jsonify({
                "doctor": dict(doctor),
                "available_dates": available_dates,
                "slots": []
            }), 200

        matched_row = next(
            (
                r for r in all_date_rows
                if normalize_date_str(r["available_date"]) == requested_date_str
            ),
            None,
        )

        if not matched_row:
            return jsonify({
                "doctor": dict(doctor),
                "date": requested_date_str,
                "is_working_day": False,
                "available_dates": available_dates,
                "slots": [],
                "message": f"Dr. {doctor['name']} has no scheduled appointments on {requested_date_str}."
            }), 200

        raw_slots = parse_slot_list(matched_row["time_slots"])

        # Query booked appointments for this doctor on this date
        booked_rows = connection.execute(
            """
            SELECT appointment_time
            FROM APPOINTMENT
            WHERE doctor_id = ? AND appointment_date = ? AND status <> 'Cancelled'
            """,
            (doctor_id, requested_date_str)
        ).fetchall()

        booked_times = {
            normalize_time_key(r["appointment_time"])
            for r in booked_rows
            if r["appointment_time"]
        }

        slots_list = []
        for slot in raw_slots:
            slot_str = str(slot).strip()
            is_booked = normalize_time_key(slot_str) in booked_times
            slots_list.append({
                "time": slot_str,
                "is_available": not is_booked,
                "reason": "Booked" if is_booked else None
            })

        return jsonify({
            "doctor": dict(doctor),
            "date": requested_date_str,
            "is_working_day": True,
            "available_dates": available_dates,
            "slots": slots_list
        }), 200

    finally:
        connection.close()


