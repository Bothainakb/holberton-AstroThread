import unittest
from unittest import mock

import psycopg

from app import create_app
from app.routes import admin

# صفوف وهمية بنفس ترتيب أعمدة الاستعلام: id, full_name, email, account_type, status, created_at
SARA = (5, "Sara Alharbi", "sara@example.com", "user", "active", "2026-11-16T10:00:00")
SARA_SUSPENDED = (5, "Sara Alharbi", "sara@example.com", "user", "suspended", "2026-11-16T10:00:00")

ACTIVE_ADMIN = ("admin", "active")  # نتيجة فحص admin_required لمدير نشط


def fake_database(rows=(), all_rows=None):
    """اتصال وهمي: fetchone() يعيد rows واحداً تلو الآخر، و fetchall() يعيد all_rows."""
    cur = mock.MagicMock()
    cur.fetchone.side_effect = list(rows)
    cur.fetchall.return_value = all_rows or []
    conn = mock.MagicMock()
    conn.__enter__.return_value.cursor.return_value.__enter__.return_value = cur
    return conn


class AdminRouteTests(unittest.TestCase):
    def setUp(self):
        app = create_app()
        app.secret_key = "test-secret"
        app.logger.disabled = True
        self.client = app.test_client()

        # استبدال الاتصال الحقيقي بقاعدة البيانات باتصال وهمي
        patcher = mock.patch.object(admin, "get_connection")
        self.connect = patcher.start()
        self.addCleanup(patcher.stop)

    def sign_in(self, user_id=1):
        with self.client.session_transaction() as session:
            session["user_id"] = user_id

    def use_databases(self, *connections):
        # كل طلب يفتح اتصالاً: الأول لفحص المدير، والثاني لعمل المسار نفسه
        self.connect.side_effect = list(connections)

    # من يستطيع استخدام لوحة المدير

    def test_signed_out_is_401(self):
        self.assertEqual(self.client.get("/api/admin/users").status_code, 401)
        self.connect.assert_not_called()

    def test_normal_user_is_403(self):
        self.sign_in()
        self.use_databases(fake_database([("user", "active")]))

        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)

    def test_suspended_admin_is_403(self):
        self.sign_in()
        self.use_databases(fake_database([("admin", "suspended")]))

        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)

    def test_deleted_account_is_403(self):
        self.sign_in()
        self.use_databases(fake_database([None]))

        self.assertEqual(self.client.get("/api/admin/users").status_code, 403)

    # عرض الحسابات

    def test_admin_sees_the_accounts(self):
        self.sign_in()
        self.use_databases(fake_database([ACTIVE_ADMIN]), fake_database(all_rows=[SARA]))

        response = self.client.get("/api/admin/users")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), [{
            "id": 5, "fullName": "Sara Alharbi", "email": "sara@example.com",
            "accountType": "user", "status": "active", "createdAt": "2026-11-16T10:00:00",
        }])

    def test_database_error_is_500(self):
        self.sign_in()
        # الاتصال الثاني يفشل كأن قاعدة البيانات متوقفة
        self.use_databases(fake_database([ACTIVE_ADMIN]), psycopg.OperationalError("down"))

        response = self.client.get("/api/admin/users")

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("down", response.get_data(as_text=True))

    # إيقاف الحساب وإعادة تفعيله

    def test_admin_suspends_a_user(self):
        self.sign_in()
        self.use_databases(fake_database([ACTIVE_ADMIN]), fake_database([("user",), SARA_SUSPENDED]))

        response = self.client.patch("/api/admin/users/5/status", json={"status": "suspended"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "suspended")

    def test_admin_reactivates_a_user(self):
        self.sign_in()
        self.use_databases(fake_database([ACTIVE_ADMIN]), fake_database([("user",), SARA]))

        response = self.client.patch("/api/admin/users/5/status", json={"status": "active"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "active")

    def test_unknown_status_is_400(self):
        self.sign_in()
        self.use_databases(fake_database([ACTIVE_ADMIN]))

        response = self.client.patch("/api/admin/users/5/status", json={"status": "banned"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["field"], "status")

    def test_unknown_account_is_404(self):
        self.sign_in()
        self.use_databases(fake_database([ACTIVE_ADMIN]), fake_database([None]))

        response = self.client.patch("/api/admin/users/99/status", json={"status": "suspended"})

        self.assertEqual(response.status_code, 404)

    def test_admin_accounts_cannot_be_suspended(self):
        self.sign_in()
        self.use_databases(fake_database([ACTIVE_ADMIN]), fake_database([("admin",)]))

        response = self.client.patch("/api/admin/users/1/status", json={"status": "suspended"})

        self.assertEqual(response.status_code, 403)

    def test_normal_user_cannot_suspend_anyone(self):
        self.sign_in()
        self.use_databases(fake_database([("user", "active")]))

        response = self.client.patch("/api/admin/users/5/status", json={"status": "suspended"})

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.connect.call_count, 1)  # لم يصل الطلب إلى تعديل الحالة


if __name__ == "__main__":
    unittest.main()