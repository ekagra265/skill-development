from __future__ import annotations

import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from app.core.config import settings
from app.services import auth_storage


class AuthStorageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = TemporaryDirectory(ignore_cleanup_errors=True)
        self.auth_db_path = Path(self.temp_dir.name) / "auth.db"

        self._orig_auth_db_path = settings.auth_db_path
        self._orig_bootstrap_demo = settings.auth_bootstrap_demo_user
        self._orig_demo_user = settings.auth_demo_username
        self._orig_demo_pass = settings.auth_demo_password
        self._orig_password_min = settings.auth_password_min_length
        self._orig_refresh_days = settings.auth_refresh_token_exp_days

        settings.auth_db_path = str(self.auth_db_path)
        settings.auth_bootstrap_demo_user = True
        settings.auth_demo_username = "admin"
        settings.auth_demo_password = "admin123"
        settings.auth_password_min_length = 6
        settings.auth_refresh_token_exp_days = 3
        auth_storage._INITIALIZED = False

    def tearDown(self) -> None:
        settings.auth_db_path = self._orig_auth_db_path
        settings.auth_bootstrap_demo_user = self._orig_bootstrap_demo
        settings.auth_demo_username = self._orig_demo_user
        settings.auth_demo_password = self._orig_demo_pass
        settings.auth_password_min_length = self._orig_password_min
        settings.auth_refresh_token_exp_days = self._orig_refresh_days
        auth_storage._INITIALIZED = False
        for _ in range(5):
            try:
                self.temp_dir.cleanup()
                break
            except PermissionError:
                time.sleep(0.1)

    def test_bootstrap_demo_user_authenticates(self) -> None:
        user = auth_storage.authenticate_user("admin", "admin123")
        self.assertIsNotNone(user)
        assert user is not None
        self.assertEqual(user["username"], "admin")
        self.assertEqual(user["role"], "admin")

    def test_create_and_authenticate_user(self) -> None:
        created = auth_storage.create_user("farmer-01", "secure123")
        self.assertEqual(created["username"], "farmer-01")
        self.assertEqual(created["role"], "user")

        authenticated = auth_storage.authenticate_user("farmer-01", "secure123")
        self.assertIsNotNone(authenticated)
        assert authenticated is not None
        self.assertEqual(authenticated["id"], created["id"])

        wrong_password = auth_storage.authenticate_user("farmer-01", "wrong")
        self.assertIsNone(wrong_password)

    def test_refresh_token_rotation_and_revoke(self) -> None:
        user = auth_storage.create_user("farmer2", "secure123")
        refresh_token, refresh_expires_in = auth_storage.create_refresh_token(user["id"])
        self.assertGreater(refresh_expires_in, 0)

        rotated = auth_storage.rotate_refresh_token(refresh_token)
        self.assertIsNotNone(rotated)
        assert rotated is not None
        rotated_user, next_token, _ = rotated
        self.assertEqual(rotated_user["username"], "farmer2")
        self.assertNotEqual(next_token, refresh_token)

        stale_rotation = auth_storage.rotate_refresh_token(refresh_token)
        self.assertIsNone(stale_rotation)

        revoked = auth_storage.revoke_refresh_token(next_token)
        self.assertTrue(revoked)
        after_revoke = auth_storage.rotate_refresh_token(next_token)
        self.assertIsNone(after_revoke)


if __name__ == "__main__":
    unittest.main()

