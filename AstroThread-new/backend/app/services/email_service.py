import json  # تحويل بيانات الرسالة إلى JSON لإرسالها إلى Resend
import os  # التعامل مع متغيرات البيئة
import smtplib  # إرسال البريد الإلكتروني عبر SMTP (الطريقة الاحتياطية)
from email.message import EmailMessage  # إنشاء رسالة البريد الإلكتروني
from urllib.error import HTTPError, URLError  # أخطاء الاتصال بـ Resend
from urllib.request import Request, urlopen  # إرسال الطلب إلى Resend بدون مكتبات إضافية

RESEND_URL = "https://api.resend.com/emails"  # عنوان Resend لإرسال البريد
DEFAULT_FROM = "AstroThread <onboarding@resend.dev>"  # المرسل الافتراضي (يعمل بدون نطاق خاص)
TIMEOUT_SECONDS = 10  # أقصى مدة انتظار لخادم البريد

SUBJECT = "Your AstroThread verification code"  # عنوان الرسالة


def message_text(code):
    # نص الرسالة الذي يحتوي على رمز التحقق
    return (
        f"Your AstroThread code is {code}.\n\n"
        "It expires in 10 minutes. If you didn't request it, you can ignore this email."
    )


def send_with_resend(to_address, code, api_key):
    # إرسال الرمز عبر Resend (خدمة بريد تعمل من خلال طلب HTTP)
    body = json.dumps({
        "from": os.getenv("EMAIL_FROM") or DEFAULT_FROM,  # المرسل
        "to": [to_address],  # المستلم (Resend يقبل قائمة)
        "subject": SUBJECT,
        "text": message_text(code),
    }).encode()

    request = Request(
        RESEND_URL,
        data=body,  # وجود data يجعل الطلب من نوع POST
        headers={
            "Authorization": f"Bearer {api_key}",  # مفتاح Resend
            "Content-Type": "application/json",
            "User-Agent": "AstroThread/1.0",  # Resend يرفض الطلبات بدون اسم برنامج واضح
        },
    )

    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS):
            pass  # نجاح الطلب يعني أن Resend قبل الرسالة
    except HTTPError as error:
        # مثل 403 عندما لا يكون النطاق مؤكداً، أو 422 عند وجود خطأ في البيانات
        detail = error.read(500).decode(errors="replace")
        raise OSError(f"Resend refused the email (HTTP {error.code}): {detail}") from error
    except (URLError, TimeoutError) as error:
        raise OSError(f"Resend could not be reached: {error}") from error


def send_with_smtp(to_address, code):
    # إرسال الرمز عبر Gmail (SMTP) كطريقة احتياطية
    message = EmailMessage()  # إنشاء رسالة جديدة
    message["Subject"] = SUBJECT  # عنوان الرسالة
    message["From"] = os.getenv("SMTP_USER")  # البريد الإلكتروني للمرسل
    message["To"] = to_address  # البريد الإلكتروني للمستلم
    message.set_content(message_text(code))  # نص الرسالة مع الرمز

    host = os.getenv("SMTP_HOST", "smtp.gmail.com")  # عنوان خادم البريد
    port = int(os.getenv("SMTP_PORT", "587"))  # رقم المنفذ المستخدم للإرسال

    with smtplib.SMTP(host, port, timeout=TIMEOUT_SECONDS) as server:  # الاتصال بخادم البريد
        server.starttls()  # تفعيل الاتصال الآمن
        server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))  # تسجيل الدخول باستخدام بيانات SMTP
        server.send_message(message)  # إرسال رسالة التحقق للمستخدم


def send_otp_email(to_address, code):
    # اختيار طريقة الإرسال حسب الإعدادات في ملف .env
    if os.getenv("EMAIL_MODE") == "console":
        # للتجربة المحلية فقط: طباعة الرمز في الطرفية بدلاً من إرساله
        print(f"[EMAIL_MODE=console] AstroThread code for {to_address}: {code}", flush=True)
        return

    api_key = os.getenv("RESEND_API_KEY", "").strip()  # مفتاح Resend إن وُجد
    if api_key:
        send_with_resend(to_address, code, api_key)  # الطريقة الأساسية
        return

    if os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
        send_with_smtp(to_address, code)  # الطريقة الاحتياطية
        return

    # لا توجد أي طريقة إرسال: auth.py يحوّل هذا الخطأ إلى رسالة 502 للمستخدم
    raise OSError("No email settings: set RESEND_API_KEY, or SMTP_USER and SMTP_PASSWORD")