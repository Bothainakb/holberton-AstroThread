import os  # التعامل مع متغيرات البيئة
from datetime import timedelta  # تحديد مدة صلاحية الجلسة
from pathlib import Path  # التعامل مع مسارات الملفات

from dotenv import load_dotenv 
from flask import Flask    

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def create_app():
    app = Flask(__name__)  # إنشاء تطبيق Flask
    app.secret_key = os.getenv("SECRET_KEY")  # تعيين المفتاح السري لحماية الجلسات

    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,  # منع JavaScript من قراءة الجلسة
        SESSION_COOKIE_SAMESITE="Lax",  # عدم إرسال الجلسة مع الطلبات القادمة من مواقع أخرى
        SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",  # عبر https فقط في الموقع الحقيقي
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),  # يبقى المستخدم مسجلاً دخوله 30 يوماً
    )

    from app.routes.admin import admin_bp  # مسارات لوحة تحكم المدير
    from app.routes.auth import auth_bp
    from app.routes.home import home_bp
    from app.routes.images import images_bp
    from app.routes.my_thread import my_thread_bp
    from app.routes.papers import papers_bp
    from app.routes.recent_searches import recent_searches_bp
    from app.routes.topics import topics_bp

    app.register_blueprint(admin_bp)  # تفعيل مسارات المدير
    app.register_blueprint(auth_bp)
    app.register_blueprint(home_bp)
    app.register_blueprint(images_bp)
    app.register_blueprint(my_thread_bp)
    app.register_blueprint(topics_bp)
    app.register_blueprint(papers_bp)
    app.register_blueprint(recent_searches_bp)

    return app  # إرجاع التطبيق بعد تجهيزه
