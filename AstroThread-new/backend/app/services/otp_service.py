import secrets  # إنشاء أرقام عشوائية آمنة

from werkzeug.security import check_password_hash, generate_password_hash  # تشفير الرمز والتحقق منه

CODE_LENGTH = 6  # طول رمز التحقق
EXPIRY_MINUTES = 10  # مدة صلاحية الرمز بالدقائق
MAX_ATTEMPTS = 5  # الحد الأقصى لمحاولات إدخال الرمز


def generate_code():
    # إنشاء رمز تحقق عشوائي مكون من 6 أرقام
    return f"{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}"


def create_otp(cur, user_id):
    code = generate_code()  # إنشاء رمز تحقق جديد

    # إلغاء أي رموز تحقق سابقة غير مستخدمة للمستخدم
    cur.execute(
        "UPDATE otp_codes SET used_at = CURRENT_TIMESTAMP "
        "WHERE user_id = %s AND used_at IS NULL",
        (user_id,),
    )

    # حفظ الرمز المشفر في قاعدة البيانات مع تحديد وقت انتهاء صلاحيته
    cur.execute(
        "INSERT INTO otp_codes (user_id, code_hash, expires_at) "
        "VALUES (%s, %s, CURRENT_TIMESTAMP + %s * INTERVAL '1 minute')",
        (user_id, generate_password_hash(code), EXPIRY_MINUTES),
    )

    return code  # إرجاع الرمز لإرساله إلى المستخدم


def verify_otp(cur, user_id, code):
    # البحث عن أحدث رمز صالح وغير مستخدم لهذا المستخدم
    cur.execute(
        "SELECT id, code_hash, attempts FROM otp_codes "
        "WHERE user_id = %s AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP "
        "ORDER BY id DESC LIMIT 1",
        (user_id,),
    )
    row = cur.fetchone()  # جلب نتيجة البحث

    if row is None:
        return "expired"  # الرمز غير موجود أو انتهت صلاحيته

    otp_id, code_hash, attempts = row  # استخراج بيانات الرمز

    if attempts >= MAX_ATTEMPTS:
        return "too_many_attempts"  # تجاوز عدد المحاولات المسموح بها

    # التحقق من أن الرمز المدخل يطابق الرمز المشفر
    if not check_password_hash(code_hash, code):
        # زيادة عدد المحاولات عند إدخال رمز خاطئ
        cur.execute(
            "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = %s",
            (otp_id,),
        )
        return "invalid"  # الرمز غير صحيح

    # تسجيل وقت استخدام الرمز لمنع استخدامه مرة أخرى
    cur.execute(
        "UPDATE otp_codes SET used_at = CURRENT_TIMESTAMP WHERE id = %s",
        (otp_id,),
    )
    return "ok"  # تم التحقق بنجاح