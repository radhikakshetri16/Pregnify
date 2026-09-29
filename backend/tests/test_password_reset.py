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
        """Registered email generates 1-minute OTP, saves in DB, and sends email."""
        mock_send_email.return_value = True

        response = self.client.post(
            "/api/auth/forgot-password",
            json={"email": self.user_email}
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["email"], self.user_email)
        self.assertEqual(data["resends_remaining"], 2)

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

        # Verify DB entry and exact 1-minute expiry
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
        self.assertEqual(record["resend_count"], 0)
        self.assertIsNone(record["locked_until"])

        # Check expiry is approximately 60 seconds from creation
        created_at = datetime.fromisoformat(record["created_at"])
        expires_at = datetime.fromisoformat(record["expires_at"])
        delta_seconds = (expires_at - created_at).total_seconds()
        self.assertAlmostEqual(delta_seconds, 60, delta=2)

    @patch("routes.auth.send_password_reset_otp_email")
    def test_cannot_resend_before_current_otp_expires(self, mock_send_email):
        """Resend is rejected while the 1-minute OTP is still active."""
        mock_send_email.return_value = True

        res1 = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res1.status_code, 200)

        # Attempt immediate resend via resend endpoint
        res2 = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("wait until the current otp expires", res2.get_json()["error"].lower())

        # Attempt immediate request via forgot-password endpoint
        res3 = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res3.status_code, 400)
        self.assertIn("wait until the current otp expires", res3.get_json()["error"].lower())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_resend_allowed_after_expiry_and_invalidates_previous(self, mock_send_email):
        """After 1-minute expiry, user can resend OTP. Previous OTP is invalidated."""
        mock_send_email.return_value = True

        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        first_otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # Simulate 1 minute expiry
        conn = get_db_connection()
        past_time = (datetime.now(timezone.utc) - timedelta(seconds=65)).isoformat()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        # Resend OTP
        res_resend = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res_resend.status_code, 200)
        data = res_resend.get_json()
        self.assertEqual(data["resends_remaining"], 1)
        second_otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # Old OTP must not work
        res_old = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": first_otp}
        )
        if first_otp != second_otp:
            self.assertEqual(res_old.status_code, 400)

        # New OTP works
        res_new = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": second_otp}
        )
        self.assertEqual(res_new.status_code, 200)
        self.assertIn("reset_token", res_new.get_json())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_maximum_2_resends_enforced(self, mock_send_email):
        """User can resend an OTP a maximum of 2 times only (Initial + Resend 1 + Resend 2). Resend 3 blocked."""
        mock_send_email.return_value = True

        # Initial OTP
        res0 = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res0.status_code, 200)
        self.assertEqual(res0.get_json()["resends_remaining"], 2)

        # Expire and Resend #1
        conn = get_db_connection()
        past_time = (datetime.now(timezone.utc) - timedelta(seconds=65)).isoformat()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        res1 = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.get_json()["resends_remaining"], 1)

        # Expire and Resend #2
        conn = get_db_connection()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        res2 = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.get_json()["resends_remaining"], 0)

        # Expire and attempt Resend #3 -> Rejected
        conn = get_db_connection()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        res3 = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res3.status_code, 400)
        self.assertIn("maximum otp resend limit", res3.get_json()["error"].lower())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_verify_otp_wrong_code_and_24h_lockout(self, mock_send_email):
        """2 incorrect OTP verification attempts triggers 24-hour lockout."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})

        # Attempt 1: Wrong OTP -> 1 attempt remaining
        res1 = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": "000000"}
        )
        self.assertEqual(res1.status_code, 400)
        self.assertEqual(res1.get_json()["error"], "Invalid OTP. 1 attempt remaining.")

        # Attempt 2: Wrong OTP -> 24-hour lockout!
        res2 = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": "000000"}
        )
        self.assertEqual(res2.status_code, 400)
        self.assertIn("locked for 24 hours", res2.get_json()["error"].lower())

        # Verify DB reflects lockout
        conn = get_db_connection()
        record = conn.execute("SELECT * FROM PASSWORD_RESET_OTP WHERE email = ?", (self.user_email,)).fetchone()
        conn.close()
        self.assertEqual(record["used"], 1)
        self.assertEqual(record["attempts"], 2)
        self.assertIsNotNone(record["locked_until"])

    @patch("routes.auth.send_password_reset_otp_email")
    def test_lockout_blocks_all_password_reset_operations(self, mock_send_email):
        """During the 24-hour lock period, all password reset endpoints are blocked."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})

        # Trigger 24-hour lock with 2 wrong attempts
        self.client.post("/api/auth/verify-reset-otp", json={"email": self.user_email, "otp": "000000"})
        self.client.post("/api/auth/verify-reset-otp", json={"email": self.user_email, "otp": "000000"})

        # Try /forgot-password
        res_forgot = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res_forgot.status_code, 403)
        self.assertIn("temporarily locked", res_forgot.get_json()["error"].lower())

        # Try /verify-reset-otp
        res_verify = self.client.post("/api/auth/verify-reset-otp", json={"email": self.user_email, "otp": "123456"})
        self.assertEqual(res_verify.status_code, 403)
        self.assertIn("temporarily locked", res_verify.get_json()["error"].lower())

        # Try /resend-reset-otp
        res_resend = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res_resend.status_code, 403)
        self.assertIn("temporarily locked", res_resend.get_json()["error"].lower())

        # Try /reset-password
        res_reset = self.client.post(
            "/api/auth/reset-password",
            json={
                "email": self.user_email,
                "reset_token": "fake-token",
                "new_password": "NewPassword123!",
                "confirm_password": "NewPassword123!"
            }
        )
        self.assertEqual(res_reset.status_code, 403)
        self.assertIn("temporarily locked", res_reset.get_json()["error"].lower())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_failed_attempts_carried_across_resends(self, mock_send_email):
        """Failed attempts persist across OTP resends and cannot be bypassed by requesting a new OTP."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})

        # 1st wrong attempt on initial OTP
        res1 = self.client.post("/api/auth/verify-reset-otp", json={"email": self.user_email, "otp": "000000"})
        self.assertEqual(res1.status_code, 400)
        self.assertEqual(res1.get_json()["error"], "Invalid OTP. 1 attempt remaining.")

        # Expire OTP and resend
        conn = get_db_connection()
        past_time = (datetime.now(timezone.utc) - timedelta(seconds=65)).isoformat()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        res_resend = self.client.post("/api/auth/resend-reset-otp", json={"email": self.user_email})
        self.assertEqual(res_resend.status_code, 200)

        # 1st wrong attempt on resent OTP is the 2nd overall wrong attempt -> Locks for 24 hours!
        res2 = self.client.post("/api/auth/verify-reset-otp", json={"email": self.user_email, "otp": "000000"})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("locked for 24 hours", res2.get_json()["error"].lower())

    @patch("routes.auth.send_password_reset_otp_email")
    def test_verify_otp_expired(self, mock_send_email):
        """Expired OTP is rejected with 'OTP has expired. Please request a new OTP.' and does not count as wrong attempt."""
        mock_send_email.return_value = True
        self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # Manually expire in DB (past 60s)
        conn = get_db_connection()
        past_time = (datetime.now(timezone.utc) - timedelta(seconds=70)).isoformat()
        conn.execute("UPDATE PASSWORD_RESET_OTP SET expires_at = ? WHERE email = ?", (past_time, self.user_email))
        conn.commit()
        conn.close()

        res = self.client.post(
            "/api/auth/verify-reset-otp",
            json={"email": self.user_email, "otp": otp}
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["error"], "OTP has expired. Please request a new OTP.")

        # Ensure failed attempt was NOT incremented to 1
        conn = get_db_connection()
        record = conn.execute("SELECT * FROM PASSWORD_RESET_OTP WHERE email = ?", (self.user_email,)).fetchone()
        conn.close()
        self.assertEqual(record["attempts"], 0)

    @patch("routes.auth.send_password_reset_otp_email")
    def test_complete_reset_flow_and_login(self, mock_send_email):
        """End-to-end: Request OTP -> Verify OTP within 1 min -> Reset Password -> Login with new password."""
        mock_send_email.return_value = True

        # 1. Request OTP
        res_req = self.client.post("/api/auth/forgot-password", json={"email": self.user_email})
        self.assertEqual(res_req.status_code, 200)
        otp = mock_send_email.call_args[1].get("otp_code") or mock_send_email.call_args[0][2]

        # 2. Verify OTP within 1 minute
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
