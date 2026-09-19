import re
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

from database.db import get_db_connection


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


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
# ADMIN REGISTRATION
# --------------------------------
@admin_bp.route("/register", methods=["POST"])
def register_admin():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "error": "Name, email, and password are required"
        }), 400

    is_valid_pw, pw_error = validate_password_complexity(password)
    if not is_valid_pw:
        return jsonify({
            "error": pw_error
        }), 400

    connection = get_db_connection()

    try:
        existing_admin = connection.execute(
            """
            SELECT admin_id
            FROM ADMIN
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if existing_admin:
            return jsonify({
                "error": "Admin email is already registered"
            }), 409

        password_hash = generate_password_hash(password)

        cursor = connection.execute(
            """
            INSERT INTO ADMIN (name, email, password)
            VALUES (?, ?, ?)
            """,
            (name, email, password_hash)
        )

        admin_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Admin registered successfully",
            "admin": {
                "admin_id": admin_id,
                "name": name,
                "email": email
            }
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------
# ADMIN LOGIN
# --------------------------------
@admin_bp.route("/login", methods=["POST"])
def login_admin():
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
        admin = connection.execute(
            """
            SELECT admin_id, name, email, password
            FROM ADMIN
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if not admin:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        if not check_password_hash(admin["password"], password):
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        session.clear()
        session["role"] = "admin"
        session["admin_id"] = admin["admin_id"]

        return jsonify({
            "message": "Login successful",
            "admin": {
                "admin_id": admin["admin_id"],
                "name": admin["name"],
                "email": admin["email"]
            }
        }), 200

    finally:
        connection.close()


@admin_bp.route("/logout", methods=["POST"])
def logout_admin():
    session.clear()
    return jsonify({"message": "Logged out"}), 200


# --------------------------------
# ADMIN DASHBOARD STATS (MONITOR SYSTEM)
# --------------------------------
@admin_bp.route("/stats", methods=["GET"])
def get_admin_stats():
    connection = get_db_connection()

    try:
        total_users = connection.execute(
            "SELECT COUNT(*) AS total FROM USER"
        ).fetchone()["total"]

        total_patients = connection.execute(
            "SELECT COUNT(*) AS total FROM PATIENT"
        ).fetchone()["total"]

        total_doctors = connection.execute(
            "SELECT COUNT(*) AS total FROM DOCTOR"
        ).fetchone()["total"]

        active_doctors = connection.execute(
            "SELECT COUNT(*) AS total FROM DOCTOR WHERE status = 'Active'"
        ).fetchone()["total"]

        inactive_doctors = connection.execute(
            "SELECT COUNT(*) AS total FROM DOCTOR WHERE status = 'Inactive'"
        ).fetchone()["total"]

        total_appointments = connection.execute(
            "SELECT COUNT(*) AS total FROM APPOINTMENT WHERE payment_status IN ('NOT_REQUIRED', 'PAID', 'REFUND_REQUESTED', 'REFUNDED')"
        ).fetchone()["total"]

        pending_appointments = connection.execute(
            "SELECT COUNT(*) AS total FROM APPOINTMENT WHERE status = 'Pending' AND payment_status IN ('NOT_REQUIRED', 'PAID')"
        ).fetchone()["total"]

        confirmed_appointments = connection.execute(
            "SELECT COUNT(*) AS total FROM APPOINTMENT WHERE status = 'Confirmed' AND payment_status IN ('NOT_REQUIRED', 'PAID')"
        ).fetchone()["total"]

        completed_appointments = connection.execute(
            "SELECT COUNT(*) AS total FROM APPOINTMENT WHERE status = 'Completed' AND payment_status IN ('NOT_REQUIRED', 'PAID')"
        ).fetchone()["total"]

        cancelled_appointments = connection.execute(
            "SELECT COUNT(*) AS total FROM APPOINTMENT WHERE status = 'Cancelled' AND payment_status IN ('NOT_REQUIRED', 'PAID', 'REFUND_REQUESTED', 'REFUNDED')"
        ).fetchone()["total"]

        # A booking reserves the doctor's time, so scheduled earnings include
        # every appointment that has not been cancelled. Completed appointments
        # are tracked separately for the workload goal shown in the dashboard.
        doctor_performance_rows = connection.execute(
            """
            SELECT
                d.doctor_id,
                d.name,
                d.specialization,
                d.consultation_fee,
                d.nmc_number,
                COUNT(a.appointment_id) AS scheduled_appointments,
                COALESCE(SUM(CASE WHEN a.status = 'Completed' THEN 1 ELSE 0 END), 0)
                    AS completed_appointments,
                ROUND(d.consultation_fee * COUNT(a.appointment_id), 2) AS earnings
            FROM DOCTOR d
            LEFT JOIN APPOINTMENT a
                ON a.doctor_id = d.doctor_id
               AND a.status <> 'Cancelled'
               AND a.payment_status IN ('NOT_REQUIRED', 'PAID')
            GROUP BY
                d.doctor_id,
                d.name,
                d.specialization,
                d.consultation_fee,
                d.nmc_number
            ORDER BY earnings DESC, d.name ASC
            """
        ).fetchall()

        total_scheduled = sum(row["scheduled_appointments"] for row in doctor_performance_rows)
        doctor_performance = []
        for row in doctor_performance_rows:
            item = dict(row)
            item["progress_goal"] = 10
            item["progress_percent"] = min(
                (item["completed_appointments"] / item["progress_goal"]) * 100,
                100,
            )
            item["performance_percentage"] = (
                round((item["scheduled_appointments"] / total_scheduled) * 100, 1)
                if total_scheduled > 0
                else 0.0
            )
            doctor_performance.append(item)

        return jsonify({
            "stats": {
                "total_users": total_users,
                "total_patients": total_patients,
                "total_doctors": total_doctors,
                "active_doctors": active_doctors,
                "inactive_doctors": inactive_doctors,
                "total_appointments": total_appointments,
                "pending_appointments": pending_appointments,
                "confirmed_appointments": confirmed_appointments,
                "completed_appointments": completed_appointments,
                "cancelled_appointments": cancelled_appointments
            },
            "doctor_performance": doctor_performance
        }), 200

    finally:
        connection.close()


# --------------------------------
# MANAGE USERS / PATIENT ACCOUNTS
# --------------------------------
@admin_bp.route("/users", methods=["GET"])
def get_all_users():
    connection = get_db_connection()

    try:
        users = connection.execute(
            """
            SELECT 
                u.user_id,
                u.name AS user_name,
                u.email,
                u.phone AS user_phone,
                u.age AS user_age,
                u.gender AS user_gender,
                p.patient_id,
                p.name AS patient_name,
                p.age AS patient_age,
                p.gender AS patient_gender,
                p.phone AS patient_phone,
                p.address AS patient_address,
                p.relationship_type
            FROM USER u
            LEFT JOIN PATIENT p ON u.user_id = p.user_id
            ORDER BY u.user_id DESC
            """
        ).fetchall()

        return jsonify({
            "users": [dict(row) for row in users]
        }), 200

    finally:
        connection.close()


# --------------------------------
# DELETE USER ACCOUNT
# --------------------------------
@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    connection = get_db_connection()

    try:
        user = connection.execute(
            "SELECT user_id FROM USER WHERE user_id = ?",
            (user_id,)
        ).fetchone()

        if not user:
            return jsonify({
                "error": "User not found"
            }), 404

        connection.execute(
            "DELETE FROM USER WHERE user_id = ?",
            (user_id,)
        )
        connection.commit()

        return jsonify({
            "message": "User account deleted successfully"
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


# --------------------------------
# ADMIN PROFILE
# --------------------------------
@admin_bp.route("/profile", methods=["GET"])
def get_admin_profile():
    admin_id = request.args.get("admin_id", type=int)

    if not admin_id:
        return jsonify({
            "error": "admin_id is required"
        }), 400

    connection = get_db_connection()

    try:
        admin = connection.execute(
            "SELECT admin_id, name, email FROM ADMIN WHERE admin_id = ?",
            (admin_id,)
        ).fetchone()

        if not admin:
            return jsonify({
                "error": "Admin not found"
            }), 404

        return jsonify({
            "admin": dict(admin)
        }), 200

    finally:
        connection.close()


# --------------------------------
# ADMIN CHANGE PASSWORD
# --------------------------------
@admin_bp.route("/change-password", methods=["POST"])
def change_admin_password():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    admin_id = data.get("admin_id")
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not admin_id or not current_password or not new_password:
        return jsonify({
            "error": "admin_id, current_password, and new_password are required"
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
        admin = connection.execute(
            "SELECT admin_id, password FROM ADMIN WHERE admin_id = ?",
            (admin_id,)
        ).fetchone()

        if not admin:
            return jsonify({
                "error": "Admin not found"
            }), 404

        if not check_password_hash(admin["password"], current_password):
            return jsonify({
                "error": "Current password is incorrect"
            }), 401

        new_password_hash = generate_password_hash(new_password)

        connection.execute(
            "UPDATE ADMIN SET password = ? WHERE admin_id = ?",
            (new_password_hash, admin_id)
        )
        connection.commit()

        return jsonify({
            "message": "Password changed successfully"
        }), 200

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()
