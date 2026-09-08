import json
import sqlite3
from datetime import date

from flask import Blueprint, jsonify, request

from database.db import get_db_connection


care_bp = Blueprint("care", __name__, url_prefix="/api")


def patient_id_for(connection, user_id):
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    row = connection.execute(
        "SELECT patient_id FROM PATIENT WHERE user_id = ?", (user_id,)
    ).fetchone()
    return row["patient_id"] if row else None


def request_patient_id(connection, source):
    user_id = source.get("user_id", type=int) if hasattr(source, "get") else None
    return patient_id_for(connection, user_id) if user_id else None


def parse_slots(raw_slots):
    if not raw_slots:
        return []
    try:
        slots = json.loads(raw_slots) if isinstance(raw_slots, str) else raw_slots
    except (TypeError, ValueError, json.JSONDecodeError):
        slots = str(raw_slots).split(",")
    if not isinstance(slots, list):
        return []
    return [str(slot).strip() for slot in slots if str(slot).strip()]


def normalized_slot(slot):
    return " ".join(str(slot or "").strip().upper().split())


def configured_slot_for(connection, doctor_id, appointment_date, requested_slot):
    row = connection.execute(
        """
        SELECT time_slots
        FROM DOCTOR_AVAILABLE_DATE
        WHERE doctor_id = ? AND available_date = ?
        """,
        (doctor_id, appointment_date),
    ).fetchone()
    if not row:
        return None
    requested_key = normalized_slot(requested_slot)
    return next(
        (
            slot
            for slot in parse_slots(row["time_slots"])
            if normalized_slot(slot) == requested_key
        ),
        None,
    )


def user_appointment_from_row(row):
    appointment = dict(row)
    central_status = appointment.pop("central_status", None)
    central_reason = appointment.pop("central_reason", None)
    central_doctor_notes = appointment.pop("central_doctor_notes", None)
    central_diagnosis = appointment.pop("central_diagnosis", None)
    central_tests = appointment.pop("central_tests_recommended", None)
    central_follow_up = appointment.pop("central_follow_up_date", None)
    central_next = appointment.pop("central_next_appointment", None)
    if central_status:
        # Pending is the internal doctor-workflow state; patients see it as
        # an upcoming appointment until the doctor confirms it.
        if central_status == "Pending":
            appointment["status"] = "Upcoming"
        elif central_status == "Confirmed":
            appointment["status"] = "Upcoming"
        else:
            appointment["status"] = central_status
        appointment["doctor_status"] = central_status
    if central_reason and not appointment.get("reason"):
        appointment["reason"] = central_reason
    if central_doctor_notes:
        appointment["doctor_notes"] = central_doctor_notes
    if central_diagnosis:
        appointment["diagnosis"] = central_diagnosis
    if central_tests:
        appointment["tests_recommended"] = central_tests
    if central_follow_up:
        appointment["follow_up_date"] = central_follow_up
    if central_next:
        appointment["next_appointment"] = central_next
    return appointment


@care_bp.route("/appointments", methods=["GET"])
def list_appointments():
    connection = get_db_connection()
    try:
        patient_id = request_patient_id(connection, request.args)
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400

        records = connection.execute(
            """
            SELECT
                pa.*,
                d.name AS linked_doctor_name,
                d.practice_at AS linked_clinic_name,
                d.specialization AS linked_specialization,
                d.consultation_fee AS linked_consultation_fee,
                d.phone AS linked_doctor_phone,
                a.status AS central_status,
                a.reason AS central_reason,
                a.doctor_notes AS central_doctor_notes,
                a.diagnosis AS central_diagnosis,
                a.tests_recommended AS central_tests_recommended,
                a.follow_up_date AS central_follow_up_date,
                a.next_appointment AS central_next_appointment
            FROM PREGNANCY_APPOINTMENT pa
            LEFT JOIN DOCTOR d ON d.doctor_id = pa.doctor_id
            LEFT JOIN APPOINTMENT a ON a.appointment_id = pa.central_appointment_id
            WHERE pa.patient_id = ?
            ORDER BY pa.appointment_date ASC, pa.appointment_time ASC, pa.appointment_id ASC
            """,
            (patient_id,),
        ).fetchall()

        appointments = []
        for record in records:
            item = user_appointment_from_row(record)
            if item.get("linked_doctor_name"):
                item["doctor_name"] = item["linked_doctor_name"]
            if item.get("linked_clinic_name"):
                item["clinic_name"] = item["linked_clinic_name"]
            item["specialization"] = item.pop("linked_specialization", None)
            item["consultation_fee"] = item.pop("linked_consultation_fee", None)
            item["doctor_phone"] = item.pop("linked_doctor_phone", None)
            item.pop("linked_doctor_name", None)
            item.pop("linked_clinic_name", None)
            appointments.append(item)
        return jsonify({"appointments": appointments}), 200
    finally:
        connection.close()


