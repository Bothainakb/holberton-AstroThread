from functools import wraps  # للحفاظ على اسم الدالة الأصلية عند استخدام المُزخرِف (decorator)

import psycopg  # الاتصال بقاعدة بيانات PostgreSQL
from flask import Blueprint, current_app, jsonify, request, session  # أدوات Flask

from app.db import get_connection  # دالة الاتصال بقاعدة البيانات
from app.routes.auth import error  # نفس دالة رسائل الخطأ المستخدمة في المصادقة

admin_bp = Blueprint("admin", __name__)  # إنشاء Blueprint خاص بلوحة تحكم المدير

ACCOUNT_STATUSES = ("active", "suspended")  # حالات الحساب المسموح بها

# صيغة التاريخ التي نرسلها للواجهة (مثل 2026-11-16T12:30:00)
TIME_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS'


def admin_required(view):
    # مُزخرِف يسمح فقط للمدير النشط باستخدام المسار
    @wraps(view)
    def wrapper(*args, **kwargs):
        user_id = session.get("user_id")  # رقم المستخدم المسجل دخوله
        if not user_id:
            return error("Sign in to use this feature.", 401)  # غير مسجل دخوله

        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    # نقرأ نوع الحساب وحالته من قاعدة البيانات في كل طلب
                    # حتى لا يبقى المدير الموقوف أو المحذوف قادراً على الدخول
                    cur.execute(
                        "SELECT account_type, status FROM users WHERE id = %s",
                        (user_id,),
                    )
                    user = cur.fetchone()  # جلب نوع الحساب وحالته
        except psycopg.Error:
            current_app.logger.exception("Checking the admin account failed")  # تسجيل خطأ قاعدة البيانات
            return error("Unable to check your account right now.", 500)

        # رفض أي حساب ليس مديراً نشطاً
        if user is None or user[0] != "admin" or user[1] != "active":
            return error("Only admins can use this feature.", 403)

        return view(*args, **kwargs)  # المستخدم مدير نشط: تنفيذ المسار
    return wrapper


def to_account(row):
    # تحويل صف من قاعدة البيانات إلى بيانات JSON للواجهة
    user_id, full_name, email, account_type, status, created_at = row
    return {
        "id": user_id,
        "fullName": full_name,
        "email": email,
        "accountType": account_type,
        "status": status,
        "createdAt": created_at,
    }


@admin_bp.get("/api/admin/users")  # عرض جميع الحسابات المؤكدة
@admin_required  # للمدير فقط
def list_users():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # الحسابات التي أكدت بريدها فقط (التسجيلات غير المكتملة لا تظهر)
                cur.execute(
                    f"""
                    SELECT id, full_name, email, account_type, status,
                           to_char(created_at, '{TIME_FORMAT}')
                    FROM users
                    WHERE email_verified_at IS NOT NULL
                    ORDER BY created_at DESC, id DESC
                    """
                )
                rows = cur.fetchall()  # جلب جميع الصفوف
    except psycopg.Error:
        current_app.logger.exception("Listing the accounts failed")  # تسجيل خطأ قاعدة البيانات
        return error("Unable to load the accounts right now. Please try again.", 500)

    return jsonify([to_account(row) for row in rows])  # إرجاع قائمة الحسابات


@admin_bp.patch("/api/admin/users/<int:user_id>/status")  # إيقاف حساب أو إعادة تفعيله
@admin_required  # للمدير فقط
def set_user_status(user_id):
    data = request.get_json(silent=True) or {}  # استقبال البيانات بصيغة JSON
    status = str(data.get("status", ""))  # الحالة الجديدة

    # التأكد من أن الحالة مسموح بها
    if status not in ACCOUNT_STATUSES:
        return error("Choose a valid status: active or suspended.", 400, "status")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # البحث عن الحساب المطلوب
                cur.execute("SELECT account_type FROM users WHERE id = %s", (user_id,))
                target = cur.fetchone()  # جلب نوع الحساب

                # الحساب غير موجود
                if target is None:
                    return error("Account not found.", 404)

                # لا يمكن إيقاف حسابات المدراء (ويشمل ذلك حساب المدير نفسه)
                if target[0] == "admin":
                    return error("Admin accounts can't be suspended.", 403)

                # تحديث الحالة وإرجاع بيانات الحساب بعد التعديل
                cur.execute(
                    f"""
                    UPDATE users SET status = %s WHERE id = %s
                    RETURNING id, full_name, email, account_type, status,
                              to_char(created_at, '{TIME_FORMAT}')
                    """,
                    (status, user_id),
                )
                row = cur.fetchone()  # بيانات الحساب بعد التحديث
    except psycopg.Error:
        current_app.logger.exception("Changing an account status failed")  # تسجيل خطأ قاعدة البيانات
        return error("Unable to change this account right now. Please try again.", 500)

    return jsonify(to_account(row))  # إرجاع الحساب بعد التعديل