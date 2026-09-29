import sqlite3
import os
from pathlib import Path

def get_database_path():
    return Path(
        os.getenv("PREGNIFY_DATABASE_PATH", Path(__file__).resolve().parent / "pregnify.db")
    )


def get_db_connection():
    connection = sqlite3.connect(get_database_path())

    # Return rows that behave like dictionaries
    connection.row_factory = sqlite3.Row

    # Enable foreign key constraints
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def ensure_payment_schema():
    """Apply the small, idempotent payment migration to existing databases."""
    connection = get_db_connection()
    try:
        tables = {
            row["name"]
            for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        }
        if "APPOINTMENT" in tables:
            appointment_columns = {
                row["name"]
                for row in connection.execute("PRAGMA table_info(APPOINTMENT)").fetchall()
            }
            if "payment_status" not in appointment_columns:
                connection.execute(
                    "ALTER TABLE APPOINTMENT ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED'"
                )


        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS PAYMENT (
                payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                provider TEXT NOT NULL CHECK (provider = 'ESEWA'),
                idempotency_key TEXT NOT NULL,
                merchant_transaction_id TEXT NOT NULL UNIQUE,
                provider_payment_id TEXT,
                provider_transaction_id TEXT,
                amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
                currency TEXT NOT NULL DEFAULT 'NPR',
                status TEXT NOT NULL DEFAULT 'INITIATED'
                    CHECK (status IN (
                        'INITIATED', 'PENDING', 'COMPLETED', 'FAILED',
                        'CANCELLED', 'EXPIRED', 'REFUND_REQUESTED', 'REFUNDED'
                    )),
                checkout_payload TEXT,
                failure_reason TEXT,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                verified_at TEXT,
                paid_at TEXT,
                refund_requested_at TEXT,
                refunded_at TEXT,
                refund_reference TEXT,
                admin_note TEXT,
                FOREIGN KEY (appointment_id) REFERENCES APPOINTMENT(appointment_id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
                UNIQUE(user_id, idempotency_key)
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_reference
            ON PAYMENT(provider, provider_payment_id)
            WHERE provider_payment_id IS NOT NULL;

            CREATE INDEX IF NOT EXISTS idx_payment_status_expiry
            ON PAYMENT(status, expires_at);
            """
        )
        connection.commit()
    finally:
        connection.close()


def ensure_auth_schema():
    """Apply password reset OTP schema to existing databases."""
    connection = get_db_connection()
    try:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS PASSWORD_RESET_OTP (
                reset_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                reset_token TEXT,
                expires_at DATETIME NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0,
                resend_count INTEGER NOT NULL DEFAULT 0,
                locked_until DATETIME,
                verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
                used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_password_reset_email
            ON PASSWORD_RESET_OTP(email);

            CREATE INDEX IF NOT EXISTS idx_password_reset_token
            ON PASSWORD_RESET_OTP(reset_token);
            """
        )
        # Check and apply migrations for missing columns in existing databases
        columns = [row["name"] for row in connection.execute("PRAGMA table_info(PASSWORD_RESET_OTP)").fetchall()]
        if "resend_count" not in columns:
            connection.execute("ALTER TABLE PASSWORD_RESET_OTP ADD COLUMN resend_count INTEGER NOT NULL DEFAULT 0")
        if "locked_until" not in columns:
            connection.execute("ALTER TABLE PASSWORD_RESET_OTP ADD COLUMN locked_until DATETIME")
        connection.commit()
    finally:
        connection.close()

