import base64
import hashlib
import hmac
import json
import os
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from flask import Blueprint, jsonify, redirect, request

from auth_session import admin_required, current_user_id, user_required
from database.db import get_db_connection
from routes.care import configured_slot_for, patient_id_for


payments_bp = Blueprint("payments", __name__, url_prefix="/api")
ACTIVE_PAYMENT_STATUSES = ("INITIATED", "PENDING")


def utc_now():
    return datetime.now(timezone.utc)


def iso_time(value):
    return value.isoformat(timespec="seconds")


def parse_time(value):
    return datetime.fromisoformat(value)


def frontend_url(result, payment_id):
    base = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173").rstrip("/")
    return f"{base}/appointments?payment={urllib.parse.quote(result)}&payment_id={payment_id}"


def backend_url(path):
    base = os.getenv("BACKEND_PUBLIC_URL", "http://127.0.0.1:5000").rstrip("/")
    return f"{base}{path}"


def amount_to_paisa(value):
    try:
        amount = Decimal(str(value).replace(",", "")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError):
        return None
    paisa = int(amount * 100)
    return paisa if paisa > 0 else None


def amount_to_npr(amount_paisa):
    return f"{Decimal(amount_paisa) / Decimal(100):.2f}"


def json_request(url, method="GET", payload=None, headers=None, timeout=15):
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = {"Accept": "application/json", **(headers or {})}
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"error": raw or "Payment provider request failed"}
        return err.code, parsed


def expire_payment_holds(connection):
    now = iso_time(utc_now())
    rows = connection.execute(
        """
        SELECT payment_id, appointment_id
        FROM PAYMENT
        WHERE status IN ('INITIATED', 'PENDING') AND expires_at <= ?
        """,
        (now,),
    ).fetchall()
    if not rows:
        return 0
    payment_ids = [row["payment_id"] for row in rows]
    appointment_ids = [row["appointment_id"] for row in rows]
    payment_marks = ",".join("?" for _ in payment_ids)
    appointment_marks = ",".join("?" for _ in appointment_ids)
    connection.execute(
        f"UPDATE PAYMENT SET status = 'EXPIRED', failure_reason = 'Payment hold expired', updated_at = ? WHERE payment_id IN ({payment_marks})",
        (now, *payment_ids),
    )
    connection.execute(
        f"UPDATE APPOINTMENT SET status = 'Cancelled', payment_status = 'EXPIRED' WHERE appointment_id IN ({appointment_marks}) AND payment_status = 'PENDING'",
        appointment_ids,
    )
    return len(rows)


def public_payment(row):
    return {
        "payment_id": row["payment_id"],
        "appointment_id": row["appointment_id"],
        "provider": row["provider"],
        "amount_paisa": row["amount_paisa"],
        "amount": amount_to_npr(row["amount_paisa"]),
        "currency": row["currency"],
        "status": row["status"],
        "transaction_id": row["provider_transaction_id"],
        "expires_at": row["expires_at"],
        "failure_reason": row["failure_reason"],
    }


def esewa_signature(fields, signed_field_names, secret):
    message = ",".join(f"{field}={fields[field]}" for field in signed_field_names.split(","))
    digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
    return base64.b64encode(digest).decode("ascii")


def esewa_config():
    environment = os.getenv("PAYMENT_ENV", "sandbox").lower()
    # EPAYTEST uses eSewa's published UAT credential. Live credentials must
    # always be supplied by the merchant through environment variables.
    sandbox_secret = "8gBm/:&EnhH.1/q" if environment == "sandbox" else ""
    product_code = os.getenv("ESEWA_PRODUCT_CODE", "EPAYTEST" if environment == "sandbox" else "").strip()
    secret = os.getenv("ESEWA_SECRET_KEY", sandbox_secret).strip()
    if not product_code or not secret:
        return None, "eSewa merchant credentials are not configured"
    if environment == "sandbox":
        form_url = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
        status_url = "https://rc.esewa.com.np/api/epay/transaction/status/"
    else:
        form_url = "https://epay.esewa.com.np/api/epay/main/v2/form"
        status_url = "https://esewa.com.np/api/epay/transaction/status/"
    return {"secret": secret, "product_code": product_code, "form_url": form_url, "status_url": status_url}, None


