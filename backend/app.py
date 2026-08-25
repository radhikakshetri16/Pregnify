from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth import auth_bp
from routes.pregnancy import pregnancy_bp
from routes.health import health_bp


app = Flask(__name__)

CORS(app)

app.register_blueprint(auth_bp)
app.register_blueprint(pregnancy_bp)
app.register_blueprint(health_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "Pregnify API is running"
    })


if __name__ == "__main__":
    app.run(debug=True)