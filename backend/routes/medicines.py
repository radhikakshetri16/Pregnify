from flask import Blueprint, request, jsonify
from database.db import get_db_connection


medicines_bp = Blueprint(
    "medicines",
    __name__,
    url_prefix="/api/medicines"
)


# =========================================================
# GET PATIENT ID FROM LOGGED-IN USER
# =========================================================
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


# =========================================================
# GET ALL DOCTORS
# Used by the patient when selecting who prescribed medicine
# =========================================================
@medicines_bp.route("/doctors", methods=["GET"])
def get_doctors():

    connection = get_db_connection()

    try:

        doctors = connection.execute(
            """
            SELECT
                doctor_id,
                name,
                specialization
            FROM DOCTOR
            WHERE status = 'Active'
            ORDER BY name ASC
            """
        ).fetchall()

        return jsonify({
            "doctors": [
                {
                    "doctor_id": doctor["doctor_id"],
                    "name": doctor["name"],
                    "specialization": doctor["specialization"]
                }
                for doctor in doctors
            ]
        }), 200

    finally:
        connection.close()


# =========================================================
# GET ALL MEDICINES FOR LOGGED-IN USER
# =========================================================
@medicines_bp.route("", methods=["GET"])
def get_medicines():

    user_id = request.args.get(
        "user_id",
        type=int
    )

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    connection = get_db_connection()

    try:

        patient_id = get_patient_id(
            connection,
            user_id
        )

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        medicines = connection.execute(
            """
            SELECT
                m.medication_id,
                m.patient_id,
                m.medication_name,
                m.dosage,
                m.frequency,
                m.instructions,
                m.reason,
                m.start_date,
                m.end_date,
                m.status,

                d.doctor_id,
                d.name AS doctor_name,
                d.specialization

            FROM MEDICATION m

            INNER JOIN DOCTOR d
                ON m.prescribed_by = d.doctor_id

            WHERE m.patient_id = ?

            ORDER BY
                CASE
                    WHEN m.status = 'Active' THEN 1
                    WHEN m.status = 'Completed' THEN 2
                    WHEN m.status = 'Stopped' THEN 3
                    ELSE 4
                END,
                m.start_date DESC,
                m.medication_id DESC
            """,
            (patient_id,)
        ).fetchall()

        return jsonify({
            "medicines": [
                {
                    "medication_id": medicine["medication_id"],
                    "patient_id": medicine["patient_id"],
                    "medication_name": medicine["medication_name"],
                    "dosage": medicine["dosage"],
                    "frequency": medicine["frequency"],
                    "instructions": medicine["instructions"],
                    "reason": medicine["reason"],
                    "start_date": medicine["start_date"],
                    "end_date": medicine["end_date"],
                    "status": medicine["status"],
                    "doctor_id": medicine["doctor_id"],
                    "doctor_name": medicine["doctor_name"],
                    "specialization": medicine["specialization"]
                }
                for medicine in medicines
            ]
        }), 200

    finally:
        connection.close()


# =========================================================
# CREATE MEDICINE
# =========================================================
@medicines_bp.route("", methods=["POST"])
def create_medicine():

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

    medication_name = data.get(
        "medication_name"
    )

    prescribed_by = data.get(
        "prescribed_by"
    )

    if not medication_name or not medication_name.strip():
        return jsonify({
            "error": "Medication name is required"
        }), 400

    if not prescribed_by:
        return jsonify({
            "error": "Please select the doctor who prescribed the medicine"
        }), 400

    connection = get_db_connection()

    try:

        # -------------------------------------------------
        # USER -> PATIENT
        # -------------------------------------------------
        patient_id = get_patient_id(
            connection,
            user_id
        )

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404


        # -------------------------------------------------
        # Verify doctor exists
        # -------------------------------------------------
        doctor = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE doctor_id = ?
            """,
            (prescribed_by,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Selected doctor does not exist"
            }), 404


        # -------------------------------------------------
        # Validate status
        # -------------------------------------------------
        status = data.get("status")

        allowed_statuses = {
            "Active",
            "Completed",
            "Stopped"
        }

        if status and status not in allowed_statuses:
            return jsonify({
                "error": "Invalid medication status"
            }), 400


        # -------------------------------------------------
        # INSERT
        # -------------------------------------------------
        cursor = connection.execute(
            """
            INSERT INTO MEDICATION (
                patient_id,
                prescribed_by,
                medication_name,
                dosage,
                frequency,
                instructions,
                reason,
                start_date,
                end_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                prescribed_by,
                medication_name.strip(),
                data.get("dosage"),
                data.get("frequency"),
                data.get("instructions"),
                data.get("reason"),
                data.get("start_date"),
                data.get("end_date"),
                status
            )
        )

        connection.commit()

        return jsonify({
            "message": "Medicine added successfully",
            "medication_id": cursor.lastrowid
        }), 201

    except Exception as error:

        connection.rollback()

        print(
            "Create medicine error:",
            error
        )

        return jsonify({
            "error": "Unable to save medicine"
        }), 500

    finally:
        connection.close()


