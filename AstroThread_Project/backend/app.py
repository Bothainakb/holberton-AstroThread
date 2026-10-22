
import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=True)
app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY") or None
app.config.update(
    SESSION_COOKIE_NAME="astrothread_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "").lower() == "true",
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
)

CORS(app)

from app.api.v1.auth import auth_bp
from app.api.v1.static import static_bp
from app.api.v1.threads import threads_bp

app.register_blueprint(auth_bp)
app.register_blueprint(static_bp)
app.register_blueprint(threads_bp)


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000)
