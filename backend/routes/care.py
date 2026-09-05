from datetime import date
from flask import Blueprint, jsonify, request

from database.db import get_db_connection


care_bp = Blueprint("care", __name__, url_prefix="/api")


def patient_id_for(connection, user_id):
    row = connection.execute("SELECT patient_id FROM PATIENT WHERE user_id = ?", (user_id,)).fetchone()
    return row["patient_id"] if row else None


def request_patient_id(connection, source):
    user_id = source.get("user_id", type=int) if hasattr(source, "get") else None
    if not user_id:
        return None
    return patient_id_for(connection, user_id)


def rows_as_dicts(rows):
    return [dict(row) for row in rows]


@care_bp.route("/appointments", methods=["GET"])
def list_appointments():
    connection = get_db_connection()
    try:
        patient_id = request_patient_id(connection, request.args)
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400
        records = connection.execute(
            "SELECT * FROM PREGNANCY_APPOINTMENT WHERE patient_id = ? ORDER BY appointment_date, appointment_time",
            (patient_id,),
        ).fetchall()
        return jsonify({"appointments": rows_as_dicts(records)})
    finally:
        connection.close()


@care_bp.route("/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json() or {}
    required = ("user_id", "appointment_date", "appointment_type")
    if any(not data.get(field) for field in required):
        return jsonify({"error": "user_id, appointment date, and appointment type are required"}), 400
    try:
        appointment_date = date.fromisoformat(data["appointment_date"])
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid appointment date"}), 400
    if appointment_date < date.today():
        return jsonify({"error": "Appointment date cannot be in the past"}), 400
    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, data["user_id"])
        if not patient_id:
            return jsonify({"error": "Patient record not found"}), 404
        fields = (
            "appointment_date",
            "appointment_time",
            "doctor_name",
            "clinic_name",
            "appointment_type",
            "reason",
            "questions",
            "status",
            "follow_up_date",
            "reminder_enabled",
            "doctor_notes",
            "diagnosis",
            "tests_recommended",
            "next_appointment",
        )
        values = [data.get(field) for field in fields]
        cursor = connection.execute(
            f"INSERT INTO PREGNANCY_APPOINTMENT (patient_id, {', '.join(fields)}) VALUES ({', '.join(['?'] * (len(fields) + 1))})",
            [patient_id, *values],
        )
        connection.commit()
        return jsonify({"message": "Appointment saved", "appointment_id": cursor.lastrowid}), 201
    finally:
        connection.close()


@care_bp.route("/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment(appointment_id):
    data = request.get_json() or {}
    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, data.get("user_id"))
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400
        allowed = (
            "appointment_date",
            "appointment_time",
            "doctor_name",
            "clinic_name",
            "appointment_type",
            "reason",
            "questions",
            "status",
            "follow_up_date",
            "reminder_enabled",
            "doctor_notes",
            "diagnosis",
            "tests_recommended",
            "next_appointment",
        )
        updates = {key: data[key] for key in allowed if key in data}
        if "appointment_date" in updates:
            try:
                if date.fromisoformat(updates["appointment_date"]) < date.today():
                    return jsonify({"error": "Appointment date cannot be in the past"}), 400
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid appointment date"}), 400
        if not updates:
            return jsonify({"error": "No appointment fields provided"}), 400
        cursor = connection.execute(
            f"UPDATE PREGNANCY_APPOINTMENT SET {', '.join(f'{key} = ?' for key in updates)} WHERE appointment_id = ? AND patient_id = ?",
            [*updates.values(), appointment_id, patient_id],
        )
        connection.commit()
        if not cursor.rowcount:
            return jsonify({"error": "Appointment not found"}), 404
        return jsonify({"message": "Appointment updated"})
    finally:
        connection.close()


@care_bp.route("/appointments/<int:appointment_id>", methods=["DELETE"])
def delete_appointment(appointment_id):
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or request.args.get("user_id", type=int)
    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, user_id)
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400
        cursor = connection.execute(
            "DELETE FROM PREGNANCY_APPOINTMENT WHERE appointment_id = ? AND patient_id = ?",
            (appointment_id, patient_id),
        )
        connection.commit()
        if not cursor.rowcount:
            return jsonify({"error": "Appointment not found"}), 404
        return jsonify({"message": "Appointment deleted"})
    finally:
        connection.close()
