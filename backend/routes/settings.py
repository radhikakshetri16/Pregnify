from flask import Blueprint, request, jsonify
from database.db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash


settings_bp = Blueprint(
    "settings",
    __name__,
    url_prefix="/api/settings"
)


# =========================================================
# GET PATIENT ID FROM USER ID
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
# GET USER PROFILE
# =========================================================
@settings_bp.route("/profile", methods=["GET"])
def get_profile():

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

        user = connection.execute(
            """
            SELECT
                user_id,
                name,
                email,
                age,
                gender,
                phone
            FROM USER
            WHERE user_id = ?
            """,
            (user_id,)
        ).fetchone()

        if not user:
            return jsonify({
                "error": "User not found"
            }), 404


        patient = connection.execute(
            """
            SELECT
                patient_id,
                name,
                age,
                gender,
                phone,
                address,
                relationship_type
            FROM PATIENT
            WHERE user_id = ?
            """,
            (user_id,)
        ).fetchone()


        profile = {
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "age": user["age"],
            "gender": user["gender"],
            "phone": user["phone"],
            "patient_id": None,
            "patient_name": None,
            "patient_age": None,
            "patient_gender": None,
            "patient_phone": None,
            "address": None,
            "relationship_type": None
        }


        if patient:

            profile["patient_id"] = patient["patient_id"]
            profile["patient_name"] = patient["name"]
            profile["patient_age"] = patient["age"]
            profile["patient_gender"] = patient["gender"]
            profile["patient_phone"] = patient["phone"]
            profile["address"] = patient["address"]
            profile["relationship_type"] = patient["relationship_type"]


        return jsonify({
            "profile": profile
        }), 200

    except Exception as error:

        print(
            "Get profile error:",
            error
        )

        return jsonify({
            "error": "Unable to load profile"
        }), 500

    finally:
        connection.close()


# =========================================================
# UPDATE PROFILE
# =========================================================
@settings_bp.route("/profile", methods=["PUT"])
def update_profile():

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


    name = data.get("name")
    email = data.get("email")
    age = data.get("age")
    gender = data.get("gender")
    phone = data.get("phone")
    address = data.get("address")


    if not name or not name.strip():

        return jsonify({
            "error": "Name is required"
        }), 400


    if not email or not email.strip():

        return jsonify({
            "error": "Email is required"
        }), 400


    connection = get_db_connection()

    try:

        # -------------------------------------------------
        # Check user exists
        # -------------------------------------------------
        user = connection.execute(
            """
            SELECT user_id
            FROM USER
            WHERE user_id = ?
            """,
            (user_id,)
        ).fetchone()


        if not user:

            return jsonify({
                "error": "User not found"
            }), 404


        # -------------------------------------------------
        # Check email is not used by another user
        # -------------------------------------------------
        existing_email = connection.execute(
            """
            SELECT user_id
            FROM USER
            WHERE email = ?
            AND user_id != ?
            """,
            (
                email.strip(),
                user_id
            )
        ).fetchone()


        if existing_email:

            return jsonify({
                "error": "This email is already being used by another account"
            }), 409


        # -------------------------------------------------
        # Update USER
        # -------------------------------------------------
        connection.execute(
            """
            UPDATE USER
            SET
                name = ?,
                email = ?,
                age = ?,
                gender = ?,
                phone = ?
            WHERE user_id = ?
            """,
            (
                name.strip(),
                email.strip(),
                age,
                gender,
                phone,
                user_id
            )
        )


        # -------------------------------------------------
        # Update PATIENT
        # -------------------------------------------------
        patient_id = get_patient_id(
            connection,
            user_id
        )


        if patient_id:

            connection.execute(
                """
                UPDATE PATIENT
                SET
                    name = ?,
                    age = ?,
                    gender = ?,
                    phone = ?,
                    address = ?
                WHERE patient_id = ?
                """,
                (
                    name.strip(),
                    age,
                    gender,
                    phone,
                    address,
                    patient_id
                )
            )


        connection.commit()


        return jsonify({
            "message": "Profile updated successfully"
        }), 200


    except Exception as error:

        connection.rollback()

        print(
            "Update profile error:",
            error
        )

        return jsonify({
            "error": "Unable to update profile"
        }), 500

    finally:
        connection.close()


# =========================================================
# CHANGE PASSWORD
# =========================================================
@settings_bp.route("/password", methods=["PUT"])
def change_password():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400


    user_id = data.get("user_id")
    current_password = data.get(
        "current_password"
    )
    new_password = data.get(
        "new_password"
    )


    if not user_id:

        return jsonify({
            "error": "user_id is required"
        }), 400


    if not current_password:

        return jsonify({
            "error": "Current password is required"
        }), 400


    if not new_password:

        return jsonify({
            "error": "New password is required"
        }), 400


    if len(new_password) < 6:

        return jsonify({
            "error": "New password must be at least 6 characters long"
        }), 400


    connection = get_db_connection()

    try:

        user = connection.execute(
            """
            SELECT
                user_id,
                password
            FROM USER
            WHERE user_id = ?
            """,
            (user_id,)
        ).fetchone()


        if not user:

            return jsonify({
                "error": "User not found"
            }), 404


        # -------------------------------------------------
        # Verify current password
        # -------------------------------------------------
        if not check_password_hash(
            user["password"],
            current_password
        ):

            return jsonify({
                "error": "Current password is incorrect"
            }), 401


        # -------------------------------------------------
        # Prevent same password
        # -------------------------------------------------
        if check_password_hash(
            user["password"],
            new_password
        ):

            return jsonify({
                "error": "New password must be different from your current password"
            }), 400


        # -------------------------------------------------
        # Hash new password
        # -------------------------------------------------
        hashed_password = generate_password_hash(
            new_password
        )


        connection.execute(
            """
            UPDATE USER
            SET password = ?
            WHERE user_id = ?
            """,
            (
                hashed_password,
                user_id
            )
        )


        connection.commit()


        return jsonify({
            "message": "Password changed successfully"
        }), 200


    except Exception as error:

        connection.rollback()

        print(
            "Change password error:",
            error
        )

        return jsonify({
            "error": "Unable to change password"
        }), 500

    finally:
        connection.close()