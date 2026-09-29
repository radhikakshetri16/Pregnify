import os
import sqlite3
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from werkzeug.security import generate_password_hash, check_password_hash

TEST_DIR = tempfile.TemporaryDirectory()
TEST_DATABASE = Path(TEST_DIR.name) / "pregnify-test-auth.db"
os.environ["PREGNIFY_DATABASE_PATH"] = str(TEST_DATABASE)
os.environ["MAIL_SERVER"] = "smtp.gmail.com"
os.environ["MAIL_PORT"] = "587"
os.environ["MAIL_USE_TLS"] = "true"
os.environ["MAIL_USERNAME"] = "test@gmail.com"
os.environ["MAIL_PASSWORD"] = "test-app-pass"

_schema = (Path(__file__).parents[1] / "database" / "schema.sql").read_text(encoding="utf-8")

from app import app
from database.db import get_db_connection


class PasswordResetFlowTests(unittest.TestCase):
    def setUp(self):
        os.environ["PREGNIFY_DATABASE_PATH"] = str(TEST_DATABASE)
        if TEST_DATABASE.exists():
            TEST_DATABASE.unlink()
        connection = sqlite3.connect(TEST_DATABASE)
        connection.executescript(_schema)
        
        # Insert test user
        self.user_email = "testuser@gmail.com"
        self.old_password = "OldPassword123!"
        self.user_name = "Test Mother"
        user = connection.execute(
            """
            INSERT INTO USER(name, email, password, age, gender, phone)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (self.user_name, self.user_email, generate_password_hash(self.old_password), 26, "Female", "9811111111")
        )
        self.user_id = user.lastrowid
        connection.commit()
        connection.close()

        self.client = app.test_client()

    def test_forgot_password_unregistered_email(self):
        """Unregistered email returns 404."""
        response = self.client.post(
            "/api/auth/forgot-password",
            json={"email": "unknown@example.com"}
        )
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertIn("error", data)

    @patch("routes.auth.send_password_reset_otp_email")
    def test_forgot_password_success(self, mock_send_email):
        """Registered email generates OTP, saves hashed in DB, and sends email."""
        mock_send_email.return_value = True

        response = self.client.post(
            "/api/auth/forgot-password",
            json={"email": self.user_email}
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["email"], self.user_email)

        # Check mock called
        mock_send_email.assert_called_once()
        args, kwargs = mock_send_email.call_args
        to_email = kwargs.get("to_email") or args[0]
        user_name = kwargs.get("user_name") or args[1]
        otp_code = kwargs.get("otp_code") or args[2]

        self.assertEqual(to_email, self.user_email)
        self.assertEqual(user_name, self.user_name)
        self.assertEqual(len(otp_code), 6)
        self.assertTrue(otp_code.isdigit())

        # Verify DB entry
        conn = get_db_connection()
        record = conn.execute(
            "SELECT * FROM PASSWORD_RESET_OTP WHERE email = ?", (self.user_email,)
        ).fetchone()
        conn.close()

        self.assertIsNotNone(record)
        self.assertTrue(check_password_hash(record["otp_hash"], otp_code))
        self.assertEqual(record["verified"], 0)
        self.assertEqual(record["used"], 0)
        self.assertEqual(record["attempts"], 0)

    @patch("routes.auth.send_password_reset_otp_email")
    def test_forgot_password_cooldown(self, mock_send_email):
        """Immediate second request triggers cooldown rate limit (429)."""
        mock_send_email.return_value = True

        res1 = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res1.status_code, 200)

        res2 = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res2.status_code, 429)
        self.assertIn("wait", res2.get_json()["error"])

    @patch("routes.auth.send_password_reset_otp_email")
    def test_verify_otp_wrong_code_and_lockout(self, mock_send_email):
        """Incorrect OTP increments attempts and locks out after 5 failures."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})

        # Try wrong OTP 4 times
        for i in range(1, 5):
            res = self.client.post(
                "/api/auth/verify-reset-otp",
                json={"email": self.user_email, "otp": "000000"}
            )
            self.assertEqual(res.status_code, 400)
            self.assertIn(f"{5 - i} attempt", res.get_json()["error"])

        # 5th failed attempt triggers maximum attempts reached
        res5 = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": "000000"}
        )
        self.assertEqual(res5.status_code, 400)
        self.assertIn("maximum", res5.get_json()["error"].lower())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_verify_otp_expired(self, mock_send_email):
        """Expired OTP is rejected."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # Manually expire in DB
        conn = get_db_connection()
        past_time = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        res = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": otp}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.get_json()["error"].lower())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_resend_otp_invalidates_previous(self, mock_send_email):
        """Resending OTP creates a fresh OTP and invalidates previous OTP."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        first_otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # Age the first OTP record so cooldown passes
        conn = get_db_connection()
        past_created = (datetime.now(timezone.utc) - timedelta(seconds=35)).isoformat()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET created_at = ? WHERE email = ?", (past_created, self.user_email))
        conn.commit()
        conn.close()

        # Resend OTP
        res = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res.status_code, 200)
        second_otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # Trying old first OTP should fail
        res_old = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": first_otp}
        )
        if first_otp != second_otp:
            self.assertEqual(res_old.status_code, 400)

        # Trying second OTP succeeds
        res_new = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": second_otp}
        )
        self.assertEqual(res_new.status_code, 200)
        self.assertIn("reset_token", res_new.get_json())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_complete_reset_flow_and_login(self, mock_send_email):
        """End-to-end: Request OTP -> Verify OTP -> Reset Password -> Login with new password."""
        mock_send_email.return_value = True

        # 1. Request OTP
        res_req = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res_req.status_code, 200)
        otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # 2. Verify OTP
        res_ver = self.client.post("/api/auth/verify-reset-otp", json={"email": self.user_email, "otp": otp})
        self.assertEqual(res_ver.status_code, 200)
        reset_token = res_ver.get_json()["reset_token"]
        self.assertTrue(bool(reset_token))

        # 3. Validation failure tests on reset password
        # Weak password (no number / special char)
        res_weak = self.client.post(
            "/api/auth/reset-password",
            json={
                "email": self.user_email,
                "reset_token": reset_token,
                "new_password": "weakpassword",
                "confirm_password": "weakpassword"
            }
        )
        self.assertEqual(res_weak.status_code, 400)
        self.assertIn("error", res_weak.get_json())

        # Mismatch
        res_mismatch = self.client.post(
            "/api/auth/reset-password",
            json={
                "email": self.user_email,
                "reset_token": reset_token,
                "new_password": "NewStrongPassword123!",
                "confirm_password": "DifferentPassword123!"
            }
        )
        self.assertEqual(res_mismatch.status_code, 400)

        # 4. Valid Reset Password
        new_pw = "BrandNewPassword2026!"
        res_reset = self.client.post(
            "/api/auth/reset-password",
            json={
                "email": self.user_email,
                "reset_token": reset_token,
                "new_password": new_pw,
                "confirm_password": new_pw
            }
        )
        self.assertEqual(res_reset.status_code, 200)
        self.assertIn("successfully", res_reset.get_json()["message"].lower())

        # 5. Token reuse fails
        res_reuse = self.client.post(
            "/api/auth/reset-password",
            json={
                "email": self.user_email,
                "reset_token": reset_token,
                "new_password": new_pw,
                "confirm_password": new_pw
            }
        )
        self.assertEqual(res_reuse.status_code, 400)

        # 6. Login with old password fails
        res_old_login = self.client.post(
            "/api/auth/login",
            json={"email": self.user_email, "password": self.old_password}
        )
        self.assertEqual(res_old_login.status_code, 401)

        # 7. Login with new password succeeds
        res_new_login = self.client.post(
            "/api/auth/login",
            json={"email": self.user_email, "password": new_pw}
        )
        self.assertEqual(res_new_login.status_code, 200)
        self.assertEqual(res_new_login.get_json()["user"]["email"], self.user_email)


if __name__ == "__main__":
    unittest.main()
