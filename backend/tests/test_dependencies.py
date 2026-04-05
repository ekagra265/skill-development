from __future__ import annotations

import unittest

from app.core.dependencies import require_api_key
from app.core.config import settings
from app.core.exceptions import AuthenticationError


class ApiKeyDependencyTests(unittest.TestCase):
    def test_disabled_allows_missing_key(self) -> None:
        original_enabled = settings.api_key_enabled
        original_key = settings.api_key
        try:
            settings.api_key_enabled = False
            settings.api_key = "ignored"
            require_api_key(x_api_key=None, x_api_key_query=None)
        finally:
            settings.api_key_enabled = original_enabled
            settings.api_key = original_key

    def test_enabled_rejects_missing_key(self) -> None:
        original_enabled = settings.api_key_enabled
        original_key = settings.api_key
        try:
            settings.api_key_enabled = True
            settings.api_key = "secret"
            with self.assertRaises(AuthenticationError):
                require_api_key(x_api_key=None, x_api_key_query=None)
        finally:
            settings.api_key_enabled = original_enabled
            settings.api_key = original_key

    def test_enabled_accepts_matching_key(self) -> None:
        original_enabled = settings.api_key_enabled
        original_key = settings.api_key
        try:
            settings.api_key_enabled = True
            settings.api_key = "secret"
            require_api_key(x_api_key="secret", x_api_key_query=None)
        finally:
            settings.api_key_enabled = original_enabled
            settings.api_key = original_key


if __name__ == "__main__":
    unittest.main()
