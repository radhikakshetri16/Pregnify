import sqlite3
import os
from pathlib import Path

DATABASE_PATH = Path(
    os.getenv("PREGNIFY_DATABASE_PATH", Path(__file__).resolve().parent / "pregnify.db")
)


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)

    # Return rows that behave like dictionaries
    connection.row_factory = sqlite3.Row

    # Enable foreign key constraints
    connection.execute("PRAGMA foreign_keys = ON")

    return connection


def ensure_payment_schema():
    """Apply the small, idempotent payment migration to existing databases."""
    connection = get_db_connection()
    try:
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
