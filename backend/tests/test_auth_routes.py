from __future__ import annotations

import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import auth_storage


class AuthRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._orig_api_key_enabled = settings.api_key_enabled
        cls._orig_auth_enabled = settings.auth_enabled
        cls._orig_auth_db_path = settings.auth_db_path
        cls._orig_bootstrap_demo = settings.auth_bootstrap_demo_user
        cls._orig_demo_user = settings.auth_demo_username
        cls._orig_demo_pass = settings.auth_demo_password
        cls._orig_allow_signup = settings.auth_allow_signup
        cls._orig_password_min_length = settings.auth_password_min_length
        cls._orig_refresh_days = settings.auth_refresh_token_exp_days

        settings.api_key_enabled = False
        settings.auth_enabled = True

    @classmethod
    def tearDownClass(cls) -> None:
        settings.api_key_enabled = cls._orig_api_key_enabled
        settings.auth_enabled = cls._orig_auth_enabled
        settings.auth_db_path = cls._orig_auth_db_path
        settings.auth_bootstrap_demo_user = cls._orig_bootstrap_demo
        settings.auth_demo_username = cls._orig_demo_user
        settings.auth_demo_password = cls._orig_demo_pass
        settings.auth_allow_signup = cls._orig_allow_signup
        settings.auth_password_min_length = cls._orig_password_min_length
        settings.auth_refresh_token_exp_days = cls._orig_refresh_days

    def setUp(self) -> None:
        self.temp_dir = TemporaryDirectory(ignore_cleanup_errors=True)
        settings.auth_db_path = str(Path(self.temp_dir.name) / "auth-test.db")
        settings.auth_bootstrap_demo_user = True
        settings.auth_demo_username = "admin"
        settings.auth_demo_password = "admin123"
        settings.auth_allow_signup = True
        settings.auth_password_min_length = 6
        settings.auth_refresh_token_exp_days = 7
        auth_storage._INITIALIZED = False
        self.client = TestClient(app)

    def tearDown(self) -> None:
        auth_storage._INITIALIZED = False
        for _ in range(5):
            try:
                self.temp_dir.cleanup()
                break
            except PermissionError:
                time.sleep(0.1)

    def _login_token(self) -> str:
        response = self.client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["access_token"]

    def test_login_success(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["token_type"], "bearer")
        self.assertIn("access_token", payload)
        self.assertIn("refresh_token", payload)
        self.assertGreater(payload["refresh_expires_in"], 0)
        self.assertEqual(payload["user"]["username"], "admin")

    def test_login_invalid_password_rejected(self) -> None:
        response = self.client.post(
            "/auth/login",
            json={"username": "admin", "password": "wrong"},
        )
        self.assertEqual(response.status_code, 401)

    def test_me_endpoint_with_valid_bearer_token(self) -> None:
        token = self._login_token()
        response = self.client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["username"], "admin")
        self.assertEqual(payload["role"], "admin")

    def test_register_and_login_new_user(self) -> None:
        registered = self.client.post(
            "/auth/register",
            json={"username": "farmer1", "password": "secure123"},
        )
        self.assertEqual(registered.status_code, 200)
        register_payload = registered.json()
        self.assertEqual(register_payload["user"]["username"], "farmer1")

        logged_in = self.client.post(
            "/auth/login",
            json={"username": "farmer1", "password": "secure123"},
        )
        self.assertEqual(logged_in.status_code, 200)
        self.assertEqual(logged_in.json()["user"]["username"], "farmer1")

    def test_refresh_rotates_refresh_token(self) -> None:
        login_response = self.client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        self.assertEqual(login_response.status_code, 200)
        refresh_token = login_response.json()["refresh_token"]

        rotated = self.client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(rotated.status_code, 200)
        rotated_payload = rotated.json()
        self.assertNotEqual(rotated_payload["refresh_token"], refresh_token)
        self.assertIn("access_token", rotated_payload)

        reused = self.client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(reused.status_code, 401)

    def test_logout_revokes_refresh_token(self) -> None:
        login_response = self.client.post(
            "/auth/login",
            json={"username": "admin", "password": "admin123"},
        )
        self.assertEqual(login_response.status_code, 200)
        refresh_token = login_response.json()["refresh_token"]

        logged_out = self.client.post(
            "/auth/logout",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(logged_out.status_code, 200)
        self.assertTrue(logged_out.json()["success"])

        refreshed = self.client.post(
            "/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(refreshed.status_code, 401)

    def test_reports_history_requires_auth_when_enabled(self) -> None:
        unauthenticated = self.client.get("/reports/history")
        self.assertEqual(unauthenticated.status_code, 401)

        token = self._login_token()
        with patch(
            "app.routes.reports.query_reports",
            return_value={"reports": [], "total": 0, "limit": 20, "offset": 0},
        ) as mocked_query:
            authenticated = self.client.get(
                "/reports/history",
                headers={"Authorization": f"Bearer {token}"},
            )
        self.assertEqual(authenticated.status_code, 200)
        mocked_query.assert_called_once_with(
            owner_username="admin",
            q=None,
            recommendation=None,
            risk_level=None,
            sort="date",
            limit=20,
            offset=0,
        )


if __name__ == "__main__":
    unittest.main()
