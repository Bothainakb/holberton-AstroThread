"""Tests for the authentication endpoints (backend/auth.py).

Run from the backend folder:  python -m unittest -v
The database is mocked, so these tests do not need PostgreSQL.
"""
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

import jwt
import psycopg
from werkzeug.security import generate_password_hash

import app as backend
import auth

SECRET = "test-secret-key-for-unit-tests-only-0123456789"
USER_ROW = (1, "Bothaina", "bothaina@example.com", "user")


def fake_connection(fetchone=None, execute_error=None):
    """A mocked psycopg connection whose cursor returns `fetchone`."""
    cursor = mock.MagicMock()
    cursor.fetchone.return_value = fetchone
    if execute_error is not None:
        cursor.execute.side_effect = execute_error
    cursor.__enter__.return_value = cursor
    cursor.__exit__.return_value = False  # never swallow exceptions

    conn = mock.MagicMock()
    conn.cursor.return_value = cursor
    conn.__enter__.return_value = conn
    conn.__exit__.return_value = False
    return conn, cursor


class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.client = backend.app.test_client()
        backend.app.logger.disabled = True
        env = mock.patch.dict(os.environ, {"JWT_SECRET_KEY": SECRET})
        env.start()
        self.addCleanup(env.stop)

    def tearDown(self):
        backend.app.logger.disabled = False

    def use_db(self, **kwargs):
        conn, cursor = fake_connection(**kwargs)
        patcher = mock.patch.object(auth, "get_db_connection", return_value=conn)
        patcher.start()
        self.addCleanup(patcher.stop)
        return cursor


class RegisterTests(AuthTestCase):
    def register(self, **body):
        data = {"name": "Bothaina", "email": "bothaina@example.com", "password": "stars1234"}
        data.update(body)
        return self.client.post("/api/auth/register", json=data)

    def test_register_returns_token_and_user(self):
        self.use_db(fetchone=USER_ROW)
        response = self.register()

        self.assertEqual(response.status_code, 201)
        body = response.get_json()
        self.assertEqual(body["user"], {
            "id": 1, "name": "Bothaina", "email": "bothaina@example.com", "role": "user",
        })
        payload = jwt.decode(body["token"], SECRET, algorithms=["HS256"])
        self.assertEqual(payload["sub"], "1")
        self.assertEqual(payload["role"], "user")

    def test_password_is_hashed_and_email_lowercased(self):
        cursor = self.use_db(fetchone=USER_ROW)
        self.register(email="  Bothaina@Example.COM ")

        name, email, password_hash = cursor.execute.call_args.args[1]
        self.assertEqual(email, "bothaina@example.com")
        self.assertNotEqual(password_hash, "stars1234")
        self.assertNotIn("stars1234", password_hash)

    def test_role_in_request_is_ignored(self):
        cursor = self.use_db(fetchone=USER_ROW)
        self.register(role="owner")

        sql, params = cursor.execute.call_args.args
        self.assertNotIn("role)", sql.split("VALUES")[0])
        self.assertNotIn("owner", params)

    def test_invalid_fields_are_rejected(self):
        cursor = self.use_db()
        response = self.register(name="  ", email="not-an-email", password="short")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.get_json()["fields"]), {"name", "email", "password"})
        cursor.execute.assert_not_called()

    def test_non_json_body_is_rejected(self):
        response = self.client.post("/api/auth/register", data="hello")
        self.assertEqual(response.status_code, 400)

    def test_duplicate_email_returns_409(self):
        self.use_db(execute_error=psycopg.errors.UniqueViolation("duplicate key"))
        response = self.register()

        self.assertEqual(response.status_code, 409)
        self.assertIn("email", response.get_json()["fields"])

    def test_database_error_returns_json_500(self):
        error = psycopg.OperationalError("connection refused")
        with mock.patch.object(auth, "get_db_connection", side_effect=error):
            response = self.register()

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to create the account"})

    def test_missing_secret_returns_500_before_saving(self):
        cursor = self.use_db(fetchone=USER_ROW)
        with mock.patch.dict(os.environ, {"JWT_SECRET_KEY": ""}):
            response = self.register()

        self.assertEqual(response.status_code, 500)
        cursor.execute.assert_not_called()


class LoginTests(AuthTestCase):
    def setUp(self):
        super().setUp()
        self.stored = USER_ROW + (generate_password_hash("stars1234"),)

    def login(self, email="bothaina@example.com", password="stars1234"):
        return self.client.post("/api/auth/login", json={"email": email, "password": password})

    def test_correct_password_returns_token(self):
        self.use_db(fetchone=self.stored)
        response = self.login(email="BOTHAINA@example.com")

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body["user"]["email"], "bothaina@example.com")
        self.assertNotIn("password_hash", body["user"])
        jwt.decode(body["token"], SECRET, algorithms=["HS256"])

    def test_wrong_password_returns_401(self):
        self.use_db(fetchone=self.stored)
        response = self.login(password="wrong-password")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": "Invalid email or password"})

    def test_unknown_email_gets_the_same_401(self):
        self.use_db(fetchone=None)
        response = self.login(email="nobody@example.com")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.get_json(), {"error": "Invalid email or password"})

    def test_missing_fields_return_400(self):
        response = self.client.post("/api/auth/login", json={})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.get_json()["fields"]), {"email", "password"})

    def test_database_error_returns_json_500(self):
        with mock.patch.dict(os.environ, {"DB_PASSWORD": ""}):
            response = self.login()

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.get_json(), {"error": "Unable to sign in right now"})


class CurrentUserTests(AuthTestCase):
    def get_me(self, token=None, header=None):
        headers = {}
        if header is not None:
            headers["Authorization"] = header
        elif token is not None:
            headers["Authorization"] = f"Bearer {token}"
        return self.client.get("/api/auth/me", headers=headers)

    def test_valid_token_returns_user(self):
        self.use_db(fetchone=USER_ROW)
        response = self.get_me(auth.create_token(1, "user"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["user"]["id"], 1)

    def test_missing_token_returns_401(self):
        self.assertEqual(self.get_me().status_code, 401)
        self.assertEqual(self.get_me(header="Token abc").status_code, 401)

    def test_tampered_token_returns_401(self):
        token = jwt.encode({"sub": "1", "role": "owner"}, "a-different-secret-key-0123456789", algorithm="HS256")
        self.assertEqual(self.get_me(token).status_code, 401)

    def test_expired_token_returns_401(self):
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        token = jwt.encode({"sub": "1", "role": "user", "exp": past}, SECRET, algorithm="HS256")
        self.assertEqual(self.get_me(token).status_code, 401)

    def test_deleted_account_returns_401(self):
        self.use_db(fetchone=None)
        response = self.get_me(auth.create_token(99, "user"))
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
