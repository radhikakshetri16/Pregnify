from flask import Blueprint, request, jsonify

from database.db import get_db_connection


medical_history_bp = Blueprint(
    "medical_history",
    __name__,
    url_prefix="/api/medical-history"
)


# =========================================================
# GET PATIENT ID
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
# GET MEDICAL HISTORY
# =========================================================
@medical_history_bp.route("", methods=["GET"])
def get_medical_history():

    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    connection = get_db_connection()

    try:
        # Resolve USER -> PATIENT
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        records = connection.execute(
            """
            SELECT
                medical_history_id,
                patient_id,
                condition_name,
                description,
                diagnosed_date,
                medication_history,
                status,
                notes
            FROM MEDICAL_HISTORY
            WHERE patient_id = ?
            ORDER BY
                diagnosed_date DESC,
                medical_history_id DESC
            """,
            (patient_id,)
        ).fetchall()

        return jsonify({
            "medical_history": [
                {
                    "medical_history_id": record["medical_history_id"],
                    "patient_id": record["patient_id"],
                    "condition_name": record["condition_name"],
                    "description": record["description"],
                    "diagnosed_date": record["diagnosed_date"],
                    "medication_history": record["medication_history"],
                    "status": record["status"],
                    "notes": record["notes"]
                }
                for record in records
            ]
        }), 200

    finally:
        connection.close()


# =========================================================
# CREATE MEDICAL HISTORY
# =========================================================
@medical_history_bp.route("", methods=["POST"])
def create_medical_history():

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

    condition_name = data.get("condition_name")

    if not condition_name or not condition_name.strip():
        return jsonify({
            "error": "condition_name is required"
        }), 400

    connection = get_db_connection()

    try:
        # Resolve USER -> PATIENT
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        cursor = connection.execute(
            """
            INSERT INTO MEDICAL_HISTORY (
                patient_id,
                condition_name,
                description,
                diagnosed_date,
                medication_history,
                status,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                condition_name.strip(),
                data.get("description"),
                data.get("diagnosed_date"),
                data.get("medication_history"),
                data.get("status"),
                data.get("notes")
            )
        )

        connection.commit()

        return jsonify({
            "message": "Medical history created successfully",
            "medical_history_id": cursor.lastrowid
        }), 201

    finally:
        connection.close()


# =========================================================
# UPDATE MEDICAL HISTORY
# =========================================================
@medical_history_bp.route(
    "/<int:medical_history_id>",
    methods=["PUT"]
)
def update_medical_history(medical_history_id):

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

    condition_name = data.get("condition_name")

    if not condition_name or not condition_name.strip():
        return jsonify({
            "error": "condition_name is required"
        }), 400

    connection = get_db_connection()

    try:
        # Resolve USER -> PATIENT
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        # Make sure the record belongs to this patient
        existing = connection.execute(
            """
            SELECT medical_history_id
            FROM MEDICAL_HISTORY
            WHERE medical_history_id = ?
            AND patient_id = ?
            """,
            (
                medical_history_id,
                patient_id
            )
        ).fetchone()

        if not existing:
            return jsonify({
                "error": "Medical history record not found"
            }), 404

        connection.execute(
            """
            UPDATE MEDICAL_HISTORY
            SET
                condition_name = ?,
                description = ?,
                diagnosed_date = ?,
                medication_history = ?,
                status = ?,
                notes = ?
            WHERE medical_history_id = ?
            AND patient_id = ?
            """,
            (
                condition_name.strip(),
                data.get("description"),
                data.get("diagnosed_date"),
                data.get("medication_history"),
                data.get("status"),
                data.get("notes"),
                medical_history_id,
                patient_id
            )
        )

        connection.commit()

        return jsonify({
            "message": "Medical history updated successfully"
        }), 200

    finally:
        connection.close()


# =========================================================
# DELETE MEDICAL HISTORY
# =========================================================
@medical_history_bp.route(
    "/<int:medical_history_id>",
    methods=["DELETE"]
)
def delete_medical_history(medical_history_id):

    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    connection = get_db_connection()

    try:
        # Resolve USER -> PATIENT
        patient_id = get_patient_id(connection, user_id)

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404

        # Make sure this record belongs to this patient
        existing = connection.execute(
            """
            SELECT medical_history_id
            FROM MEDICAL_HISTORY
            WHERE medical_history_id = ?
            AND patient_id = ?
            """,
            (
                medical_history_id,
                patient_id
            )
        ).fetchone()

        if not existing:
            return jsonify({
                "error": "Medical history record not found"
            }), 404

        connection.execute(
            """
            DELETE FROM MEDICAL_HISTORY
            WHERE medical_history_id = ?
            AND patient_id = ?
            """,
            (
                medical_history_id,
                patient_id
            )
        )

        connection.commit()

        return jsonify({
            "message": "Medical history deleted successfully"
        }), 200

    finally:
        connection.close()