def initiate_esewa(payment, config):
    amount = amount_to_npr(payment["amount_paisa"])
    fields = {
        "amount": amount,
        "tax_amount": "0",
        "total_amount": amount,
        "transaction_uuid": payment["merchant_transaction_id"],
        "product_code": config["product_code"],
        "product_service_charge": "0",
        "product_delivery_charge": "0",
        "success_url": backend_url(f"/api/payments/esewa/callback?payment_id={payment['payment_id']}"),
        "failure_url": backend_url(f"/api/payments/esewa/failure?payment_id={payment['payment_id']}"),
        "signed_field_names": "total_amount,transaction_uuid,product_code",
    }
    fields["signature"] = esewa_signature(fields, fields["signed_field_names"], config["secret"])
    return {"checkout_type": "form", "form_action": config["form_url"], "form_fields": fields}


@payments_bp.route("/payments/providers", methods=["GET"])
def payment_providers():
    environment = os.getenv("PAYMENT_ENV", "sandbox").lower()
    config, config_error = esewa_config()
    response = {
        "environment": environment,
        "providers": {
            "ESEWA": {
                "enabled": config is not None,
                "message": config_error,
            },
        },
    }
    if environment == "sandbox":
        response["providers"]["ESEWA"]["test_credentials"] = {
            "esewa_id": "9711111111",
            "password": "Test@123",
            "mpin": "1122",
            "token": "123456",
        }
    return jsonify(response)


