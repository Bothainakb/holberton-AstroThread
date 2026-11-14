import os  # التعامل مع متغيرات البيئة
from datetime import timedelta
from pathlib import Path  # التعامل مع مسارات الملفات

from dotenv import load_dotenv  # تحميل متغيرات البيئة من ملف .env
from flask import Flask  # استيراد Flask لإنشاء التطبيق

# تحميل ملف .env الموجود في المجلد الرئيسي للمشروع
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def create_app():
    app = Flask(__name__)  # إنشاء تطبيق Flask
    app.secret_key = os.getenv("SECRET_KEY")  # تعيين المفتاح السري لحماية الجلسات

    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    )

    from app.routes.auth import auth_bp
    from app.routes.home import home_bp
    from app.routes.images import images_bp
    from app.routes.papers import papers_bp
    from app.routes.topics import topics_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(images_bp)
    app.register_blueprint(topics_bp)
    app.register_blueprint(papers_bp)

    return app  # إرجاع التطبيق بعد تجهيزه
