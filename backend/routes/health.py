from flask import Blueprint, request, jsonify
from datetime import datetime
from database.db import get_db_connection

health_bp = Blueprint("health", __name__, url_prefix="/api/health")


@health_bp.route("/logs", methods=["GET"])
def get_health_logs():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    connection = get_db_connection()
    try:
        logs = connection.execute(
            """
            SELECT * FROM health_logs
            WHERE clerk_user_id = ?
            ORDER BY log_date DESC, created_at DESC
            """,
            (user_id,)
        ).fetchall()

        logs_list = []
        for row in logs:
            logs_list.append({
                "id": str(row["id"]),
                "userId": row["clerk_user_id"],
                "weight": row["weight"],
                "bloodPressure": row["blood_pressure"],
                "heartRate": row["heart_rate"],
                "symptoms": row["symptoms"],
                "notes": row["notes"],
                "date": row["log_date"],
                "createdAt": row["created_at"]
            })

        return jsonify({"logs": logs_list}), 200

    finally:
        connection.close()


@health_bp.route("/logs", methods=["POST"])
def add_health_log():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request JSON body is required"}), 400

    user_id = data.get("userId") or data.get("clerkUserId")
    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    weight = data.get("weight")
    blood_pressure = data.get("bloodPressure")
    heart_rate = data.get("heartRate")
    symptoms = data.get("symptoms", "")
    notes = data.get("notes", "")
    log_date = data.get("date") or datetime.now().strftime("%Y-%m-%d")

    connection = get_db_connection()
    try:
        # Insert log
        cursor = connection.execute(
            """
            INSERT INTO health_logs (clerk_user_id, weight, blood_pressure, heart_rate, symptoms, notes, log_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, weight, blood_pressure, heart_rate, symptoms, notes, log_date)
        )

        # Update current user record with latest vitals if supplied
        update_fields = []
        params = []
        if weight:
            update_fields.append("weight = ?")
            params.append(weight)
        if blood_pressure:
            update_fields.append("blood_pressure = ?")
            params.append(blood_pressure)
        if heart_rate:
            update_fields.append("heart_rate = ?")
            params.append(heart_rate)

        if update_fields:
            params.append(user_id)
            connection.execute(
                f"""
                UPDATE users
                SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                WHERE clerk_user_id = ?
                """,
                tuple(params)
            )

        connection.commit()

        return jsonify({
            "message": "Health log saved successfully",
            "log": {
                "id": str(cursor.lastrowid),
                "userId": user_id,
                "weight": weight,
                "bloodPressure": blood_pressure,
                "heartRate": heart_rate,
                "symptoms": symptoms,
                "notes": notes,
                "date": log_date
            }
        }), 201

    finally:
        connection.close()
