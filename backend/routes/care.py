from datetime import date, datetime
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from database.db import get_db_connection


care_bp = Blueprint("care", __name__, url_prefix="/api")
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"


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
        records = connection.execute("SELECT * FROM PREGNANCY_APPOINTMENT WHERE patient_id = ? ORDER BY appointment_date, appointment_time", (patient_id,)).fetchall()
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
        fields = ("appointment_date", "appointment_time", "doctor_name", "clinic_name", "appointment_type", "reason", "questions", "status", "follow_up_date", "reminder_enabled", "doctor_notes", "diagnosis", "tests_recommended", "next_appointment")
        values = [data.get(field) for field in fields]
        cursor = connection.execute(f"INSERT INTO PREGNANCY_APPOINTMENT (patient_id, {', '.join(fields)}) VALUES ({', '.join(['?'] * (len(fields) + 1))})", [patient_id, *values])
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
        allowed = ("appointment_date", "appointment_time", "doctor_name", "clinic_name", "appointment_type", "reason", "questions", "status", "follow_up_date", "reminder_enabled", "doctor_notes", "diagnosis", "tests_recommended", "next_appointment")
        updates = {key: data[key] for key in allowed if key in data}
        if "appointment_date" in updates:
            try:
                if date.fromisoformat(updates["appointment_date"]) < date.today():
                    return jsonify({"error": "Appointment date cannot be in the past"}), 400
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid appointment date"}), 400
        if not updates:
            return jsonify({"error": "No appointment fields provided"}), 400
        cursor = connection.execute(f"UPDATE PREGNANCY_APPOINTMENT SET {', '.join(f'{key} = ?' for key in updates)} WHERE appointment_id = ? AND patient_id = ?", [*updates.values(), appointment_id, patient_id])
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


@care_bp.route("/medicines", methods=["GET"])
def list_medicines():
    connection = get_db_connection()
    try:
        patient_id = request_patient_id(connection, request.args)
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400
        records = connection.execute("SELECT * FROM PREGNANCY_MEDICINE WHERE patient_id = ? ORDER BY take_time, medicine_name", (patient_id,)).fetchall()
        return jsonify({"medicines": rows_as_dicts(records)})
    finally:
        connection.close()


@care_bp.route("/medicines", methods=["POST"])
def create_medicine():
    data = request.get_json() or {}
    if not data.get("user_id") or not data.get("medicine_name"):
        return jsonify({"error": "user_id and medicine name are required"}), 400
    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, data["user_id"])
        if not patient_id:
            return jsonify({"error": "Patient record not found"}), 404
        fields = ("medicine_name", "purpose", "dosage", "frequency", "take_time", "start_date", "end_date", "prescribed_by", "instructions", "reminder_enabled", "status", "notes")
        cursor = connection.execute(f"INSERT INTO PREGNANCY_MEDICINE (patient_id, {', '.join(fields)}) VALUES ({', '.join(['?'] * (len(fields) + 1))})", [patient_id, *[data.get(field) for field in fields]])
        connection.commit()
        return jsonify({"message": "Medicine saved", "medicine_id": cursor.lastrowid}), 201
    finally:
        connection.close()


@care_bp.route("/medicines/<int:medicine_id>", methods=["PUT"])
def update_medicine(medicine_id):
    data = request.get_json() or {}
    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, data.get("user_id"))
        allowed = ("medicine_name", "purpose", "dosage", "frequency", "take_time", "start_date", "end_date", "prescribed_by", "instructions", "reminder_enabled", "status", "notes")
        updates = {key: data[key] for key in allowed if key in data}
        if not patient_id or not updates:
            return jsonify({"error": "A valid user_id and an update are required"}), 400
        cursor = connection.execute(f"UPDATE PREGNANCY_MEDICINE SET {', '.join(f'{key} = ?' for key in updates)} WHERE medicine_id = ? AND patient_id = ?", [*updates.values(), medicine_id, patient_id])
        connection.commit()
        if not cursor.rowcount:
            return jsonify({"error": "Medicine not found"}), 404
        return jsonify({"message": "Medicine updated"})
    finally:
        connection.close()


@care_bp.route("/reports", methods=["GET"])
def list_reports():
    connection = get_db_connection()
    try:
        patient_id = request_patient_id(connection, request.args)
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400
        records = connection.execute("SELECT * FROM PREGNANCY_REPORT WHERE patient_id = ? ORDER BY report_date DESC, uploaded_at DESC", (patient_id,)).fetchall()
        return jsonify({"reports": rows_as_dicts(records)})
    finally:
        connection.close()


@care_bp.route("/reports", methods=["POST"])
def create_report():
    data = request.form
    if not data.get("user_id") or not data.get("report_name") or not data.get("report_type"):
        return jsonify({"error": "user_id, report name, and report type are required"}), 400
    upload = request.files.get("file")
    filename = None
    stored_path = None
    if upload and upload.filename:
        UPLOAD_DIR.mkdir(exist_ok=True)
        filename = secure_filename(upload.filename)
        stored_name = f"{uuid4().hex}_{filename}"
        upload.save(UPLOAD_DIR / stored_name)
        stored_path = f"uploads/{stored_name}"
    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, int(data["user_id"]))
        if not patient_id:
            return jsonify({"error": "Patient record not found"}), 404
        fields = ("report_name", "report_type", "report_date", "hospital_lab", "doctor_name", "pregnancy_week", "description", "file_path", "original_filename", "notes", "appointment_id")
        values = [data.get(field) for field in fields]
        values[7], values[8] = stored_path, filename
        cursor = connection.execute(f"INSERT INTO PREGNANCY_REPORT (patient_id, {', '.join(fields)}) VALUES ({', '.join(['?'] * (len(fields) + 1))})", [patient_id, *values])
        connection.commit()
        return jsonify({"message": "Report saved", "report_id": cursor.lastrowid}), 201
    finally:
        connection.close()
