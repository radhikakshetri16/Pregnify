from flask import Flask

app = Flask(__name__)


@app.route("/")
def home():
    return {
        "message": "Pregnify backend is running!",
        "status": "success"
    }


if __name__ == "__main__":
    app.run(debug=True)