@payments_bp.route("/payments/initiate", methods=["POST"])
@user_required
def initiate_payment():
    data = request.get_json(silent=True) or {}
    provider = str(data.get("provider", "ESEWA")).strip().upper()
    idempotency_key = str(data.get("idempotency_key", "")).strip()
    if provider != "ESEWA":
        return jsonify({"error": "Only eSewa payments are supported"}), 400
    if not idempotency_key or len(idempotency_key) > 100:
        return jsonify({"error": "A valid idempotency_key is required"}), 400
    config, config_error = esewa_config()
    if config_error:
        return jsonify({"error": config_error}), 503

    try:
        doctor_id = int(data.get("doctor_id"))
        appointment_date = date.fromisoformat(str(data.get("appointment_date", "")).strip())
    except (TypeError, ValueError):
        return jsonify({"error": "Valid doctor and appointment date are required"}), 400
    appointment_type = str(data.get("appointment_type", "")).strip()
    requested_time = str(data.get("appointment_time", "")).strip()
    reason = str(data.get("reason", "")).strip()
    if appointment_date < date.today() or not appointment_type or not requested_time:
        return jsonify({"error": "A future date, time, and appointment type are required"}), 400

    user_id = current_user_id()
    connection = get_db_connection()
    try:
        connection.execute("BEGIN IMMEDIATE")
        expire_payment_holds(connection)
        existing = connection.execute(
            "SELECT * FROM PAYMENT WHERE user_id = ? AND idempotency_key = ?",
            (user_id, idempotency_key),
        ).fetchone()
        if existing:
            connection.commit()
            if not existing["checkout_payload"]:
                message = existing["failure_reason"] or "Payment initialization is still in progress"
                return jsonify({"error": message, "payment": public_payment(existing)}), 409
            payload = json.loads(existing["checkout_payload"] or "{}")
            return jsonify({"payment": public_payment(existing), **payload}), 200

        patient_id = patient_id_for(connection, user_id)
        doctor = connection.execute(
            "SELECT doctor_id, consultation_fee FROM DOCTOR WHERE doctor_id = ? AND status = 'Active'",
            (doctor_id,),
        ).fetchone()
        if not patient_id:
            connection.rollback()
            return jsonify({"error": "Patient profile not found"}), 404
        if not doctor:
            connection.rollback()
            return jsonify({"error": "The selected doctor is unavailable"}), 400
        canonical_time = configured_slot_for(connection, doctor_id, appointment_date.isoformat(), requested_time)
        if not canonical_time:
            connection.rollback()
            return jsonify({"error": "That date or time is no longer available"}), 409
        if connection.execute(
            "SELECT 1 FROM APPOINTMENT WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status <> 'Cancelled'",
            (doctor_id, appointment_date.isoformat(), canonical_time),
        ).fetchone():
            connection.rollback()
            return jsonify({"error": "That appointment slot has just been reserved"}), 409

        amount_paisa = amount_to_paisa(doctor["consultation_fee"])
        if not amount_paisa:
            connection.rollback()
            return jsonify({"error": "The doctor has no valid consultation fee"}), 400
        appointment_cursor = connection.execute(
            """
            INSERT INTO APPOINTMENT (
                patient_id, doctor_id, booked_by, appointment_type,
                appointment_date, appointment_time, status, reason, payment_status
            ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, 'PENDING')
            """,
            (patient_id, doctor_id, user_id, appointment_type, appointment_date.isoformat(), canonical_time, reason),
        )
        now = utc_now()
        merchant_id = f"PG-{uuid.uuid4().hex}"
        payment_cursor = connection.execute(
            """
            INSERT INTO PAYMENT (
                appointment_id, user_id, provider, idempotency_key,
                merchant_transaction_id, amount_paisa, status, expires_at,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'INITIATED', ?, ?, ?)
            """,
            (
                appointment_cursor.lastrowid, user_id, provider, idempotency_key,
                merchant_id, amount_paisa, iso_time(now + timedelta(minutes=10)),
                iso_time(now), iso_time(now),
            ),
        )
        payment_id = payment_cursor.lastrowid
        connection.commit()

        payment = connection.execute("SELECT * FROM PAYMENT WHERE payment_id = ?", (payment_id,)).fetchone()
        try:
            checkout = initiate_esewa(payment, config)
        except Exception as err:
            connection.execute("BEGIN IMMEDIATE")
            connection.execute(
                "UPDATE PAYMENT SET status = 'FAILED', failure_reason = ?, updated_at = ? WHERE payment_id = ?",
                (str(err), iso_time(utc_now()), payment_id),
            )
            connection.execute(
                "UPDATE APPOINTMENT SET status = 'Cancelled', payment_status = 'FAILED' WHERE appointment_id = ?",
                (payment["appointment_id"],),
            )
            connection.commit()
            return jsonify({"error": str(err)}), 502

        connection.execute(
            "UPDATE PAYMENT SET status = 'PENDING', provider_payment_id = ?, checkout_payload = ?, updated_at = ? WHERE payment_id = ?",
            (checkout.get("provider_payment_id"), json.dumps(checkout), iso_time(utc_now()), payment_id),
        )
        connection.commit()
        payment = connection.execute("SELECT * FROM PAYMENT WHERE payment_id = ?", (payment_id,)).fetchone()
        return jsonify({"payment": public_payment(payment), **checkout}), 201
    except sqlite3.IntegrityError:
        connection.rollback()
        return jsonify({"error": "That appointment slot has just been reserved"}), 409
    finally:
        connection.close()


def finalize_verified_payment(connection, payment, provider_transaction_id):
    now = utc_now()
    if payment["status"] in ("COMPLETED", "REFUND_REQUESTED", "REFUNDED"):
        return payment["status"].lower()
    if now > parse_time(payment["expires_at"]):
        connection.execute(
            "UPDATE PAYMENT SET status = 'REFUND_REQUESTED', provider_transaction_id = ?, verified_at = ?, paid_at = ?, refund_requested_at = ?, updated_at = ?, failure_reason = 'Payment completed after slot hold expired' WHERE payment_id = ?",
            (provider_transaction_id, iso_time(now), iso_time(now), iso_time(now), iso_time(now), payment["payment_id"]),
        )
        connection.execute(
            "UPDATE APPOINTMENT SET status = 'Cancelled', payment_status = 'REFUND_REQUESTED' WHERE appointment_id = ?",
            (payment["appointment_id"],),
        )
        connection.commit()
        return "refund-required"
    connection.execute(
        "UPDATE PAYMENT SET status = 'COMPLETED', provider_transaction_id = ?, verified_at = ?, paid_at = ?, updated_at = ?, failure_reason = NULL WHERE payment_id = ?",
        (provider_transaction_id, iso_time(now), iso_time(now), iso_time(now), payment["payment_id"]),
    )
    connection.execute(
        "UPDATE APPOINTMENT SET payment_status = 'PAID' WHERE appointment_id = ? AND status <> 'Cancelled'",
        (payment["appointment_id"],),
    )
    connection.commit()
    return "success"


