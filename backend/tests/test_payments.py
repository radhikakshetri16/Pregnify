import os
import base64
import json
import sqlite3
import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from werkzeug.security import generate_password_hash


TEST_DIR = tempfile.TemporaryDirectory()
TEST_DATABASE = Path(TEST_DIR.name) / "pregnify-test.db"
os.environ["PREGNIFY_DATABASE_PATH"] = str(TEST_DATABASE)
os.environ["PAYMENT_ENV"] = "sandbox"
os.environ["ESEWA_SECRET_KEY"] = "8gBm/:&EnhH.1/q"

_schema = (Path(__file__).parents[1] / "database" / "schema.sql").read_text(encoding="utf-8")
_connection = sqlite3.connect(TEST_DATABASE)
_connection.executescript(_schema)
_connection.close()

from app import app  # noqa: E402
from routes.payments import amount_to_paisa, esewa_signature  # noqa: E402


class PaymentFlowTests(unittest.TestCase):
    def setUp(self):
        if TEST_DATABASE.exists():
            TEST_DATABASE.unlink()
        connection = sqlite3.connect(TEST_DATABASE)
        connection.executescript(_schema)
        user = connection.execute(
            "INSERT INTO USER(name,email,password,age,gender,phone) VALUES(?,?,?,?,?,?)",
            ("Test User", "user@test.local", generate_password_hash("Pass1!"), 25, "Female", "9800000000"),
        )
        self.user_id = user.lastrowid
        connection.execute(
            "INSERT INTO PATIENT(user_id,name,age,gender,phone,relationship_type) VALUES(?,?,?,?,?,?)",
            (self.user_id, "Test User", 25, "Female", "9800000000", "Self"),
        )
        doctor = connection.execute(
            """
            INSERT INTO DOCTOR(name,email,password,specialization,nmc_number,experience,practice_at,consultation_fee,status)
            VALUES(?,?,?,?,?,?,?,?,?)
            """,
            ("Test Doctor", "doctor@test.local", generate_password_hash("Pass1!"), "OB/GYN", "NMC-T", 5, "Clinic", 750.50, "Active"),
        )
        self.doctor_id = doctor.lastrowid
        self.appointment_date = (date.today() + timedelta(days=1)).isoformat()
        connection.execute(
            "INSERT INTO DOCTOR_AVAILABLE_DATE(doctor_id,available_date,time_slots) VALUES(?,?,?)",
            (self.doctor_id, self.appointment_date, '["10:00 AM"]'),
        )
        connection.execute(
            "INSERT INTO ADMIN(name,email,password) VALUES(?,?,?)",
            ("Admin", "admin@test.local", generate_password_hash("Pass1!")),
        )
        connection.commit()
        connection.close()
        self.client = app.test_client()

    def login_user(self):
        response = self.client.post(
            "/api/auth/login", json={"email": "user@test.local", "password": "Pass1!"}
        )
        self.assertEqual(response.status_code, 200)

    def payment_payload(self, provider="ESEWA"):
        return {
            "provider": provider,
            "idempotency_key": f"idem-{provider.lower()}",
            "doctor_id": self.doctor_id,
            "appointment_date": self.appointment_date,
            "appointment_time": "10:00 AM",
            "appointment_type": "Routine check-up",
        }

    def test_payment_requires_authenticated_session(self):
        response = self.client.post("/api/payments/initiate", json=self.payment_payload())
        self.assertEqual(response.status_code, 401)

    def test_payment_provider_status_includes_sandbox_credentials(self):
        response = self.client.get("/api/payments/providers")
        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["environment"], "sandbox")
        self.assertTrue(body["providers"]["ESEWA"]["enabled"])
        self.assertEqual(
            body["providers"]["ESEWA"]["test_credentials"]["mpin"], "1122"
        )
        self.assertEqual(set(body["providers"]), {"ESEWA"})

    def test_esewa_uses_server_fee_and_is_idempotent(self):
        self.login_user()
        response = self.client.post("/api/payments/initiate", json=self.payment_payload())
        self.assertEqual(response.status_code, 201)
        body = response.get_json()
        self.assertEqual(body["checkout_type"], "form")
        self.assertEqual(body["payment"]["amount_paisa"], 75050)
        repeated = self.client.post("/api/payments/initiate", json=self.payment_payload())
        self.assertEqual(repeated.status_code, 200)
        self.assertEqual(repeated.get_json()["payment"]["payment_id"], body["payment"]["payment_id"])
        self.assertEqual(self.client.get("/api/appointments").get_json()["appointments"], [])

    def test_non_esewa_provider_is_rejected(self):
        self.login_user()
        response = self.client.post("/api/payments/initiate", json=self.payment_payload("OTHER"))
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Only eSewa payments are supported")

    def test_paid_cancellation_enters_admin_refund_queue(self):
        self.login_user()
        payment = self.client.post("/api/payments/initiate", json=self.payment_payload()).get_json()["payment"]
        connection = sqlite3.connect(TEST_DATABASE)
        connection.execute("UPDATE PAYMENT SET status = 'COMPLETED' WHERE payment_id = ?", (payment["payment_id"],))
        connection.execute("UPDATE APPOINTMENT SET payment_status = 'PAID' WHERE appointment_id = ?", (payment["appointment_id"],))
        connection.commit()
        connection.close()
        response = self.client.delete(f"/api/appointments/{payment['appointment_id']}")
        self.assertTrue(response.get_json()["refund_requested"])

        admin = app.test_client()
        admin.post("/api/admin/login", json={"email": "admin@test.local", "password": "Pass1!"})
        queue = admin.get("/api/admin/payments?status=REFUND_REQUESTED")
        self.assertEqual(queue.status_code, 200)
        self.assertEqual(len(queue.get_json()["payments"]), 1)

    @patch("routes.payments.json_request")
    def test_esewa_callback_requires_signature_and_provider_lookup(self, provider_request):
        self.login_user()
        initiated = self.client.post("/api/payments/initiate", json=self.payment_payload()).get_json()
        fields = initiated["form_fields"]
        response = {
            "transaction_code": "ESEWA-REF-1",
            "status": "COMPLETE",
            "total_amount": fields["total_amount"],
            "transaction_uuid": fields["transaction_uuid"],
            "product_code": fields["product_code"],
            "signed_field_names": "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
        }
        response["signature"] = esewa_signature(
            response, response["signed_field_names"], "8gBm/:&EnhH.1/q"
        )
        encoded = base64.b64encode(json.dumps(response).encode()).decode()
        provider_request.return_value = (
            200,
            {"status": "COMPLETE", "total_amount": fields["total_amount"], "ref_id": "ESEWA-REF-1"},
        )
        callback = self.client.get(
            "/api/payments/esewa/callback",
            query_string={"payment_id": initiated["payment"]["payment_id"], "data": encoded},
        )
        self.assertEqual(callback.status_code, 302)
        self.assertIn("payment=success", callback.location)
        appointments = self.client.get("/api/appointments").get_json()["appointments"]
        self.assertEqual(appointments[0]["payment_status"], "PAID")

    def test_tampered_esewa_callback_does_not_confirm_booking(self):
        self.login_user()
        initiated = self.client.post("/api/payments/initiate", json=self.payment_payload()).get_json()
        response = {
            "transaction_code": "FAKE",
            "status": "COMPLETE",
            "total_amount": "1.00",
            "transaction_uuid": initiated["form_fields"]["transaction_uuid"],
            "product_code": "EPAYTEST",
            "signed_field_names": "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
            "signature": "tampered",
        }
        encoded = base64.b64encode(json.dumps(response).encode()).decode()
        callback = self.client.get(
            "/api/payments/esewa/callback",
            query_string={"payment_id": initiated["payment"]["payment_id"], "data": encoded},
        )
        self.assertIn("payment=invalid", callback.location)
        self.assertEqual(self.client.get("/api/appointments").get_json()["appointments"], [])

    def test_amount_and_esewa_signature_helpers(self):
        self.assertEqual(amount_to_paisa("10.01"), 1001)
        fields = {"total_amount": "100", "transaction_uuid": "11-201-13", "product_code": "EPAYTEST"}
        self.assertEqual(
            esewa_signature(fields, "total_amount,transaction_uuid,product_code", "8gBm/:&EnhH.1/q"),
            "5DZywcrTKD0gia/rsSMcrRHmJl+4Tbol6S+lWgdJ94E=",
        )


if __name__ == "__main__":
    unittest.main()
