import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parent / "pregnify.db"


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)

    # Return rows that behave like dictionaries
    connection.row_factory = sqlite3.Row

    # Enable foreign key constraints
    connection.execute("PRAGMA foreign_keys = ON")

    # These tables were introduced for admin-managed, date-specific doctor
    # availability. Create them lazily as well so an existing installation
    # starts serving the new schedule immediately after the code is updated.
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS DOCTOR_SCHEDULE (
            schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
            is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
            FOREIGN KEY (doctor_id) REFERENCES DOCTOR(doctor_id) ON DELETE CASCADE,
            UNIQUE(doctor_id, day_of_week)
        );
        CREATE TABLE IF NOT EXISTS DOCTOR_AVAILABLE_DATE (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_id INTEGER NOT NULL,
            available_date DATE NOT NULL,
            time_slots TEXT NOT NULL,
            FOREIGN KEY (doctor_id) REFERENCES DOCTOR(doctor_id) ON DELETE CASCADE,
            UNIQUE(doctor_id, available_date)
        );
        """
    )
    connection.commit()

    # Keep databases created with the earlier appointment schema compatible
    # with doctor-linked bookings without requiring a destructive reset.
    appointment_columns = {
        row[1] for row in connection.execute("PRAGMA table_info(PREGNANCY_APPOINTMENT)")
    }
    changed = False
    if appointment_columns and "doctor_id" not in appointment_columns:
        connection.execute(
            "ALTER TABLE PREGNANCY_APPOINTMENT ADD COLUMN doctor_id INTEGER"
        )
        changed = True
    if appointment_columns and "central_appointment_id" not in appointment_columns:
        connection.execute(
            "ALTER TABLE PREGNANCY_APPOINTMENT ADD COLUMN central_appointment_id INTEGER"
        )
        changed = True
    if appointment_columns and "central_appointment_id" not in appointment_columns:
        connection.execute(
            "ALTER TABLE PREGNANCY_APPOINTMENT ADD COLUMN central_appointment_id INTEGER"
        )
        changed = True
    if changed:
        connection.commit()

    central_columns = {
        row[1] for row in connection.execute("PRAGMA table_info(APPOINTMENT)")
    }
    extra_central = [
        ("diagnosis", "TEXT"),
        ("tests_recommended", "TEXT"),
        ("follow_up_date", "DATE"),
        ("next_appointment", "TEXT"),
    ]
    central_changed = False
    for column_name, column_type in extra_central:
        if central_columns and column_name not in central_columns:
            connection.execute(
                f"ALTER TABLE APPOINTMENT ADD COLUMN {column_name} {column_type}"
            )
            central_changed = True
    if central_changed:
        connection.commit()

    return connection
