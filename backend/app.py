from flask import Flask, jsonify

from routes.auth import auth_bp


app = Flask(__name__)

app.register_blueprint(auth_bp)


@app.route("/")
def home():
    return jsonify({
        "message": "Pregnify API is running"
    })


if __name__ == "__main__":
    app.run(debug=True)