def decode_esewa_response(encoded):
    padding = "=" * (-len(encoded) % 4)
    return json.loads(base64.b64decode(encoded + padding).decode("utf-8"))


@payments_bp.route("/payments/esewa/callback", methods=["GET"])
def esewa_callback():
    payment_id = request.args.get("payment_id", type=int)
    encoded = request.args.get("data", "")
    connection = get_db_connection()
    try:
        payment = connection.execute("SELECT * FROM PAYMENT WHERE payment_id = ? AND provider = 'ESEWA'", (payment_id,)).fetchone()
        if not payment or not encoded:
            return redirect(frontend_url("invalid", payment_id or 0))
        config, error = esewa_config()
        if error:
            return redirect(frontend_url("verification-error", payment_id))
        try:
            response = decode_esewa_response(encoded)
            signed_names = response.get("signed_field_names", "")
            expected = esewa_signature(response, signed_names, config["secret"])
            valid_signature = hmac.compare_digest(expected, response.get("signature", ""))
            valid_identity = response.get("transaction_uuid") == payment["merchant_transaction_id"] and response.get("product_code") == config["product_code"]
            valid_amount = amount_to_paisa(response.get("total_amount")) == payment["amount_paisa"]
            if not (valid_signature and valid_identity and valid_amount and response.get("status") == "COMPLETE"):
                raise ValueError("Invalid eSewa callback")
            query = urllib.parse.urlencode({
                "product_code": config["product_code"],
                "total_amount": amount_to_npr(payment["amount_paisa"]),
                "transaction_uuid": payment["merchant_transaction_id"],
            })
            status, lookup = json_request(f"{config['status_url']}?{query}")
        except Exception:
            return redirect(frontend_url("invalid", payment_id))
        if status == 200 and lookup.get("status") == "COMPLETE" and amount_to_paisa(lookup.get("total_amount")) == payment["amount_paisa"]:
            result = finalize_verified_payment(connection, payment, lookup.get("ref_id") or response.get("transaction_code"))
        elif lookup.get("status") in {"PENDING", "AMBIGUOUS"}:
            result = "pending"
        else:
            now = iso_time(utc_now())
            connection.execute(
                "UPDATE PAYMENT SET status = 'FAILED', failure_reason = ?, updated_at = ? WHERE payment_id = ?",
                (lookup.get("status", "eSewa payment failed"), now, payment_id),
            )
            connection.execute(
                "UPDATE APPOINTMENT SET status = 'Cancelled', payment_status = 'FAILED' WHERE appointment_id = ?",
                (payment["appointment_id"],),
            )
            connection.commit()
            result = "failed"
        return redirect(frontend_url(result, payment_id))
    finally:
        connection.close()


