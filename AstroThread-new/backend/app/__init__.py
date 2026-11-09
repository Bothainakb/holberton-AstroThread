
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def create_app():
    app = Flask(__name__)

    from app.routes.home import home_bp
    from app.routes.papers import papers_bp
    from app.routes.topics import topics_bp

    app.register_blueprint(home_bp)
    app.register_blueprint(topics_bp)
    app.register_blueprint(papers_bp)
    return app
