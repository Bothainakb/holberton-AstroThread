import io
import json
import os
import unittest
from contextlib import redirect_stdout
from unittest import mock
from urllib.error import HTTPError

import psycopg

from app import create_app
from app.routes import auth
from app.services import email_service, otp_service

USER = (5, "Sara Alharbi", "user", "active")   


def fake_database(*rows):
    """A fake connection whose cursor returns `rows` one by one from fetchone()."""
    cur = mock.MagicMock()
    cur.fetchone.side_effect = list(rows)
    conn = mock.MagicMock()
    conn.__enter__.return_value.cursor.return_value.__enter__.return_value = cur
    return conn


class AuthRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.secret_key = "test-secret"
        app.logger.disabled = True
        self.client = app.test_client()

        patches = {
            "connect": mock.patch.object(auth, "get_connection", return_value=fake_database()),
            "send": mock.patch.object(auth, "send_otp_email"),
            "create": mock.patch.object(otp_service, "create_otp", return_value="123456"),
            "check": mock.patch.object(otp_service, "verify_otp", return_value="ok"),
            "cooldown": mock.patch.object(otp_service, "seconds_until_resend", return_value=0),
        }
        for name, patcher in patches.items():
            setattr(self, name, patcher.start())
            self.addCleanup(patcher.stop)

    def use_database(self, *rows):
        self.connect.return_value = fake_database(*rows)

    def sign_in(self, user_id=5):
        with self.client.session_transaction() as session:
            session["user_id"] = user_id


    def test_signup_creates_the_account_and_emails_a_code(self):
        self.use_database(None, (5,))   

        response = self.client.post("/api/auth/signup", json={
            "fullName": "Sara Alharbi", "email": " Sara@Example.com ",
        })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json(), {"email": "sara@example.com"})
        self.send.assert_called_once_with("sara@example.com", "123456")

    def test_signup_rejects_bad_details(self):
        for body, field in (({"fullName": "S", "email": "sara@example.com"}, "fullName"),
                            ({"fullName": "Sara", "email": "not-an-email"}, "email")):
            with self.subTest(field=field):
                response = self.client.post("/api/auth/signup", json=body)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.get_json()["field"], field)
        self.send.assert_not_called()

    def test_signup_with_a_verified_email_is_409(self):
        self.use_database((5, "2026-11-01"))

        response = self.client.post("/api/auth/signup", json={
            "fullName": "Sara Alharbi", "email": "sara@example.com",
        })

        self.assertEqual(response.status_code, 409)
        self.send.assert_not_called()

    def test_email_failure_is_502(self):
        self.use_database(None, (5,))
        self.send.side_effect = OSError("SMTP is down")

        response = self.client.post("/api/auth/signup", json={
            "fullName": "Sara Alharbi", "email": "sara@example.com",
        })

        self.assertEqual(response.status_code, 502)
        self.assertNotIn("SMTP", response.get_data(as_text=True))


    def test_right_code_signs_the_user_in(self):
        self.use_database(USER)

        response = self.client.post("/api/auth/verify", json={"email": "sara@example.com", "code": "123456"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(),
                         {"fullName": "Sara Alharbi", "email": "sara@example.com", "accountType": "user"})
        cookie = response.headers["Set-Cookie"]
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Lax", cookie)
        with self.client.session_transaction() as session:
            self.assertEqual(session["user_id"], 5)

    def test_wrong_codes_do_not_sign_in(self):
        for result, status in (("invalid", 400), ("expired", 400), ("too_many_attempts", 429)):
            with self.subTest(result=result):
                self.use_database(USER)
                self.check.return_value = result
                response = self.client.post("/api/auth/verify", json={"email": "sara@example.com", "code": "000000"})
                self.assertEqual(response.status_code, status)
                with self.client.session_transaction() as session:
                    self.assertNotIn("user_id", session)

    def test_login_emails_a_code_to_a_verified_account(self):
        self.use_database((5, "active"))

        response = self.client.post("/api/auth/login", json={"email": "Sara@Example.com"})

        self.assertEqual(response.status_code, 200)
        self.create.assert_called_once()
        self.send.assert_called_once_with("sara@example.com", "123456")

    def test_login_too_soon_after_the_last_code_is_429(self):
        # آخر رمز أُرسل قبل قليل: يجب الانتظار 20 ثانية أخرى
        self.use_database((5, "active"))
        self.cooldown.return_value = 20

        response = self.client.post("/api/auth/login", json={"email": "sara@example.com"})

        self.assertEqual(response.status_code, 429)
        self.assertIn("20 seconds", response.get_json()["error"])
        self.create.assert_not_called()  # لم يتم إلغاء الرمز القديم
        self.send.assert_not_called()  # لم يتم إرسال بريد جديد

    def test_signup_too_soon_after_the_last_code_is_429(self):
        # نفس الحالة عند التسجيل لحساب لم يتم تأكيده بعد
        self.use_database(None, (5,))
        self.cooldown.return_value = 12

        response = self.client.post("/api/auth/signup", json={
            "fullName": "Sara Alharbi", "email": "sara@example.com",
        })

        self.assertEqual(response.status_code, 429)
        self.send.assert_not_called()

    def test_login_for_a_suspended_account_is_403(self):
        # الحساب الموقوف لا يحصل على رمز
        self.use_database((5, "suspended"))

        response = self.client.post("/api/auth/login", json={"email": "sara@example.com"})

        self.assertEqual(response.status_code, 403)
        self.assertIn("suspended", response.get_json()["error"])
        self.send.assert_not_called()

    def test_verify_for_a_suspended_account_is_403(self):
        # حتى مع رمز صحيح لا يتم تسجيل الدخول، ولا يُفحص الرمز أصلاً
        self.use_database((5, "Sara Alharbi", "user", "suspended"))

        response = self.client.post("/api/auth/verify", json={"email": "sara@example.com", "code": "123456"})

        self.assertEqual(response.status_code, 403)
        self.check.assert_not_called()
        with self.client.session_transaction() as session:
            self.assertNotIn("user_id", session)

    def test_login_without_an_account_is_404(self):
        self.use_database(None)

        response = self.client.post("/api/auth/login", json={"email": "nobody@example.com"})

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["field"], "email")
        self.send.assert_not_called()

    def test_login_with_a_bad_email_is_400(self):
        response = self.client.post("/api/auth/login", json={"email": "nope"})
        self.assertEqual(response.status_code, 400)
        self.connect.assert_not_called()

    def test_login_database_error_is_500(self):
        self.connect.side_effect = psycopg.OperationalError("connection refused")

        response = self.client.post("/api/auth/login", json={"email": "sara@example.com"})

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("connection refused", response.get_data(as_text=True))

    # Me and logout

    def test_me_without_signing_in_is_401(self):
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.connect.assert_not_called()

    def test_me_returns_the_signed_in_user(self):
        self.sign_in()
        self.use_database(("Sara Alharbi", "sara@example.com", "user", "active"))

        response = self.client.get("/api/auth/me")

        self.assertEqual(response.get_json(),
                         {"fullName": "Sara Alharbi", "email": "sara@example.com", "accountType": "user"})

    def test_me_for_a_deleted_account_signs_out(self):
        self.sign_in()
        self.use_database(None)

        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        with self.client.session_transaction() as session:
            self.assertNotIn("user_id", session)

    def test_me_for_a_suspended_account_signs_out(self):
        # المستخدم الذي أُوقف حسابه أثناء تسجيل دخوله يخرج عند التحقق التالي
        self.sign_in()
        self.use_database(("Sara Alharbi", "sara@example.com", "user", "suspended"))

        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        with self.client.session_transaction() as session:
            self.assertNotIn("user_id", session)

    def test_logout_forgets_the_user(self):
        self.sign_in()

        response = self.client.post("/api/auth/logout")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    # Change name and delete account

    def test_change_name_without_signing_in_is_401(self):
        response = self.client.patch("/api/auth/me", json={"fullName": "Sara Ali"})
        self.assertEqual(response.status_code, 401)
        self.connect.assert_not_called()

    def test_change_name_saves_the_new_name(self):
        self.sign_in()
        self.use_database(("Sara Ali", "sara@example.com", "user"))

        response = self.client.patch("/api/auth/me", json={"fullName": "  Sara Ali  "})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(),
                         {"fullName": "Sara Ali", "email": "sara@example.com", "accountType": "user"})

    def test_change_name_rejects_a_too_short_name(self):
        self.sign_in()

        response = self.client.patch("/api/auth/me", json={"fullName": "S"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["field"], "fullName")
        self.connect.assert_not_called()

    def test_delete_account_signs_out(self):
        self.sign_in()

        response = self.client.delete("/api/auth/me")

        self.assertEqual(response.status_code, 204)
        with self.client.session_transaction() as session:
            self.assertNotIn("user_id", session)

    def test_delete_without_signing_in_is_401(self):
        self.assertEqual(self.client.delete("/api/auth/me").status_code, 401)
        self.connect.assert_not_called()


class EmailServiceTests(unittest.TestCase):
    def test_console_mode_prints_the_code_instead_of_emailing(self):
        output = io.StringIO()
        with mock.patch.dict(os.environ, {"EMAIL_MODE": "console"}), redirect_stdout(output), \
                mock.patch.object(email_service.smtplib, "SMTP") as smtp, \
                mock.patch.object(email_service, "urlopen") as urlopen:
            email_service.send_otp_email("sara@example.com", "123456")

        self.assertIn("123456", output.getvalue())
        smtp.assert_not_called()
        urlopen.assert_not_called()

    def test_missing_settings_raise_os_error(self):
        settings = {"EMAIL_MODE": "", "RESEND_API_KEY": "", "SMTP_USER": "", "SMTP_PASSWORD": ""}
        with mock.patch.dict(os.environ, settings), self.assertRaises(OSError):
            email_service.send_otp_email("sara@example.com", "123456")

    def test_resend_is_used_when_its_key_is_set(self):
        settings = {"EMAIL_MODE": "", "RESEND_API_KEY": "re_test", "EMAIL_FROM": "",
                    "SMTP_USER": "a@gmail.com", "SMTP_PASSWORD": "x"}
        with mock.patch.dict(os.environ, settings), \
                mock.patch.object(email_service, "urlopen") as urlopen, \
                mock.patch.object(email_service.smtplib, "SMTP") as smtp:
            email_service.send_otp_email("sara@example.com", "123456")

        request = urlopen.call_args.args[0]
        body = json.loads(request.data)
        self.assertEqual(request.full_url, "https://api.resend.com/emails")
        self.assertEqual(request.get_header("Authorization"), "Bearer re_test")
        self.assertEqual(body["to"], ["sara@example.com"])
        self.assertEqual(body["from"], "AstroThread <onboarding@resend.dev>")
        self.assertIn("123456", body["text"])
        smtp.assert_not_called()  # Gmail لا يُستخدم عندما يوجد مفتاح Resend

    def test_resend_uses_email_from_when_set(self):
        settings = {"EMAIL_MODE": "", "RESEND_API_KEY": "re_test",
                    "EMAIL_FROM": "AstroThread <codes@astrothread.com>"}
        with mock.patch.dict(os.environ, settings), \
                mock.patch.object(email_service, "urlopen") as urlopen:
            email_service.send_otp_email("sara@example.com", "123456")

        body = json.loads(urlopen.call_args.args[0].data)
        self.assertEqual(body["from"], "AstroThread <codes@astrothread.com>")

    def test_resend_refusal_becomes_os_error(self):
        refusal = HTTPError("https://api.resend.com/emails", 403, "Forbidden", {}, io.BytesIO(b"domain not verified"))
        settings = {"EMAIL_MODE": "", "RESEND_API_KEY": "re_test"}
        with mock.patch.dict(os.environ, settings), \
                mock.patch.object(email_service, "urlopen", side_effect=refusal), \
                self.assertRaises(OSError) as raised:
            email_service.send_otp_email("sara@example.com", "123456")

        self.assertIn("403", str(raised.exception))
        self.assertIn("domain not verified", str(raised.exception))

    def test_gmail_is_used_without_a_resend_key(self):
        settings = {"EMAIL_MODE": "", "RESEND_API_KEY": "", "SMTP_USER": "a@gmail.com", "SMTP_PASSWORD": "x"}
        with mock.patch.dict(os.environ, settings), \
                mock.patch.object(email_service, "urlopen") as urlopen, \
                mock.patch.object(email_service.smtplib, "SMTP") as smtp:
            email_service.send_otp_email("sara@example.com", "123456")

        smtp.assert_called_once()
        urlopen.assert_not_called()