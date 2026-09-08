import json
import sqlite3
from datetime import date

from flask import Blueprint, jsonify, request

from database.db import get_db_connection


care_bp = Blueprint("care", __name__, url_prefix="/api")


def patient_id_for(connection, user_id):
    """Resolve patient_id from user_id."""
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None
    row = connection.execute(
        "SELECT patient_id FROM PATIENT WHERE user_id = ?", (user_id,)
    ).fetchone()
    return row["patient_id"] if row else None


def request_patient_id(connection, source):
    """Extract user_id or userId from query params or request dict and resolve patient_id."""
    user_id = None
    if hasattr(source, "get"):
        user_id = source.get("user_id") or source.get("userId")
    return patient_id_for(connection, user_id) if user_id else None


def parse_slots(raw_slots):
    """Parse time slot string (JSON array or comma-separated) into a list of strings."""
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
    """Normalize slot string for whitespace- and case-insensitive comparison."""
    return " ".join(str(slot or "").strip().upper().split())


def configured_slot_for(connection, doctor_id, appointment_date, requested_slot):
    """Verify and return the canonical slot from DOCTOR_AVAILABLE_DATE if configured."""
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


# =========================================================
# 1. GET /api/appointments
# =========================================================
@care_bp.route("/appointments", methods=["GET"])
def list_appointments():
    connection = get_db_connection()
    try:
        patient_id = request_patient_id(connection, request.args)
        if not patient_id:
            # If user_id wasn't provided or patient doesn't exist yet
            user_id = request.args.get("user_id") or request.args.get("userId")
            if not user_id:
                return jsonify({"error": "A valid user_id is required"}), 400
            return jsonify({"appointments": []}), 200

        records = connection.execute(
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
                d.name AS doctor_name,
                d.practice_at AS clinic_name,
                d.specialization,
                d.consultation_fee,
                d.phone AS doctor_phone
            FROM APPOINTMENT a
            LEFT JOIN DOCTOR d ON a.doctor_id = d.doctor_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date ASC, a.appointment_time ASC, a.appointment_id ASC
            """,
            (patient_id,),
        ).fetchall()

        appointments = [dict(record) for record in records]
        return jsonify({"appointments": appointments}), 200
    finally:
        connection.close()


# =========================================================
# 2. POST /api/appointments
# =========================================================
@care_bp.route("/api/appointments", methods=["POST"])  # Handles both prefixes if needed
@care_bp.route("/appointments", methods=["POST"])
def create_appointment():
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("userId")
    doctor_id = data.get("doctor_id")
    appointment_date_raw = data.get("appointment_date") or data.get("appointmentDate")
    appointment_time_raw = data.get("appointment_time") or data.get("appointmentTime")
    appointment_type = str(data.get("appointment_type") or data.get("appointmentType") or "").strip()
    reason = str(data.get("reason") or "").strip()

    if not user_id or not doctor_id or not appointment_date_raw or not appointment_time_raw or not appointment_type:
        return jsonify({
            "error": "user_id, doctor_id, appointment_date, appointment_time, and appointment_type are required"
        }), 400

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"error": "A valid numeric user_id is required"}), 400

    try:
        doctor_id = int(doctor_id)
    except (TypeError, ValueError):
        return jsonify({"error": "A valid numeric doctor_id is required"}), 400

    try:
        appointment_date = date.fromisoformat(str(appointment_date_raw).strip())
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid appointment date format. Use YYYY-MM-DD"}), 400

    if appointment_date < date.today():
        return jsonify({"error": "Appointment date cannot be in the past"}), 400

    connection = get_db_connection()
    try:
        # 1. Verify Patient
        patient_id = patient_id_for(connection, user_id)
        if not patient_id:
            return jsonify({
                "error": "Patient record not found. Please complete profile/patient setup first."
            }), 404

        # 2. Verify Doctor
        doctor = connection.execute(
            """
            SELECT doctor_id, name, practice_at, specialization, consultation_fee, status
            FROM DOCTOR
            WHERE doctor_id = ? AND status = 'Active'
            """,
            (doctor_id,),
        ).fetchone()
        if not doctor:
            return jsonify({"error": "The selected doctor is not available"}), 400

        # 3. Verify Slot in DOCTOR_AVAILABLE_DATE
        appointment_date_str = appointment_date.isoformat()
        configured_slot = configured_slot_for(
            connection, doctor_id, appointment_date_str, appointment_time_raw
        )
        if not configured_slot:
            return jsonify({
                "error": "That date or time slot is no longer available. Please choose an open slot."
            }), 409

        appointment_time = configured_slot

        # 4. Double booking check in APPOINTMENT
        existing_booking = connection.execute(
            """
            SELECT appointment_id
            FROM APPOINTMENT
            WHERE doctor_id = ?
              AND appointment_date = ?
              AND appointment_time = ?
              AND status <> 'Cancelled'
            """,
            (doctor_id, appointment_date_str, appointment_time),
        ).fetchone()
        if existing_booking:
            return jsonify({
                "error": "This appointment slot has just been booked by another patient.",
                "message": "This appointment slot has just been booked by another patient."
            }), 409

        # 5. Insert directly into APPOINTMENT (protected by partial unique index)
        cursor = connection.execute(
            """
            INSERT INTO APPOINTMENT (
                patient_id,
                doctor_id,
                booked_by,
                appointment_type,
                appointment_date,
                appointment_time,
                status,
                reason
            ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)
            """,
            (
                patient_id,
                doctor_id,
                user_id,
                appointment_type,
                appointment_date_str,
                appointment_time,
                reason,
            ),
        )
        appointment_id = cursor.lastrowid
        connection.commit()

        return jsonify({
            "message": "Appointment booked successfully",
            "appointment_id": appointment_id,
            "appointment": {
                "appointment_id": appointment_id,
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "booked_by": user_id,
                "appointment_type": appointment_type,
                "appointment_date": appointment_date_str,
                "appointment_time": appointment_time,
                "status": "Pending",
                "reason": reason,
                "doctor_name": doctor["name"],
                "clinic_name": doctor["practice_at"],
                "specialization": doctor["specialization"],
                "consultation_fee": doctor["consultation_fee"],
            },
        }), 201

    except sqlite3.IntegrityError as err:
        connection.rollback()
        err_msg = str(err).upper()
        if "UNIQUE" in err_msg or "APPOINTMENT" in err_msg:
            return jsonify({
                "error": "This appointment slot has just been booked by another patient.",
                "message": "This appointment slot has just been booked by another patient."
            }), 409
        return jsonify({"error": "The appointment could not be saved"}), 400
    except Exception as err:
        connection.rollback()
        return jsonify({"error": f"The appointment could not be saved: {str(err)}"}), 500
    finally:
        connection.close()


# =========================================================
# 3. PUT /api/appointments/<appointment_id>
# =========================================================
@care_bp.route("/appointments/<int:appointment_id>", methods=["PUT"])
def update_appointment(appointment_id):
    data = request.get_json() or {}
    user_id = data.get("user_id") or data.get("userId")
    if not user_id:
        return jsonify({"error": "A valid user_id is required"}), 400

    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, user_id)
        if not patient_id:
            return jsonify({"error": "Patient not found"}), 404

        # Check existing appointment and ownership
        existing = connection.execute(
            """
            SELECT *
            FROM APPOINTMENT
            WHERE appointment_id = ? AND patient_id = ?
            """,
            (appointment_id, patient_id),
        ).fetchone()
        if not existing:
            return jsonify({"error": "Appointment not found or unauthorized"}), 404

        updates = {}
        # If doctor, date, or time changes, re-validate availability
        target_doctor_id = data.get("doctor_id", existing["doctor_id"])
        target_date_raw = data.get("appointment_date", existing["appointment_date"])
        target_time_raw = data.get("appointment_time", existing["appointment_time"])

        if (
            target_doctor_id != existing["doctor_id"]
            or str(target_date_raw) != str(existing["appointment_date"])
            or str(target_time_raw) != str(existing["appointment_time"])
        ):
            try:
                target_doctor_id = int(target_doctor_id)
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid doctor_id"}), 400

            try:
                target_date = date.fromisoformat(str(target_date_raw).strip())
            except (TypeError, ValueError):
                return jsonify({"error": "Invalid appointment date format"}), 400

            if target_date < date.today():
                return jsonify({"error": "Appointment date cannot be in the past"}), 400

            doctor = connection.execute(
                "SELECT doctor_id FROM DOCTOR WHERE doctor_id = ? AND status = 'Active'",
                (target_doctor_id,),
            ).fetchone()
            if not doctor:
                return jsonify({"error": "Selected doctor is not available"}), 400

            configured_slot = configured_slot_for(
                connection, target_doctor_id, target_date.isoformat(), target_time_raw
            )
            if not configured_slot:
                return jsonify({
                    "error": "The requested date or time slot is not available in doctor's schedule"
                }), 409

            target_time = configured_slot

            # Check if another non-cancelled appointment holds this slot
            conflict = connection.execute(
                """
                SELECT appointment_id
                FROM APPOINTMENT
                WHERE doctor_id = ?
                  AND appointment_date = ?
                  AND appointment_time = ?
                  AND status <> 'Cancelled'
                  AND appointment_id <> ?
                """,
                (target_doctor_id, target_date.isoformat(), target_time, appointment_id),
            ).fetchone()
            if conflict:
                return jsonify({
                    "error": f"The slot {target_time} on {target_date.isoformat()} is already booked."
                }), 409

            updates["doctor_id"] = target_doctor_id
            updates["appointment_date"] = target_date.isoformat()
            updates["appointment_time"] = target_time

        if "appointment_type" in data:
            updates["appointment_type"] = str(data["appointment_type"]).strip()
        if "reason" in data:
            updates["reason"] = str(data["reason"]).strip()

        if not updates:
            return jsonify({"error": "No valid appointment fields provided to update"}), 400

        set_clauses = ", ".join(f"{key} = ?" for key in updates)
        connection.execute(
            f"UPDATE APPOINTMENT SET {set_clauses} WHERE appointment_id = ? AND patient_id = ?",
            [*updates.values(), appointment_id, patient_id],
        )
        connection.commit()

        updated_apt = connection.execute(
            """
            SELECT
                a.*,
                d.name AS doctor_name,
                d.practice_at AS clinic_name,
                d.specialization,
                d.consultation_fee
            FROM APPOINTMENT a
            LEFT JOIN DOCTOR d ON a.doctor_id = d.doctor_id
            WHERE a.appointment_id = ?
            """,
            (appointment_id,),
        ).fetchone()

        return jsonify({
            "message": "Appointment updated successfully",
            "appointment": dict(updated_apt) if updated_apt else None,
        }), 200

    except sqlite3.IntegrityError:
        connection.rollback()
        return jsonify({"error": "The slot is already booked by another appointment."}), 409
    finally:
        connection.close()


# =========================================================
# 4. DELETE /api/appointments/<appointment_id> (CANCEL)
# =========================================================
@care_bp.route("/appointments/<int:appointment_id>", methods=["DELETE"])
def cancel_appointment(appointment_id):
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or data.get("userId") or request.args.get("user_id") or request.args.get("userId")

    connection = get_db_connection()
    try:
        patient_id = patient_id_for(connection, user_id)
        if not patient_id:
            return jsonify({"error": "A valid user_id is required"}), 400

        # Perform soft cancellation: status = 'Cancelled'
        cursor = connection.execute(
            """
            UPDATE APPOINTMENT
            SET status = 'Cancelled'
            WHERE appointment_id = ? AND patient_id = ?
            """,
            (appointment_id, patient_id),
        )
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Appointment not found or unauthorized"}), 404

        return jsonify({
            "message": "Appointment cancelled successfully",
            "appointment_id": appointment_id,
            "status": "Cancelled"
        }), 200
    finally:
        connection.close()
