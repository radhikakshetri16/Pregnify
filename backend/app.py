import os

from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.pregnancy import pregnancy_bp
from routes.health import health_bp
from routes.doctor import doctor_bp
from routes.admin import admin_bp
from routes.care import care_bp
from routes.medical_history import medical_history_bp
from routes.medicines import medicines_bp
from routes.reports import reports_bp
from routes.settings import settings_bp
from routes.payments import payments_bp
from database.db import ensure_payment_schema


app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("FLASK_SECRET_KEY", "pregnify-dev-change-me"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("COOKIE_SECURE", "false").lower() == "true",
)

CORS(
    app,
    origins=[os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")],
    supports_credentials=True,
)

ensure_payment_schema()

app.register_blueprint(auth_bp)
app.register_blueprint(pregnancy_bp)
app.register_blueprint(health_bp)
app.register_blueprint(doctor_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(care_bp)
app.register_blueprint(medical_history_bp)
app.register_blueprint(medicines_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(payments_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "Pregnify API is running"
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
