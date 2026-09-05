from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.pregnancy import pregnancy_bp
from routes.health import health_bp
from routes.doctor import doctor_bp
from routes.admin import admin_bp
from routes.medical_history import medical_history_bp
from routes.medicines import medicines_bp
from routes.reports import reports_bp
from routes.settings import settings_bp


app = Flask(__name__)

CORS(app)

app.register_blueprint(auth_bp)
app.register_blueprint(pregnancy_bp)
app.register_blueprint(health_bp)
app.register_blueprint(doctor_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(medical_history_bp)
app.register_blueprint(medicines_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(settings_bp)

@app.route("/")
def home():
    return jsonify({
        "message": "Pregnify API is running"
    })


if __name__ == "__main__":
    app.run(debug=True)