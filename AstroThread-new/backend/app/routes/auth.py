import os  # التعامل مع متغيرات البيئة
import re  # استخدام Regular Expressions للتحقق من البيانات
import secrets  # إجراء مقارنات آمنة للرموز السرية

import psycopg  # الاتصال بقاعدة بيانات PostgreSQL
from flask import Blueprint, current_app, jsonify, request, session  # أدوات Flask

from app.db import get_connection  # دالة الاتصال بقاعدة البيانات
from app.services import otp_service  # خدمة إنشاء والتحقق من رموز OTP
from app.services.email_service import send_otp_email  # خدمة إرسال البريد الإلكتروني

auth_bp = Blueprint("auth", __name__)  # إنشاء Blueprint خاص بالمصادقة

# تحديد شكل البريد الإلكتروني المقبول
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")

MIN_NAME_LENGTH = 2  # أقل عدد أحرف للاسم
MAX_NAME_LENGTH = 100  # أقصى عدد أحرف للاسم
MAX_EMAIL_LENGTH = 254  # أقصى طول للبريد الإلكتروني
ACCOUNT_TYPES = ("user", "admin")  # أنواع الحسابات المسموح بها


def error(message, status, field=None):
    body = {"error": message}  # إنشاء رسالة الخطأ
    if field:
        body["field"] = field  # تحديد الحقل الذي يحتوي على الخطأ
    return jsonify(body), status  # إرجاع الخطأ بصيغة JSON مع كود الحالة


def is_valid_invitation(code):
    expected = os.getenv("ADMIN_INVITATION_CODE", "")  # جلب رمز دعوة المدير من ملف البيئة
    if not expected:
        return False  # رفض الدعوة إذا لم يكن الرمز محدداً

    # مقارنة الرمزين بطريقة آمنة لتجنب هجمات توقيت المقارنة
    return secrets.compare_digest(code.upper().encode(), expected.upper().encode())


def validate_signup(full_name, email, account_type, invitation_code):
    # التحقق من الحد الأدنى لطول الاسم
    if len(full_name) < MIN_NAME_LENGTH:
        return "fullName", "Your name must be at least 2 characters."

    # التحقق من الحد الأقصى لطول الاسم
    if len(full_name) > MAX_NAME_LENGTH:
        return "fullName", "Your name must be 100 characters or fewer."

    # التحقق من صحة البريد الإلكتروني وطوله
    if len(email) > MAX_EMAIL_LENGTH or not EMAIL_PATTERN.match(email):
        return "email", "Enter a valid email address, such as name@example.com."

    # التأكد من أن نوع الحساب مسموح به
    if account_type not in ACCOUNT_TYPES:
        return "accountType", "Choose a valid account type."

    # التأكد من صحة رمز الدعوة عند التسجيل كمدير
    if account_type == "admin" and not is_valid_invitation(invitation_code):
        return "invitationCode", "This invitation code isn't valid. Check it and try again."

    return None  # جميع البيانات صحيحة


