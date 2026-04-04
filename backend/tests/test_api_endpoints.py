from __future__ import annotations

import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.dependencies import get_forecast_service
from app.main import app


class ApiEndpointIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._original_key_enabled = settings.api_key_enabled
        settings.api_key_enabled = False

    @classmethod
    def tearDownClass(cls) -> None:
        settings.api_key_enabled = cls._original_key_enabled

    def setUp(self) -> None:
        app.dependency_overrides.clear()
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_metadata_endpoint(self) -> None:
        with patch("app.main.get_unique_states", return_value=["Uttar Pradesh"]), patch(
            "app.main.get_unique_commodities", return_value=["Wheat", "Onion"]
        ), patch(
            "app.main.get_latest_crop_prices",
            return_value=[{"name": "Wheat", "price": 2500, "change": 1.2, "trend": "up"}],
        ), patch(
            "app.main.get_rows_source_info",
            return_value={"source": "local_csv", "detail": "test"},
        ):
            response = self.client.get("/metadata")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("states", payload)
        self.assertIn("commodities", payload)
        self.assertIn("cropPrices", payload)

    def test_forecast_endpoint(self) -> None:
        def fake_forecast_service(_payload):
            return {
                "crop": "Wheat",
                "mandi": "TestMandi",
                "current_price": 2500,
                "trend_direction": "up",
                "expected_change_pct": 2.5,
                "model_used": "baseline",
                "recommendation": {
                    "action": "WAIT",
                    "expected_change_percent": 2.5,
                    "message": "Test recommendation",
                    "confidence": 42,
                    "risk_level": "HIGH",
                },
                "volatility_level": "High",
                "shock_alert": None,
                "forecast": [
                    {
                        "ds": "2026-01-01",
                        "yhat": 2520,
                        "yhat_lower": 2460,
                        "yhat_upper": 2580,
                    }
                ],
                "nearby_mandis": [],
                "insights": ["Test insight"],
                "language": "en",
            }

        app.dependency_overrides[get_forecast_service] = lambda: fake_forecast_service

        response = self.client.post(
            "/forecast",
            json={
                "crop": "Wheat",
                "mandi": "TestMandi",
                "days": 1,
                "language": "en",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model_used"], "baseline")
        self.assertEqual(payload["recommendation"]["risk_level"], "HIGH")

    def test_reports_download_endpoint(self) -> None:
        report = {
            "id": "abc12345",
            "crop": "Wheat",
            "mandi": "TestMandi",
            "date": "2026-01-01",
            "time": "09:30",
            "current_price": 2500,
            "predicted_change": 2.5,
            "confidence": 42,
            "recommendation": "WAIT",
            "risk_level": "HIGH",
            "insights": ["Test insight"],
        }
        pdf_bytes = b"%PDF-1.4\n%test\n"

        with patch("app.routes.reports.get_report_by_id", return_value=report), patch(
            "app.routes.reports.generate_pdf", return_value=pdf_bytes
        ):
            response = self.client.get("/reports/download/abc12345")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "application/pdf")
        self.assertTrue(response.content.startswith(b"%PDF-1.4"))


if __name__ == "__main__":
    unittest.main()
