from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.health import health_bp
from routes.appointments import appointments_bp


app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register API blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(health_bp)
app.register_blueprint(appointments_bp)


@app.route("/")
def home():
    return jsonify({
        "status": "online",
        "message": "Pregnify Flask API is running with SQLite backend",
        "endpoints": [
            "/api/profile",
            "/api/health/logs",
            "/api/appointments",
            "/api/auth/login",
            "/api/auth/register"
        ]
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)