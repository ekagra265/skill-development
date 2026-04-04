from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


class AuthRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._orig_api_key_enabled = settings.api_key_enabled
        cls._orig_auth_enabled = settings.auth_enabled
        cls._orig_demo_user = settings.auth_demo_username
        cls._orig_demo_pass = settings.auth_demo_password

        settings.api_key_enabled = False
        settings.auth_enabled = True
        settings.auth_demo_username = "admin"
        settings.auth_demo_password = "admin123"

    @classmethod
    def tearDownClass(cls) -> None:
        settings.api_key_enabled = cls._orig_api_key_enabled
        settings.auth_enabled = cls._orig_auth_enabled
        settings.auth_demo_username = cls._orig_demo_user
        settings.auth_demo_password = cls._orig_demo_pass

    def setUp(self) -> None:
        self.client = TestClient(app)

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