@payments_bp.route("/payments/esewa/failure", methods=["GET"])
def esewa_failure():
    payment_id = request.args.get("payment_id", type=int)
    connection = get_db_connection()
    try:
        payment = connection.execute("SELECT * FROM PAYMENT WHERE payment_id = ? AND provider = 'ESEWA'", (payment_id,)).fetchone()
        if not payment:
            return redirect(frontend_url("invalid", payment_id or 0))
        if payment["status"] in ("COMPLETED", "REFUND_REQUESTED", "REFUNDED"):
            result = "success" if payment["status"] == "COMPLETED" else "refund-required"
            return redirect(frontend_url(result, payment_id))
        config, error = esewa_config()
        if error:
            return redirect(frontend_url("verification-error", payment_id))
        query = urllib.parse.urlencode({
            "product_code": config["product_code"],
            "total_amount": amount_to_npr(payment["amount_paisa"]),
            "transaction_uuid": payment["merchant_transaction_id"],
        })
        try:
            status, lookup = json_request(f"{config['status_url']}?{query}")
        except Exception:
            return redirect(frontend_url("verification-error", payment_id))
        if status == 200 and lookup.get("status") == "COMPLETE" and amount_to_paisa(lookup.get("total_amount")) == payment["amount_paisa"]:
            result = finalize_verified_payment(connection, payment, lookup.get("ref_id"))
        elif lookup.get("status") in {"CANCELED", "NOT_FOUND"}:
            now = iso_time(utc_now())
            connection.execute(
                "UPDATE PAYMENT SET status = 'CANCELLED', failure_reason = ?, updated_at = ? WHERE payment_id = ?",
                (lookup.get("status"), now, payment_id),
            )
            connection.execute(
                "UPDATE APPOINTMENT SET status = 'Cancelled', payment_status = 'CANCELLED' WHERE appointment_id = ?",
                (payment["appointment_id"],),
            )
            connection.commit()
            result = "cancelled"
        else:
            result = "pending"
        return redirect(frontend_url(result, payment_id))
    finally:
        connection.close()


@payments_bp.route("/payments/<int:payment_id>", methods=["GET"])
@user_required
def payment_status(payment_id):
    connection = get_db_connection()
    try:
        connection.execute("BEGIN IMMEDIATE")
        expire_payment_holds(connection)
        connection.commit()
        payment = connection.execute("SELECT * FROM PAYMENT WHERE payment_id = ? AND user_id = ?", (payment_id, current_user_id())).fetchone()
        if not payment:
            return jsonify({"error": "Payment not found"}), 404
        return jsonify({"payment": public_payment(payment)})
    finally:
        connection.close()


@payments_bp.route("/admin/payments", methods=["GET"])
@admin_required
def admin_payments():
    requested_status = request.args.get("status", "").strip().upper()
    connection = get_db_connection()
    try:
        params = []
        where = ""
        if requested_status:
            where = "WHERE p.status = ?"
            params.append(requested_status)
        rows = connection.execute(
            f"""
            SELECT p.*, u.name AS user_name, u.email AS user_email,
                   a.appointment_date, a.appointment_time, a.appointment_type,
                   d.name AS doctor_name
            FROM PAYMENT p
            JOIN USER u ON u.user_id = p.user_id
            JOIN APPOINTMENT a ON a.appointment_id = p.appointment_id
            JOIN DOCTOR d ON d.doctor_id = a.doctor_id
            {where}
            ORDER BY COALESCE(p.refund_requested_at, p.created_at) DESC
            """,
            params,
        ).fetchall()
        return jsonify({"payments": [dict(row) for row in rows]})
    finally:
        connection.close()


@payments_bp.route("/admin/payments/<int:payment_id>/refund", methods=["PATCH"])
@admin_required
def complete_manual_refund(payment_id):
    data = request.get_json(silent=True) or {}
    reference = str(data.get("refund_reference", "")).strip()
    note = str(data.get("admin_note", "")).strip()
    if not reference:
        return jsonify({"error": "Refund reference is required"}), 400
    connection = get_db_connection()
    try:
        now = iso_time(utc_now())
        cursor = connection.execute(
            "UPDATE PAYMENT SET status = 'REFUNDED', refunded_at = ?, refund_reference = ?, admin_note = ?, updated_at = ? WHERE payment_id = ? AND status = 'REFUND_REQUESTED'",
            (now, reference, note or None, now, payment_id),
        )
        if cursor.rowcount == 0:
            connection.rollback()
            return jsonify({"error": "Refund request not found or already completed"}), 409
        connection.execute("UPDATE APPOINTMENT SET payment_status = 'REFUNDED' WHERE appointment_id = (SELECT appointment_id FROM PAYMENT WHERE payment_id = ?)", (payment_id,))
        connection.commit()
        return jsonify({"message": "Refund marked complete", "payment_id": payment_id})
    finally:
        connection.close()
