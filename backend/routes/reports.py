import os
import uuid

from flask import Blueprint, request, jsonify, send_from_directory

from database.db import get_db_connection


reports_bp = Blueprint(
    "reports",
    __name__,
    url_prefix="/api/reports"
)


# =========================================================
# UPLOAD DIRECTORY
# =========================================================
BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads",
    "reports"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
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
# GET REPORTS
# =========================================================
@reports_bp.route("", methods=["GET"])
def get_reports():

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

        reports = connection.execute(
            """
            SELECT
                report_id,
                patient_id,
                report_title,
                report_type,
                report_date,
                file_path,
                notes,
                uploaded_at
            FROM REPORT
            WHERE patient_id = ?
            ORDER BY
                report_date DESC,
                report_id DESC
            """,
            (patient_id,)
        ).fetchall()

        return jsonify({
            "reports": [
                {
                    "report_id": report["report_id"],
                    "patient_id": report["patient_id"],
                    "report_title": report["report_title"],
                    "report_type": report["report_type"],
                    "report_date": report["report_date"],
                    "file_path": report["file_path"],
                    "notes": report["notes"],
                    "uploaded_at": report["uploaded_at"]
                }
                for report in reports
            ]
        }), 200

    finally:
        connection.close()


# =========================================================
# UPLOAD REPORT
# =========================================================
@reports_bp.route("", methods=["POST"])
def upload_report():

    user_id = request.form.get(
        "user_id",
        type=int
    )

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    report_title = request.form.get(
        "report_title"
    )

    report_type = request.form.get(
        "report_type"
    )

    report_date = request.form.get(
        "report_date"
    )

    notes = request.form.get(
        "notes"
    )

    file = request.files.get(
        "file"
    )

    if not report_title or not report_title.strip():
        return jsonify({
            "error": "Report title is required"
        }), 400

    if not report_type or not report_type.strip():
        return jsonify({
            "error": "Report type is required"
        }), 400

    if not report_date:
        return jsonify({
            "error": "Report date is required"
        }), 400

    if not file or not file.filename:
        return jsonify({
            "error": "Report file is required"
        }), 400

    # -----------------------------------------------------
    # Allowed file types
    # -----------------------------------------------------
    allowed_extensions = {
        "pdf",
        "png",
        "jpg",
        "jpeg",
        "webp"
    }

    original_filename = file.filename

    extension = (
        original_filename
        .rsplit(".", 1)[1]
        .lower()
        if "." in original_filename
        else ""
    )

    if extension not in allowed_extensions:
        return jsonify({
            "error": "Only PDF, PNG, JPG, JPEG and WEBP files are allowed."
        }), 400


    connection = get_db_connection()

    try:

        # USER -> PATIENT
        patient_id = get_patient_id(
            connection,
            user_id
        )

        if not patient_id:
            return jsonify({
                "error": "Patient record not found"
            }), 404


        # -------------------------------------------------
        # Generate unique filename
        # -------------------------------------------------
        filename = (
            f"{uuid.uuid4().hex}"
            f".{extension}"
        )

        file_path = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        file.save(file_path)


        # Store relative path in database
        database_file_path = os.path.join(
            "uploads",
            "reports",
            filename
        ).replace("\\", "/")


        # -------------------------------------------------
        # Insert database record
        # -------------------------------------------------
        cursor = connection.execute(
            """
            INSERT INTO REPORT (
                patient_id,
                report_title,
                report_type,
                report_date,
                file_path,
                notes
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                report_title.strip(),
                report_type.strip(),
                report_date,
                database_file_path,
                notes.strip() if notes else None
            )
        )

        connection.commit()


        return jsonify({
            "message": "Report uploaded successfully",
            "report_id": cursor.lastrowid
        }), 201

    except Exception:

        connection.rollback()

        # Remove file if database insertion fails
        if os.path.exists(file_path):
            os.remove(file_path)

        raise

    finally:
        connection.close()


# =========================================================
# VIEW REPORT FILE
# =========================================================
@reports_bp.route(
    "/<int:report_id>/file",
    methods=["GET"]
)
def view_report(report_id):

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


        report = connection.execute(
            """
            SELECT file_path
            FROM REPORT
            WHERE report_id = ?
            AND patient_id = ?
            """,
            (
                report_id,
                patient_id
            )
        ).fetchone()


        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404


        relative_path = report["file_path"]

        filename = os.path.basename(
            relative_path
        )


        return send_from_directory(
            UPLOAD_FOLDER,
            filename
        )

    finally:
        connection.close()


# =========================================================
# DELETE REPORT
# =========================================================
@reports_bp.route(
    "/<int:report_id>",
    methods=["DELETE"]
)
def delete_report(report_id):

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


        report = connection.execute(
            """
            SELECT file_path
            FROM REPORT
            WHERE report_id = ?
            AND patient_id = ?
            """,
            (
                report_id,
                patient_id
            )
        ).fetchone()


        if not report:
            return jsonify({
                "error": "Report not found"
            }), 404


        connection.execute(
            """
            DELETE FROM REPORT
            WHERE report_id = ?
            AND patient_id = ?
            """,
            (
                report_id,
                patient_id
            )
        )

        connection.commit()


        # Remove physical file
        relative_path = report["file_path"]

        filename = os.path.basename(
            relative_path
        )

        physical_file = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        if os.path.exists(physical_file):
            os.remove(physical_file)


        return jsonify({
            "message": "Report deleted successfully"
        }), 200

    finally:
        connection.close()