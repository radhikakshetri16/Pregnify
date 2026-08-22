import sqlite3
from pathlib import Path


DATABASE_PATH = Path(__file__).resolve().parent / "pregnify.db"


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)

    # Return rows that behave like dictionaries
    connection.row_factory = sqlite3.Row

    # Enable foreign key constraints
    connection.execute("PRAGMA foreign_keys = ON")

    return connection