from functools import wraps

from flask import jsonify, session


def current_user_id():
    return session.get("user_id") if session.get("role") == "user" else None


def current_admin_id():
    return session.get("admin_id") if session.get("role") == "admin" else None


def user_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user_id():
            return jsonify({"error": "Authentication required"}), 401
        return view(*args, **kwargs)

    return wrapped


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_admin_id():
            return jsonify({"error": "Admin authentication required"}), 401
        return view(*args, **kwargs)

    return wrapped