@auth_bp.post("/api/auth/signup")  # تحديد مسار إنشاء حساب جديد
def signup():
    data = request.get_json(silent=True) or {}  # استقبال البيانات بصيغة JSON

    # استخراج بيانات المستخدم وتنظيفها
    full_name = str(data.get("fullName", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    account_type = str(data.get("accountType", "user"))
    invitation_code = str(data.get("invitationCode", "")).strip()

    # التحقق من صحة بيانات التسجيل
    problem = validate_signup(full_name, email, account_type, invitation_code)
    if problem:
        field, message = problem  # استخراج اسم الحقل ورسالة الخطأ
        return error(message, 400, field)  # إرجاع خطأ في حال وجود بيانات غير صحيحة

    try:
        # فتح اتصال بقاعدة البيانات
        with get_connection() as conn:
            with conn.cursor() as cur:
                # البحث عن مستخدم لديه نفس البريد الإلكتروني
                cur.execute(
                    "SELECT id, email_verified_at FROM users WHERE email = %s",
                    (email,),
                )
                existing = cur.fetchone()  # جلب نتيجة البحث

                # رفض التسجيل إذا كان البريد مسجلاً ومؤكداً مسبقاً
                if existing and existing[1] is not None:
                    return error(
                        "An account with this email already exists. Sign in instead.",
                        409,
                        "email",
                    )

                if existing:
                    user_id = existing[0]  # الحصول على رقم المستخدم الموجود

                    # تحديث بيانات الحساب غير المؤكد
                    cur.execute(
                        "UPDATE users SET full_name = %s, account_type = %s WHERE id = %s",
                        (full_name, account_type, user_id),
                    )
                else:
                    # إنشاء مستخدم جديد وإرجاع رقمه التعريفي
                    cur.execute(
                        "INSERT INTO users (full_name, email, account_type) "
                        "VALUES (%s, %s, %s) RETURNING id",
                        (full_name, email, account_type),
                    )
                    user_id = cur.fetchone()[0]  # حفظ رقم المستخدم الجديد

                code = otp_service.create_otp(cur, user_id)  # إنشاء رمز تحقق جديد
                send_otp_email(email, code)  # إرسال رمز التحقق إلى البريد الإلكتروني

    except psycopg.Error:
        current_app.logger.exception("Sign up failed")  # تسجيل خطأ قاعدة البيانات
        return error("Unable to create your account right now. Please try again.", 500)

    except OSError:
        current_app.logger.exception("Sending the verification email failed")  # تسجيل خطأ إرسال البريد
        return error("We couldn't send the verification email. Please try again.", 502)

    return jsonify({"email": email}), 201  # إرجاع البريد الإلكتروني بعد نجاح التسجيل


@auth_bp.post("/api/auth/verify")  # تحديد مسار التحقق من رمز OTP
def verify():
    data = request.get_json(silent=True) or {}  # استقبال البيانات بصيغة JSON
    email = str(data.get("email", "")).strip().lower()  # استخراج البريد الإلكتروني
    code = str(data.get("code", "")).strip()  # استخراج رمز التحقق

    # التأكد من إدخال البريد الإلكتروني ورمز التحقق
    if not email or not code:
        return error("Enter the code we sent to your email.", 400, "code")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # البحث عن المستخدم باستخدام البريد الإلكتروني
                cur.execute(
                    "SELECT id, full_name, account_type FROM users WHERE email = %s",
                    (email,),
                )
                user = cur.fetchone()  # جلب بيانات المستخدم

                # رفض العملية إذا لم يتم العثور على المستخدم
                if user is None:
                    return error("This code isn't valid. Check it and try again.", 400, "code")

                user_id, full_name, account_type = user  # استخراج بيانات المستخدم

                # التحقق من صحة رمز OTP
                result = otp_service.verify_otp(cur, user_id, code)

                if result == "ok":
                    # تسجيل تاريخ تأكيد البريد الإلكتروني
                    cur.execute(
                        "UPDATE users SET email_verified_at = CURRENT_TIMESTAMP "
                        "WHERE id = %s AND email_verified_at IS NULL",
                        (user_id,),
                    )

    except psycopg.Error:
        current_app.logger.exception("Verifying the code failed")  # تسجيل خطأ قاعدة البيانات
        return error("Unable to check your code right now. Please try again.", 500)

    # التعامل مع حالات فشل التحقق المختلفة
    if result == "expired":
        return error("This code has expired. Request a new one.", 400, "code")

    if result == "too_many_attempts":
        return error("Too many wrong tries. Request a new code.", 429, "code")

    if result == "invalid":
        return error("This code isn't valid. Check it and try again.", 400, "code")

    session.clear()  # مسح بيانات الجلسة القديمة
    session["user_id"] = user_id  # حفظ رقم المستخدم في الجلسة لتسجيل دخوله

    # إرجاع بيانات المستخدم بعد نجاح التحقق وتسجيل الدخول
    return jsonify({
        "fullName": full_name,
        "email": email,
        "accountType": account_type
    })