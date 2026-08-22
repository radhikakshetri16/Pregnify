import sqlite3
from pathlib import Path


# Get the directory where this file is located
BASE_DIR = Path(__file__).resolve().parent

# Database and schema paths
DATABASE_PATH = BASE_DIR / "pregnify.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"


def initialize_database():
    """Create the Pregnify database tables from schema.sql."""

    print("Initializing Pregnify database...")

    # Connect to SQLite database
    connection = sqlite3.connect(DATABASE_PATH)

    try:
        # Enable foreign key support
        connection.execute("PRAGMA foreign_keys = ON;")

        # Read schema.sql
        with open(SCHEMA_PATH, "r", encoding="utf-8") as schema_file:
            schema = schema_file.read()

        # Execute all SQL statements
        connection.executescript(schema)

        # Save changes
        connection.commit()

        print("Database initialized successfully.")
        print(f"Database location: {DATABASE_PATH}")

    except Exception as error:
        connection.rollback()
        print(f"Database initialization failed: {error}")

    finally:
        connection.close()


if __name__ == "__main__":
    initialize_database()