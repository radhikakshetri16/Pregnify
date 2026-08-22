from werkzeug.security import check_password_hash
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash

from database.db import get_db_connection


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Request body is required"
        }), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "error": "Name, email, and password are required"
        }), 400

    if len(password) < 6:
        return jsonify({
            "error": "Password must be at least 6 characters"
        }), 400

    connection = get_db_connection()

    try:
        existing_user = connection.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        if existing_user:
            return jsonify({
                "error": "Email is already registered"
            }), 409

        password_hash = generate_password_hash(password)

        cursor = connection.execute(
            """
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, password_hash, "patient")
        )

        connection.commit()

        return jsonify({
            "message": "Registration successful",
            "user": {
                "id": cursor.lastrowid,
                "name": name,
                "email": email,
                "role": "patient"
            }
        }), 201

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
            SELECT id, name, email, password_hash, role
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        if not user:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        if not check_password_hash(user["password_hash"], password):
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        return jsonify({
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        }), 200

    finally:
        connection.close()