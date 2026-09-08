from datetime import datetime
from flask import Blueprint, request, jsonify

from database.db import get_db_connection


health_bp = Blueprint(
    "health",
    __name__,
    url_prefix="/api/health"
)


def get_patient_id(connection, user_id):
    patient = connection.execute(
        """
        SELECT patient_id
        FROM PATIENT
        WHERE user_id = ?
        """,
        (user_id,)
    ).fetchone()

    if not patient:
        return None

    return patient["patient_id"]


@health_bp.route("", methods=["GET"])
def get_health_logs():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    connection = get_db_connection()

    try:
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        logs = connection.execute(
            """
            SELECT
                healthlog_id,
                pregnancy_id,
                sleep_hours,
                hydration,
                weight,
                nutrition_notes,
                symptoms,
                log_date
            FROM HEALTHLOG
            WHERE patient_id = ?
            ORDER BY log_date DESC
            """,
            (patient_id,)
        ).fetchall()

        return jsonify({
            "health_logs": [
                {
                    "healthlog_id": log["healthlog_id"],
                    "pregnancy_id": log["pregnancy_id"],
                    "sleep_hours": log["sleep_hours"],
                    "hydration": log["hydration"],
                    "weight": log["weight"],
                    "nutrition_notes": log["nutrition_notes"],
                    "symptoms": log["symptoms"],
                    "log_date": log["log_date"]
                }
                for log in logs
            ]
        }), 200

    finally:
        connection.close()


@health_bp.route("", methods=["POST"])
def create_health_log():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    user_id = data.get("user_id")

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    connection = get_db_connection()

    try:
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        pregnancy = connection.execute(
            """
            SELECT pregnancy_id
            FROM PREGNANCY
            WHERE patient_id = ?
            AND pregnancy_status = 'Active'
            """,
            (patient_id,)
        ).fetchone()

        if not pregnancy:
            return jsonify({
                "error": "No active pregnancy found"
            }), 400

        pregnancy_id = pregnancy["pregnancy_id"]

        log_date = data.get("log_date")

        if not log_date:
            log_date = datetime.now().isoformat(timespec="seconds")

        cursor = connection.execute(
            """
            INSERT INTO HEALTHLOG (
                patient_id,
                pregnancy_id,
                sleep_hours,
                hydration,
                weight,
                nutrition_notes,
                symptoms,
                log_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                pregnancy_id,
                data.get("sleep_hours"),
                data.get("hydration"),
                data.get("weight"),
                data.get("nutrition_notes"),
                data.get("symptoms"),
                log_date
            )
        )

        connection.commit()

        return jsonify({
            "message": "Health log created successfully",
            "healthlog_id": cursor.lastrowid
        }), 201

    finally:
        connection.close()