# =========================================================
# UPDATE MEDICINE
# =========================================================
@medicines_bp.route(
    "/<int:medication_id>",
    methods=["PUT"]
)
def update_medicine(medication_id):

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

    medication_name = data.get(
        "medication_name"
    )

    prescribed_by = data.get(
        "prescribed_by"
    )

    if not medication_name or not medication_name.strip():
        return jsonify({
            "error": "Medication name is required"
        }), 400

    if not prescribed_by:
        return jsonify({
            "error": "Please select the doctor who prescribed the medicine"
        }), 400

    connection = get_db_connection()

    try:

        # -------------------------------------------------
        # USER -> PATIENT
        # -------------------------------------------------
        patient_id = get_patient_id(
            connection,
            user_id
        )

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404


        # -------------------------------------------------
        # Make sure this medicine belongs to this patient
        # -------------------------------------------------
        existing = connection.execute(
            """
            SELECT medication_id
            FROM MEDICATION
            WHERE medication_id = ?
            AND patient_id = ?
            """,
            (
                medication_id,
                patient_id
            )
        ).fetchone()

        if not existing:
            return jsonify({
                "error": "Medicine record not found"
            }), 404


        # -------------------------------------------------
        # Verify doctor
        # -------------------------------------------------
        doctor = connection.execute(
            """
            SELECT doctor_id
            FROM DOCTOR
            WHERE doctor_id = ?
            """,
            (prescribed_by,)
        ).fetchone()

        if not doctor:
            return jsonify({
                "error": "Selected doctor does not exist"
            }), 404


        # -------------------------------------------------
        # Validate status
        # -------------------------------------------------
        status = data.get("status")

        allowed_statuses = {
            "Active",
            "Completed",
            "Stopped"
        }

        if status and status not in allowed_statuses:
            return jsonify({
                "error": "Invalid medication status"
            }), 400


        # -------------------------------------------------
        # UPDATE
        # -------------------------------------------------
        connection.execute(
            """
            UPDATE MEDICATION
            SET
                prescribed_by = ?,
                medication_name = ?,
                dosage = ?,
                frequency = ?,
                instructions = ?,
                reason = ?,
                start_date = ?,
                end_date = ?,
                status = ?
            WHERE medication_id = ?
            AND patient_id = ?
            """,
            (
                prescribed_by,
                medication_name.strip(),
                data.get("dosage"),
                data.get("frequency"),
                data.get("instructions"),
                data.get("reason"),
                data.get("start_date"),
                data.get("end_date"),
                status,
                medication_id,
                patient_id
            )
        )

        connection.commit()

        return jsonify({
            "message": "Medicine updated successfully"
        }), 200

    except Exception as error:

        connection.rollback()

        print(
            "Update medicine error:",
            error
        )

        return jsonify({
            "error": "Unable to update medicine"
        }), 500

    finally:
        connection.close()


# =========================================================
# DELETE MEDICINE
# =========================================================
@medicines_bp.route(
    "/<int:medication_id>",
    methods=["DELETE"]
)
def delete_medicine(medication_id):

    user_id = request.args.get(
        "user_id",
        type=int
    )

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    connection = get_db_connection()

    try:

        patient_id = get_patient_id(
            connection,
            user_id
        )

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404


        existing = connection.execute(
            """
            SELECT medication_id
            FROM MEDICATION
            WHERE medication_id = ?
            AND patient_id = ?
            """,
            (
                medication_id,
                patient_id
            )
        ).fetchone()


        if not existing:
            return jsonify({
                "error": "Medicine record not found"
            }), 404


        connection.execute(
            """
            DELETE FROM MEDICATION
            WHERE medication_id = ?
            AND patient_id = ?
            """,
            (
                medication_id,
                patient_id
            )
        )

        connection.commit()


        return jsonify({
            "message": "Medicine deleted successfully"
        }), 200

    except Exception as error:

        connection.rollback()

        print(
            "Delete medicine error:",
            error
        )

        return jsonify({
            "error": "Unable to delete medicine"
        }), 500

    finally:
        connection.close()