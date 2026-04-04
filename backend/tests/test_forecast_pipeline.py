from __future__ import annotations

from datetime import datetime, timedelta
import unittest
from unittest.mock import patch

from app.schemas import ForecastRequest
from app.services.forecast_pipeline import run_forecast_pipeline


class ForecastPipelineFallbackTests(unittest.TestCase):
    @patch("app.services.forecast_pipeline.get_nearby_mandis", return_value=[])
    @patch("app.services.forecast_pipeline.resolve_state_for_market", return_value="TestState")
    def test_short_history_uses_baseline(self, _state_mock, _nearby_mock) -> None:
        history = [
            {"ds": datetime(2026, 1, 1), "y": 100.0},
            {"ds": datetime(2026, 1, 2), "y": 102.0},
        ]
        payload = ForecastRequest(crop="Wheat", mandi="TestMandi", days=7, language="en")

        with patch(
            "app.services.forecast_pipeline.load_prophet_history",
            return_value=history,
        ), patch(
            "app.services.forecast_pipeline.run_prophet_forecast"
        ) as prophet_mock:
            result = run_forecast_pipeline(payload)

        prophet_mock.assert_not_called()
        self.assertEqual(len(result["forecast"]), 7)
        self.assertEqual(result["recommendation"]["risk_level"], "HIGH")
        self.assertLessEqual(result["recommendation"]["confidence"], 45)

    @patch("app.services.forecast_pipeline.get_nearby_mandis", return_value=[])
    @patch("app.services.forecast_pipeline.resolve_state_for_market", return_value="TestState")
    def test_long_history_uses_prophet_path(self, _state_mock, _nearby_mock) -> None:
        history = [
            {"ds": datetime(2026, 1, 1) + timedelta(days=i), "y": 100.0 + i}
            for i in range(35)
        ]
        forecast = [
            {
                "ds": (datetime(2026, 2, 1) + timedelta(days=i)).date(),
                "yhat": 140.0 + i,
                "yhat_lower": 130.0 + i,
                "yhat_upper": 150.0 + i,
            }
            for i in range(7)
        ]
        payload = ForecastRequest(crop="Wheat", mandi="TestMandi", days=7, language="en")

        with patch(
            "app.services.forecast_pipeline.load_prophet_history",
            return_value=history,
        ), patch(
            "app.services.forecast_pipeline.run_prophet_forecast",
            return_value=forecast,
        ) as prophet_mock:
            result = run_forecast_pipeline(payload)

        prophet_mock.assert_called_once()
        self.assertEqual(len(result["forecast"]), 7)


if __name__ == "__main__":
    unittest.main()
