from __future__ import annotations

from datetime import datetime
import unittest

from app.services.forecast_model import run_baseline_forecast


class BaselineForecastTests(unittest.TestCase):
    def test_generates_requested_periods(self) -> None:
        history = [
            {"ds": datetime(2026, 1, 1), "y": 100.0},
            {"ds": datetime(2026, 1, 2), "y": 106.0},
            {"ds": datetime(2026, 1, 3), "y": 104.0},
        ]

        result = run_baseline_forecast(history, periods=7)

        self.assertEqual(len(result), 7)
        for point in result:
            self.assertGreaterEqual(point["yhat"], 0.0)
            self.assertLessEqual(point["yhat_lower"], point["yhat"])
            self.assertGreaterEqual(point["yhat_upper"], point["yhat"])

    def test_empty_history_raises(self) -> None:
        with self.assertRaises(ValueError):
            run_baseline_forecast([], periods=7)


if __name__ == "__main__":
    unittest.main()
