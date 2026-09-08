from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from database.db import get_db_connection

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


def calculate_due_date(lmp_str):
    if not lmp_str:
        return None
    try:
        lmp_date = datetime.strptime(lmp_str, "%Y-%m-%d")
        due_date = lmp_date + timedelta(days=280)
        return due_date.strftime("%Y-%m-%d")
    except Exception:
        return None


@profile_bp.route("", methods=["GET"])
def get_profile():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId query param is required"}), 400

    connection = get_db_connection()
    try:
        user = connection.execute(
            """
            SELECT * FROM users WHERE clerk_user_id = ?
            """,
            (user_id,)
        ).fetchone()

        pregnancy = connection.execute(
            """
            SELECT * FROM pregnancies WHERE clerk_user_id = ?
            ORDER BY created_at DESC LIMIT 1
            """,
            (user_id,)
        ).fetchone()

        latest_appointment = connection.execute(
            """
            SELECT * FROM appointments WHERE clerk_user_id = ?
            ORDER BY appointment_date ASC, appointment_time ASC LIMIT 1
            """,
            (user_id,)
        ).fetchone()

        if not user:
            return jsonify({
                "found": False,
                "profile": None
            }), 200

        profile_data = {
            "found": True,
            "profile": {
                "clerkUserId": user["clerk_user_id"],
                "name": user["name"],
                "email": user["email"],
                "bloodPressure": user["blood_pressure"] or "118/78",
                "height": str(user["height"]) if user["height"] else "165",
                "weight": str(user["weight"]) if user["weight"] else "62.5",
                "heartRate": str(user["heart_rate"]) if user["heart_rate"] else "76",
                "bloodGroup": user["blood_group"] or "O+",
                "pregnancyType": user["pregnancy_type"] or "Single",
                "doctorName": user["doctor_name"] or "Dr. Sharma",
                "isProfileComplete": bool(user["is_profile_complete"]),
                "lmpDate": pregnancy["lmp_date"] if pregnancy and pregnancy["lmp_date"] else "2026-02-09",
                "dueDate": pregnancy["due_date"] if pregnancy and pregnancy["due_date"] else None,
                "appointmentDate": latest_appointment["appointment_date"] if latest_appointment else "2026-08-25",
                "appointmentTime": latest_appointment["appointment_time"] if latest_appointment else "10:00 AM",
                "appointmentType": latest_appointment["appointment_type"] if latest_appointment else "Regular ANC Checkup",
            }
        }

        return jsonify(profile_data), 200

    finally:
        connection.close()


@profile_bp.route("", methods=["POST"])
def save_profile():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request JSON body is required"}), 400

    user_id = data.get("userId") or data.get("clerkUserId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    name = data.get("name", "")
    email = data.get("email", "")
    blood_pressure = data.get("bloodPressure", "")
    height = data.get("height")
    weight = data.get("weight")
    heart_rate = data.get("heartRate")
    blood_group = data.get("bloodGroup", "O+")
    pregnancy_type = data.get("pregnancyType", "Single")
    doctor_name = data.get("doctorName", "")
    lmp_date = data.get("lmpDate", "")
    due_date = calculate_due_date(lmp_date)
    appointment_date = data.get("appointmentDate")
    appointment_time = data.get("appointmentTime")
    appointment_type = data.get("appointmentType")

    connection = get_db_connection()
    try:
        # Upsert user record
        existing_user = connection.execute(
            "SELECT id FROM users WHERE clerk_user_id = ?",
            (user_id,)
        ).fetchone()

        if existing_user:
            connection.execute(
                """
                UPDATE users
                SET name = COALESCE(NULLIF(?, ''), name),
                    email = COALESCE(NULLIF(?, ''), email),
                    blood_pressure = ?,
                    height = ?,
                    weight = ?,
                    heart_rate = ?,
                    blood_group = ?,
                    pregnancy_type = ?,
                    doctor_name = ?,
                    is_profile_complete = 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE clerk_user_id = ?
                """,
                (name, email, blood_pressure, height, weight, heart_rate, blood_group, pregnancy_type, doctor_name, user_id)
            )
        else:
            connection.execute(
                """
                INSERT INTO users (clerk_user_id, name, email, blood_pressure, height, weight, heart_rate, blood_group, pregnancy_type, doctor_name, is_profile_complete)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                """,
                (user_id, name, email, blood_pressure, height, weight, heart_rate, blood_group, pregnancy_type, doctor_name)
            )

        # Upsert pregnancy record
        if lmp_date:
            existing_pregnancy = connection.execute(
                "SELECT id FROM pregnancies WHERE clerk_user_id = ?",
                (user_id,)
            ).fetchone()

            if existing_pregnancy:
                connection.execute(
                    """
                    UPDATE pregnancies
                    SET lmp_date = ?, due_date = ?, pregnancy_type = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE clerk_user_id = ?
                    """,
                    (lmp_date, due_date, pregnancy_type, user_id)
                )
            else:
                connection.execute(
                    """
                    INSERT INTO pregnancies (clerk_user_id, lmp_date, due_date, pregnancy_type)
                    VALUES (?, ?, ?, ?)
                    """,
                    (user_id, lmp_date, due_date, pregnancy_type)
                )

        # Upsert appointment if passed
        if appointment_date and appointment_time:
            existing_appointment = connection.execute(
                "SELECT id FROM appointments WHERE clerk_user_id = ?",
                (user_id,)
            ).fetchone()

            if existing_appointment:
                connection.execute(
                    """
                    UPDATE appointments
                    SET doctor_name = ?, appointment_type = ?, appointment_date = ?, appointment_time = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE clerk_user_id = ?
                    """,
                    (doctor_name or "Dr. Sharma", appointment_type or "Regular ANC Checkup", appointment_date, appointment_time, user_id)
                )
            else:
                connection.execute(
                    """
                    INSERT INTO appointments (clerk_user_id, doctor_name, appointment_type, appointment_date, appointment_time)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (user_id, doctor_name or "Dr. Sharma", appointment_type or "Regular ANC Checkup", appointment_date, appointment_time)
                )

        connection.commit()

        return jsonify({
            "message": "Profile saved successfully in database",
            "profile": {
                "clerkUserId": user_id,
                "name": name,
                "email": email,
                "bloodPressure": blood_pressure,
                "height": height,
                "weight": weight,
                "heartRate": heart_rate,
                "bloodGroup": blood_group,
                "pregnancyType": pregnancy_type,
                "doctorName": doctor_name,
                "lmpDate": lmp_date,
                "dueDate": due_date,
                "isProfileComplete": True
            }
        }), 200

    finally:
        connection.close()
