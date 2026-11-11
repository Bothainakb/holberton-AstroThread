import os  # التعامل مع متغيرات البيئة
from pathlib import Path  # التعامل مع مسارات الملفات

from dotenv import load_dotenv  # تحميل متغيرات البيئة من ملف .env
from flask import Flask  # استيراد Flask لإنشاء التطبيق

# تحميل ملف .env الموجود في المجلد الرئيسي للمشروع
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def create_app():
    app = Flask(__name__)  # إنشاء تطبيق Flask
    app.secret_key = os.getenv("SECRET_KEY")  # تعيين المفتاح السري لحماية الجلسات

    # استيراد مسارات التطبيق (Blueprints)
    from app.routes.auth import auth_bp
    from app.routes.home import home_bp
    from app.routes.papers import papers_bp
    from app.routes.topics import topics_bp

    # تسجيل المسارات داخل تطبيق Flask
    app.register_blueprint(auth_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(topics_bp)
    app.register_blueprint(papers_bp)

    return app  # إرجاع التطبيق بعد تجهيزه