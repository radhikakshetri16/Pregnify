import re
import secrets
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

from database.db import get_db_connection
from services.email_service import send_password_reset_otp_email


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")



def validate_password_complexity(password: str):
    """
    Validate password complexity:
    - At least 6 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[^A-Za-z0-9]", password):
        return False, "Password must contain at least one special character."
    return True, None


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    # -----------------------------
    # Account holder / USER details
    # -----------------------------
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    raw_age = data.get("age")
    gender = data.get("gender", "").strip()
    phone = data.get("phone", "").strip()

    # -----------------------------
    # Patient details
    # -----------------------------
    patient_name = data.get("patient_name", "").strip()
    raw_patient_age = data.get("patient_age")
    patient_gender = data.get("patient_gender", "").strip()
    patient_phone = data.get("patient_phone", "").strip()
    patient_address = data.get("patient_address", "").strip()
    relationship_type = data.get("relationship_type", "").strip()

    # -----------------------------
    # Basic validation
    # -----------------------------
    if not name or not email or not password:
        return jsonify({
            "error": "Name, email, and password are required"
        }), 400

    # Validate password complexity
    is_valid_pw, pw_error = validate_password_complexity(password)
    if not is_valid_pw:
        return jsonify({
            "error": pw_error
        }), 400

    # Validate Account Holder Age
    if raw_age is None or str(raw_age).strip() == "":
        return jsonify({
            "error": "Account holder age is required"
        }), 400

    try:
        age = int(raw_age)
    except (ValueError, TypeError):
        return jsonify({
            "error": "Account holder age must be a valid number"
        }), 400

    allowed_relationships = {
        "Self",
        "Husband",
        "Caretaker",
        "Guardian",
        "Other"
    }

    if relationship_type not in allowed_relationships:
        return jsonify({
            "error": "Invalid relationship type. Allowed options: Self, Husband, Caretaker, Guardian, Other"
        }), 400

    # -----------------------------
    # Age & Relationship Logic
    # -----------------------------
    if relationship_type == "Self":
        # Account Holder IS the Patient
        if age < 16:
            return jsonify({
                "error": "Pregnify is only available for patients aged 16 and above."
            }), 400
        if age < 18:
            return jsonify({
                "error": "Patients aged 16–17 cannot create an account independently. An adult representative (18+) must create and manage the account."
            }), 400

        # Self patient details copy from account holder
        patient_name = name
        patient_age = age
        patient_gender = gender
        patient_phone = phone
    else:
        # Account Holder IS NOT the Patient (Representative)
        if age < 18:
            return jsonify({
                "error": "The account holder / representative must be at least 18 years old."
            }), 400

        if not patient_name:
            return jsonify({
                "error": "Patient full name is required"
            }), 400

        if raw_patient_age is None or str(raw_patient_age).strip() == "":
            return jsonify({
                "error": "Patient age is required"
            }), 400

        try:
            patient_age = int(raw_patient_age)
        except (ValueError, TypeError):
            return jsonify({
                "error": "Patient age must be a valid number"
            }), 400

        if patient_age < 16:
            return jsonify({
                "error": "Patient must be at least 16 years old. Pregnify does not support registrations for patients below 16."
            }), 400

    connection = get_db_connection()

    try:
        # Check whether the email is already registered
        existing_user = connection.execute(
            """
            SELECT user_id
            FROM USER
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if existing_user:
            return jsonify({
                "error": "Email is already registered"
            }), 409

        # Hash password before storing it
        password_hash = generate_password_hash(password)

        # -----------------------------
        # Create USER
        # -----------------------------
        cursor = connection.execute(
            """
            INSERT INTO USER (
                name,
                email,
                password,
                age,
                gender,
                phone
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                email,
                password_hash,
                age,
                gender or None,
                phone or None
            )
        )

        user_id = cursor.lastrowid

        # -----------------------------
        # Create PATIENT
        # -----------------------------
        connection.execute(
            """
            INSERT INTO PATIENT (
                user_id,
                name,
                age,
                gender,
                phone,
                address,
                relationship_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                patient_name,
                patient_age,
                patient_gender or None,
                patient_phone or None,
                patient_address or None,
                relationship_type
            )
        )

        # Both USER and PATIENT are committed together
        connection.commit()

        return jsonify({
            "message": "Registration successful",
            "user": {
                "user_id": user_id,
                "name": name,
                "email": email
            },
            "patient": {
                "name": patient_name,
                "relationship_type": relationship_type
            }
        }), 201

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "error": "Email and password are required"
        }), 400

    connection = get_db_connection()

    try:
        user = connection.execute(
            """
            SELECT user_id, name, email, password
            FROM USER
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if not user:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        if not check_password_hash(user["password"], password):
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        session.clear()
        session["role"] = "user"
        session["user_id"] = user["user_id"]

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["user_id"],
                "name": user["name"],
                "email": user["email"]
            }
        }), 200

    finally:
        connection.close()


@auth_bp.route("/me", methods=["GET"])
def me():
    if session.get("role") != "user" or not session.get("user_id"):
        return jsonify({"error": "Authentication required"}), 401
    connection = get_db_connection()
    try:
        user = connection.execute(
            "SELECT user_id, name, email FROM USER WHERE user_id = ?",
            (session["user_id"],),
        ).fetchone()
        if not user:
            session.clear()
            return jsonify({"error": "Authentication required"}), 401
        return jsonify({"user": {"id": user["user_id"], "name": user["name"], "email": user["email"]}})
    finally:
        connection.close()


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200


# =========================================================
# FORGOT PASSWORD & PASSWORD RESET FLOW
# =========================================================

def parse_iso_datetime(dt_str: str) -> datetime:
    """Parse ISO datetime string to timezone-aware UTC datetime."""
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def get_active_account_lock(connection, email: str):
    """
    Check if password reset is currently locked for this email.
    Returns (is_locked: bool, locked_until_dt: datetime or None).
    """
    row = connection.execute(
        """
        SELECT locked_until FROM PASSWORD_RESET_OTP
        WHERE LOWER(email) = LOWER(?) AND locked_until IS NOT NULL
        ORDER BY reset_id DESC LIMIT 1
        """,
        (email.strip().lower(),)
    ).fetchone()

    if not row or not row["locked_until"]:
        return False, None

    locked_until_dt = parse_iso_datetime(row["locked_until"])
    now_dt = datetime.now(timezone.utc)
    if now_dt < locked_until_dt:
        return True, locked_until_dt
    return False, None


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """
    Step 1: User enters registered email to receive a 6-digit OTP.
    OTP validity: exactly 1 minute (60 seconds).
    Resend limit: max 2 resends per reset attempt.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Registered email is required"}), 400

    connection = get_db_connection()
    try:
        user = connection.execute(
            "SELECT user_id, name, email FROM USER WHERE LOWER(email) = ?",
            (email,)
        ).fetchone()

        if not user:
            return jsonify({"error": "No account found with this email address."}), 404

        # Check 24-hour lockout
        is_locked, _ = get_active_account_lock(connection, email)
        if is_locked:
            return jsonify({
                "error": "Password reset is temporarily locked. Please try again after 24 hours."
            }), 403

        # Check existing active OTP for this email
        active_otp = connection.execute(
            """
            SELECT * FROM PASSWORD_RESET_OTP
            WHERE LOWER(email) = ? AND verified = 0 AND used = 0
            ORDER BY reset_id DESC LIMIT 1
            """,
            (email,)
        ).fetchone()

        resend_count = 0
        attempts = 0

        if active_otp:
            now_dt = datetime.now(timezone.utc)
            expires_at_dt = parse_iso_datetime(active_otp["expires_at"])

            # Rule 3: Cannot resend/request new OTP before current OTP expires
            if now_dt < expires_at_dt:
                return jsonify({
                    "error": "Please wait until the current OTP expires before requesting a new one."
                }), 400

            # Current OTP expired, treat as resend request
            current_resend_count = active_otp["resend_count"] if "resend_count" in active_otp.keys() else 0
            if current_resend_count >= 2:
                return jsonify({
                    "error": "You have reached the maximum OTP resend limit."
                }), 400

            resend_count = current_resend_count + 1
            attempts = active_otp["attempts"]  # Carry over failed attempts across resends

            # Invalidate previous OTP
            connection.execute(
                "UPDATE PASSWORD_RESET_OTP SET used = 1 WHERE reset_id = ?",
                (active_otp["reset_id"],)
            )
        else:
            # Invalidate any lingering inactive records
            connection.execute(
                "UPDATE PASSWORD_RESET_OTP SET used = 1 WHERE LOWER(email) = ? AND used = 0",
                (email,)
            )

        # Generate secure 6-digit OTP (expires in exactly 1 minute)
        otp_code = f"{secrets.randbelow(1000000):06d}"
        otp_hash = generate_password_hash(otp_code)
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()
        expires_at_iso = (now_dt + timedelta(seconds=60)).isoformat()

        connection.execute(
            """
            INSERT INTO PASSWORD_RESET_OTP (
                user_id, email, otp_hash, expires_at, attempts, resend_count, locked_until, verified, used, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 0, ?)
            """,
            (user["user_id"], email, otp_hash, expires_at_iso, attempts, resend_count, now_iso)
        )
        connection.commit()

        # Send OTP via Gmail SMTP
        try:
            send_password_reset_otp_email(
                to_email=user["email"],
                user_name=user["name"],
                otp_code=otp_code
            )
        except ValueError as e:
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            return jsonify({"error": f"Failed to send OTP email: {str(e)}"}), 500

        return jsonify({
            "message": "OTP sent successfully to your registered Gmail address.",
            "email": email,
            "resends_remaining": max(0, 2 - resend_count)
        }), 200

    finally:
        connection.close()


@auth_bp.route("/verify-reset-otp", methods=["POST"])
def verify_reset_otp():
    """
    Step 2: User verifies 6-digit OTP.
    - Exactly 1 minute expiration.
    - Maximum 2 incorrect OTP attempts -> 24 hour lockout.
    - Returns a secure temporary reset token upon successful verification.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    otp = str(data.get("otp", "")).strip()

    if not email or not otp:
        return jsonify({"error": "Email and 6-digit OTP are required"}), 400

    if not (len(otp) == 6 and otp.isdigit()):
        return jsonify({"error": "OTP must be a 6-digit numeric code"}), 400

    connection = get_db_connection()
    try:
        # Check 24-hour lockout
        is_locked, _ = get_active_account_lock(connection, email)
        if is_locked:
            return jsonify({
                "error": "Password reset is temporarily locked. Please try again after 24 hours."
            }), 403

        # Find latest active OTP record for this email
        record = connection.execute(
            """
            SELECT * FROM PASSWORD_RESET_OTP
            WHERE LOWER(email) = ? AND verified = 0 AND used = 0
            ORDER BY reset_id DESC LIMIT 1
            """,
            (email,)
        ).fetchone()

        if not record:
            return jsonify({
                "error": "No active password reset request found. Please request a new OTP."
            }), 400

        now_dt = datetime.now(timezone.utc)

        # Check OTP expiration (1 minute = 60 seconds)
        expires_at_dt = parse_iso_datetime(record["expires_at"])
        if now_dt >= expires_at_dt:
            connection.execute(
                "UPDATE PASSWORD_RESET_OTP SET used = 1 WHERE reset_id = ?",
                (record["reset_id"],)
            )
            connection.commit()
            return jsonify({
                "error": "OTP has expired. Please request a new OTP."
            }), 400

        # Verify OTP securely
        if not check_password_hash(record["otp_hash"], otp):
            new_attempts = record["attempts"] + 1

            if new_attempts >= 2:
                # 2nd wrong attempt: Invalidate reset session and lock account for 24 hours
                lock_until_iso = (now_dt + timedelta(hours=24)).isoformat()
                connection.execute(
                    """
                    UPDATE PASSWORD_RESET_OTP
                    SET attempts = ?, used = 1, locked_until = ?
                    WHERE reset_id = ?
                    """,
                    (new_attempts, lock_until_iso, record["reset_id"])
                )
                connection.commit()
                return jsonify({
                    "error": "Too many incorrect OTP attempts. Password reset has been locked for 24 hours."
                }), 400
            else:
                # 1st wrong attempt
                connection.execute(
                    "UPDATE PASSWORD_RESET_OTP SET attempts = ? WHERE reset_id = ?",
                    (new_attempts, record["reset_id"])
                )
                connection.commit()
                return jsonify({
                    "error": "Invalid OTP. 1 attempt remaining."
                }), 400

        # Verification successful -> Generate secure temporary reset token (15 mins)
        reset_token = secrets.token_urlsafe(32)
        token_expires_at = (now_dt + timedelta(minutes=15)).isoformat()

        connection.execute(
            """
            UPDATE PASSWORD_RESET_OTP
            SET verified = 1, reset_token = ?, expires_at = ?
            WHERE reset_id = ?
            """,
            (reset_token, token_expires_at, record["reset_id"])
        )
        connection.commit()

        return jsonify({
            "message": "OTP verified successfully.",
            "reset_token": reset_token
        }), 200

    finally:
        connection.close()


@auth_bp.route("/resend-reset-otp", methods=["POST"])
def resend_reset_otp():
    """
    Resend a fresh OTP:
    - User cannot resend before the current OTP expires (1 minute).
    - Maximum 2 resends allowed per reset attempt.
    - Invalidates prior OTPs.
    - Carries forward failed-attempt count.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    connection = get_db_connection()
    try:
        user = connection.execute(
            "SELECT user_id, name, email FROM USER WHERE LOWER(email) = ?",
            (email,)
        ).fetchone()

        if not user:
            return jsonify({"error": "No account found with this email address."}), 404

        # Check 24-hour lockout
        is_locked, _ = get_active_account_lock(connection, email)
        if is_locked:
            return jsonify({
                "error": "Password reset is temporarily locked. Please try again after 24 hours."
            }), 403

        # Find latest unverified OTP record
        latest_record = connection.execute(
            """
            SELECT * FROM PASSWORD_RESET_OTP
            WHERE LOWER(email) = ? AND verified = 0
            ORDER BY reset_id DESC LIMIT 1
            """,
            (email,)
        ).fetchone()

        if not latest_record:
            return jsonify({
                "error": "No active password reset request found. Please request an OTP first."
            }), 400

        now_dt = datetime.now(timezone.utc)
        expires_at_dt = parse_iso_datetime(latest_record["expires_at"])

        # Check if current OTP is still active (< 1 minute)
        if latest_record["used"] == 0 and now_dt < expires_at_dt:
            return jsonify({
                "error": "Please wait until the current OTP expires before requesting a new one."
            }), 400

        # Check resend limit (maximum 2 resends)
        current_resend_count = latest_record["resend_count"] if "resend_count" in latest_record.keys() else 0
        if current_resend_count >= 2:
            return jsonify({
                "error": "You have reached the maximum OTP resend limit."
            }), 400

        carried_attempts = latest_record["attempts"]
        new_resend_count = current_resend_count + 1

        # Invalidate all prior OTP records for this email
        connection.execute(
            "UPDATE PASSWORD_RESET_OTP SET used = 1 WHERE LOWER(email) = ? AND used = 0",
            (email,)
        )

        # Generate fresh 6-digit OTP (expires in exactly 1 minute)
        otp_code = f"{secrets.randbelow(1000000):06d}"
        otp_hash = generate_password_hash(otp_code)
        now_iso = now_dt.isoformat()
        expires_at_iso = (now_dt + timedelta(seconds=60)).isoformat()

        connection.execute(
            """
            INSERT INTO PASSWORD_RESET_OTP (
                user_id, email, otp_hash, expires_at, attempts, resend_count, locked_until, verified, used, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 0, ?)
            """,
            (user["user_id"], email, otp_hash, expires_at_iso, carried_attempts, new_resend_count, now_iso)
        )
        connection.commit()

        # Send OTP email
        try:
            send_password_reset_otp_email(
                to_email=user["email"],
                user_name=user["name"],
                otp_code=otp_code
            )
        except ValueError as e:
            return jsonify({"error": str(e)}), 500
        except Exception as e:
            return jsonify({"error": f"Failed to send OTP email: {str(e)}"}), 500

        return jsonify({
            "message": "A fresh OTP has been sent to your registered Gmail address.",
            "email": email,
            "resends_remaining": max(0, 2 - new_resend_count)
        }), 200

    finally:
        connection.close()


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """
    Step 3: Reset password using the verified reset token.
    Validates token, validates password complexity, updates password in USER table,
    and invalidates the reset session.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    reset_token = data.get("reset_token", "").strip()
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    if not reset_token:
        return jsonify({"error": "Valid reset token is required"}), 400

    if not new_password or not confirm_password:
        return jsonify({"error": "New password and confirmation are required"}), 400

    if new_password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    # Validate password complexity (same rule as registration)
    is_valid_pw, pw_error = validate_password_complexity(new_password)
    if not is_valid_pw:
        return jsonify({"error": pw_error}), 400

    connection = get_db_connection()
    try:
        # Check active lockout if email provided
        if email:
            is_locked, _ = get_active_account_lock(connection, email)
            if is_locked:
                return jsonify({
                    "error": "Password reset is temporarily locked. Please try again after 24 hours."
                }), 403

        # Find active verified reset record by token
        record = connection.execute(
            """
            SELECT * FROM PASSWORD_RESET_OTP
            WHERE reset_token = ? AND verified = 1 AND used = 0
            """,
            (reset_token,)
        ).fetchone()

        if not record:
            return jsonify({
                "error": "Invalid or expired password reset session. Please start over."
            }), 400

        # If email was also provided, ensure it matches
        if email and record["email"].lower() != email:
            return jsonify({
                "error": "Reset session token does not match the provided email."
            }), 400

        # Check account lock on the record's email
        is_locked, _ = get_active_account_lock(connection, record["email"])
        if is_locked:
            return jsonify({
                "error": "Password reset is temporarily locked. Please try again after 24 hours."
            }), 403

        # Check token expiration
        now_dt = datetime.now(timezone.utc)
        expires_at_dt = parse_iso_datetime(record["expires_at"])
        if now_dt > expires_at_dt:
            connection.execute(
                "UPDATE PASSWORD_RESET_OTP SET used = 1 WHERE reset_id = ?",
                (record["reset_id"],)
            )
            connection.commit()
            return jsonify({
                "error": "Password reset session has expired. Please request a new OTP."
            }), 400

        # Hash new password using Werkzeug
        new_password_hash = generate_password_hash(new_password)

        # Update USER table password
        connection.execute(
            "UPDATE USER SET password = ? WHERE user_id = ?",
            (new_password_hash, record["user_id"])
        )

        # Invalidate all OTPs and reset tokens for this user
        connection.execute(
            "UPDATE PASSWORD_RESET_OTP SET used = 1 WHERE user_id = ?",
            (record["user_id"],)
        )
        connection.commit()

        return jsonify({
            "message": "Password reset successfully. Please log in with your new password."
        }), 200

    finally:
        connection.close()

