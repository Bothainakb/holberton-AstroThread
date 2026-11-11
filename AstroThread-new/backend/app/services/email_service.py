import os  # التعامل مع متغيرات البيئة
import smtplib  # إرسال البريد الإلكتروني عبر SMTP
from email.message import EmailMessage  # إنشاء رسالة البريد الإلكتروني


def send_otp_email(to_address, code):
    message = EmailMessage()  # إنشاء رسالة جديدة
    message["Subject"] = "Your AstroThread verification code"  # عنوان الرسالة
    message["From"] = os.getenv("SMTP_USER")  # البريد الإلكتروني للمرسل
    message["To"] = to_address  # البريد الإلكتروني للمستلم
    message.set_content(
        f"Your AstroThread code is {code}.\n\n"  # إضافة رمز التحقق
        "It expires in 10 minutes. If you didn't request it, you can ignore this email."  # توضيح مدة صلاحية الرمز
    )

    host = os.getenv("SMTP_HOST", "smtp.gmail.com")  # عنوان خادم البريد
    port = int(os.getenv("SMTP_PORT", "587"))  # رقم المنفذ المستخدم للإرسال

    with smtplib.SMTP(host, port, timeout=10) as server:  # الاتصال بخادم البريد
        server.starttls()  # تفعيل الاتصال الآمن
        server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))  # تسجيل الدخول باستخدام بيانات SMTP
        server.send_message(message)  # إرسال رسالة التحقق للمستخدم