@care_bp.route("/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json() or {}
    required = ("user_id", "appointment_date", "appointment_type")
    if any(not data.get(field) for field in required):
        return jsonify({"error": "user_id, appointment date, and appointment type are required"}), 400

    try:
        appointment_date = date.fromisoformat(str(data["appointment_date"]))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid appointment date"}), 400
    if appointment_date < date.today():
        return jsonify({"error": "Appointment date cannot be in the past"}), 400

    try:
        user_id = int(data["user_id"])
    except (TypeError, ValueError):
        return jsonify({"error": "A valid numeric user_id is required"}), 400

    doctor_id = data.get("doctor_id")
    if doctor_id not in (None, ""):
        try:
            doctor_id = int(doctor_id)
        except (TypeError, ValueError):
            return jsonify({"error": "A valid doctor_id is required"}), 400
    else:
        doctor_id = None

    appointment_type = str(data.get("appointment_type") or "").strip()
    appointment_time = str(data.get("appointment_time") or "").strip()
    if doctor_id and not appointment_time:
        return jsonify({"error": "Please select an available time slot"}), 400

    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, user_id)
        if not patient_id:
            return jsonify({"error": "Patient record not found. Please complete profile/patient setup first."}), 404

        doctor = None
        central_appointment_id = None
        if doctor_id:
            doctor = connection.execute(
                """
                SELECT doctor_id, name, practice_at
                FROM DOCTOR
                WHERE doctor_id = ? AND status = 'Active'
                """,
                (doctor_id,),
            ).fetchone()
            if not doctor:
                return jsonify({"error": "The selected doctor is not available"}), 400

            configured_slot = configured_slot_for(
                connection, doctor_id, appointment_date.isoformat(), appointment_time
            )
            if not configured_slot:
                return jsonify({"error": "That date or time slot is no longer available. Please choose an open slot."}), 409
            appointment_time = configured_slot

            existing_booking = connection.execute(
                """
                SELECT appointment_id
                FROM APPOINTMENT
                WHERE doctor_id = ?
                  AND appointment_date = ?
                  AND appointment_time = ?
                  AND status <> 'Cancelled'
                """,
                (doctor_id, appointment_date.isoformat(), appointment_time),
            ).fetchone()
            if existing_booking:
                return jsonify({"error": f"The slot {appointment_time} on {appointment_date} is already booked. Please choose another slot."}), 409

            central_cursor = connection.execute(
                """
                INSERT INTO APPOINTMENT (
                    patient_id, doctor_id, booked_by, appointment_type,
                    appointment_date, appointment_time, status, reason
                ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
                """,
                (
                    patient_id,
                    doctor_id,
                    user_id,
                    appointment_type,
                    appointment_date.isoformat(),
                    appointment_time,
                    data.get("reason") or "",
                ),
            )
            central_appointment_id = central_cursor.lastrowid

        reminder_enabled = 1 if data.get("reminder_enabled") in (1, True, "1") else 0
        fields = (
            "doctor_id",
            "central_appointment_id",
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
        values = [
            doctor_id,
            central_appointment_id,
            appointment_date.isoformat(),
            appointment_time or None,
            doctor["name"] if doctor else data.get("doctor_name"),
            doctor["practice_at"] if doctor else data.get("clinic_name"),
            appointment_type,
            data.get("reason"),
            data.get("questions"),
            "Upcoming",
            data.get("follow_up_date"),
            reminder_enabled,
            data.get("doctor_notes"),
            data.get("diagnosis"),
            data.get("tests_recommended"),
            data.get("next_appointment"),
        ]
        cursor = connection.execute(
            f"INSERT INTO PREGNANCY_APPOINTMENT (patient_id, {', '.join(fields)}) "
            f"VALUES ({', '.join(['?'] * (len(fields) + 1))})",
            [patient_id, *values],
        )
        pregnancy_appointment_id = cursor.lastrowid
        connection.commit()
        return jsonify(
            {
                "message": "Appointment booked successfully",
                "appointment_id": pregnancy_appointment_id,
                "appointment": {
                    "appointment_id": pregnancy_appointment_id,
                    "doctor_id": doctor_id,
                    "doctor_name": doctor["name"] if doctor else data.get("doctor_name"),
                    "clinic_name": doctor["practice_at"] if doctor else data.get("clinic_name"),
                    "appointment_date": appointment_date.isoformat(),
                    "appointment_time": appointment_time or None,
                    "appointment_type": appointment_type,
                    "reason": data.get("reason"),
                    "status": "Upcoming",
                    "reminder_enabled": reminder_enabled,
                },
            }
        ), 201
    except sqlite3.IntegrityError as err:
        connection.rollback()
        if "APPOINTMENT" in str(err).upper() or "UNIQUE" in str(err).upper():
            return jsonify({"error": "That appointment slot has just been booked. Please choose another slot."}), 409
        return jsonify({"error": "The appointment could not be saved"}), 400
    except Exception:
        connection.rollback()
        return jsonify({"error": "The appointment could not be saved"}), 500
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
        return jsonify({"message": "Appointment updated"}), 200
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

        target_apt = connection.execute(
            """
            SELECT central_appointment_id
            FROM PREGNANCY_APPOINTMENT
            WHERE appointment_id = ? AND patient_id = ?
            """,
            (appointment_id, patient_id),
        ).fetchone()
        if not target_apt:
            return jsonify({"error": "Appointment not found"}), 404

        connection.execute(
            "DELETE FROM PREGNANCY_APPOINTMENT WHERE appointment_id = ? AND patient_id = ?",
            (appointment_id, patient_id),
        )
        if target_apt["central_appointment_id"]:
            connection.execute(
                "UPDATE APPOINTMENT SET status = 'Cancelled' WHERE appointment_id = ? AND patient_id = ?",
                (target_apt["central_appointment_id"], patient_id),
            )
        connection.commit()
        return jsonify({"message": "Appointment deleted"}), 200
    finally:
        connection.close()
