from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta

from database.db import get_db_connection


pregnancy_bp = Blueprint(
    "pregnancy",
    __name__,
    url_prefix="/api/pregnancy"
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


def calculate_pregnancy_data(last_menstrual_date):
    today = date.today()

    elapsed_days = (today - last_menstrual_date).days

    # Pregnancy is based on 280 days.
    progress_days = max(0, min(elapsed_days, 280))

    progress_percentage = round(
        (progress_days / 280) * 100,
        1
    )

    # Week calculation.
    pregnancy_week = max(0, elapsed_days // 7)

    # Keep displayed pregnancy week within the normal
    # 40-week pregnancy period.
    pregnancy_week = min(pregnancy_week, 40)

    # Trimester calculation.
    if pregnancy_week <= 13:
        trimester = "First Trimester"
    elif pregnancy_week <= 27:
        trimester = "Second Trimester"
    else:
        trimester = "Third Trimester"

    due_date = last_menstrual_date + timedelta(days=280)

    return {
        "due_date": due_date.isoformat(),
        "pregnancy_week": pregnancy_week,
        "trimester": trimester,
        "progress_percentage": progress_percentage
    }


@pregnancy_bp.route("", methods=["GET"])
def get_pregnancy():
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

        pregnancy = connection.execute(
            """
            SELECT
                pregnancy_id,
                patient_id,
                last_menstrual_date,
                due_date,
                pregnancy_status,
                notes
            FROM PREGNANCY
            WHERE patient_id = ?
            """,
            (patient_id,)
        ).fetchone()

        if not pregnancy:
            return jsonify({
                "pregnancy": None
            }), 200

        lmp = date.fromisoformat(
            pregnancy["last_menstrual_date"]
        )

        calculated = calculate_pregnancy_data(lmp)

        return jsonify({
            "pregnancy": {
                "pregnancy_id": pregnancy["pregnancy_id"],
                "patient_id": pregnancy["patient_id"],
                "last_menstrual_date": pregnancy["last_menstrual_date"],
                "due_date": calculated["due_date"],
                "pregnancy_status": pregnancy["pregnancy_status"],
                "notes": pregnancy["notes"],
                "pregnancy_week": calculated["pregnancy_week"],
                "trimester": calculated["trimester"],
                "progress_percentage": calculated["progress_percentage"]
            }
        }), 200

    finally:
        connection.close()


@pregnancy_bp.route("", methods=["POST"])
def create_pregnancy():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    user_id = data.get("user_id")
    lmp_value = data.get("last_menstrual_date")
    notes = data.get("notes")

    if not user_id or not lmp_value:
        return jsonify({
            "error": "user_id and last_menstrual_date are required"
        }), 400

    try:
        lmp = date.fromisoformat(lmp_value)
    except ValueError:
        return jsonify({
            "error": "Invalid last_menstrual_date"
        }), 400

    connection = get_db_connection()

    try:
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        existing = connection.execute(
            """
            SELECT pregnancy_id
            FROM PREGNANCY
            WHERE patient_id = ?
            """,
            (patient_id,)
        ).fetchone()

        if existing:
            return jsonify({
                "error": "Pregnancy record already exists"
            }), 409

        calculated = calculate_pregnancy_data(lmp)

        cursor = connection.execute(
            """
            INSERT INTO PREGNANCY (
                patient_id,
                last_menstrual_date,
                due_date,
                pregnancy_status,
                notes
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                lmp.isoformat(),
                calculated["due_date"],
                "Active",
                notes
            )
        )

        connection.commit()

        return jsonify({
            "message": "Pregnancy created successfully",
            "pregnancy_id": cursor.lastrowid
        }), 201

    finally:
        connection.close()