from flask import Blueprint, request, jsonify
from database.db import get_db_connection

appointments_bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")


@appointments_bp.route("", methods=["GET"])
def get_appointments():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    connection = get_db_connection()
    try:
        appointments = connection.execute(
            """
            SELECT * FROM appointments
            WHERE clerk_user_id = ?
            ORDER BY appointment_date ASC, appointment_time ASC
            """,
            (user_id,)
        ).fetchall()

        app_list = []
        for row in appointments:
            app_list.append({
                "id": str(row["id"]),
                "userId": row["clerk_user_id"],
                "doctorName": row["doctor_name"],
                "appointmentType": row["appointment_type"],
                "appointmentDate": row["appointment_date"],
                "appointmentTime": row["appointment_time"],
                "status": row["status"],
                "notes": row["notes"]
            })

        return jsonify({"appointments": app_list}), 200

    finally:
        connection.close()


@appointments_bp.route("", methods=["POST"])
def add_appointment():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    user_id = data.get("userId") or data.get("clerkUserId")
    doctor_name = data.get("doctorName", "Dr. Sharma")
    appointment_type = data.get("appointmentType", "Regular ANC Checkup")
    appointment_date = data.get("appointmentDate")
    appointment_time = data.get("appointmentTime", "10:00 AM")
    notes = data.get("notes", "")

    if not user_id or not appointment_date:
        return jsonify({"error": "userId and appointmentDate are required"}), 400

    connection = get_db_connection()
    try:
        cursor = connection.execute(
            """
            INSERT INTO appointments (clerk_user_id, doctor_name, appointment_type, appointment_date, appointment_time, notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, doctor_name, appointment_type, appointment_date, appointment_time, notes)
        )
        connection.commit()

        return jsonify({
            "message": "Appointment created successfully",
            "appointment": {
                "id": str(cursor.lastrowid),
                "userId": user_id,
                "doctorName": doctor_name,
                "appointmentType": appointment_type,
                "appointmentDate": appointment_date,
                "appointmentTime": appointment_time,
                "status": "upcoming"
            }
        }), 201

    finally:
        connection.close()
