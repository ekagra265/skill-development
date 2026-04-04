from __future__ import annotations

import json
import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from app.services import report_storage


class ReportStorageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "reports.db"
        self.legacy_path = Path(self.temp_dir.name) / "reports.json"

        self._orig_db_path = report_storage.REPORTS_DB_PATH
        self._orig_legacy_path = report_storage.LEGACY_REPORTS_FILE

        report_storage.REPORTS_DB_PATH = self.db_path
        report_storage.LEGACY_REPORTS_FILE = self.legacy_path
        report_storage._INITIALIZED = False

    def tearDown(self) -> None:
        report_storage.REPORTS_DB_PATH = self._orig_db_path
        report_storage.LEGACY_REPORTS_FILE = self._orig_legacy_path
        report_storage._INITIALIZED = False
        for _ in range(5):
            try:
                self.temp_dir.cleanup()
                break
            except PermissionError:
                time.sleep(0.1)

    def _sample_payload(self) -> dict:
        return {
            "crop": "Wheat",
            "mandi": "Delhi",
            "current_price": 2500,
            "expected_change_pct": 2.5,
            "trend_direction": "up",
            "volatility_level": "High",
            "shock_alert": None,
            "insights": ["Test insight"],
            "forecast": [],
            "nearby_mandis": [],
            "language": "en",
            "recommendation": {
                "action": "WAIT",
                "message": "Test recommendation",
                "confidence": 42,
                "risk_level": "HIGH",
            },
        }

    def _payload_with(self, **updates) -> dict:
        payload = self._sample_payload()
        recommendation = payload.get("recommendation", {}).copy()
        if "recommendation_action" in updates:
            recommendation["action"] = updates.pop("recommendation_action")
        if "recommendation_risk" in updates:
            recommendation["risk_level"] = updates.pop("recommendation_risk")
        if "recommendation_confidence" in updates:
            recommendation["confidence"] = updates.pop("recommendation_confidence")
        payload["recommendation"] = recommendation
        payload.update(updates)
        return payload

    def test_save_get_and_delete_report(self) -> None:
        report_id = report_storage.save_report(self._sample_payload())
        self.assertEqual(len(report_id), 8)

        reports = report_storage.get_all_reports()
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]["id"], report_id)

        fetched = report_storage.get_report_by_id(report_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["crop"], "Wheat")

        deleted = report_storage.delete_report_by_id(report_id)
        self.assertTrue(deleted)
        self.assertIsNone(report_storage.get_report_by_id(report_id))
        self.assertEqual(report_storage.get_all_reports(), [])

    def test_legacy_json_migration_on_first_init(self) -> None:
        legacy_reports = [
            {
                "id": "legacy01",
                "crop": "Tomato",
                "mandi": "Mumbai",
                "date": "2026-04-01",
                "time": "09:15",
                "recommendation": "HOLD",
                "confidence": 55,
                "risk_level": "MEDIUM",
                "current_price": 1800,
                "predicted_change": 1.3,
                "trend_direction": "up",
                "volatility_level": "Medium",
                "shock_alert": None,
                "insights": ["Legacy data"],
                "forecast": [],
                "nearby_mandis": [],
                "language": "en",
            }
        ]
        self.legacy_path.write_text(
            json.dumps(legacy_reports, ensure_ascii=False),
            encoding="utf-8",
        )

        reports = report_storage.get_all_reports()
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]["id"], "legacy01")

        status = report_storage.get_report_store_status()
        self.assertEqual(status["backend"], "sqlite")
        self.assertEqual(status["total_reports"], 1)

    def test_query_reports_with_filters_sort_and_pagination(self) -> None:
        report_storage.save_report(
            self._payload_with(
                crop="Wheat",
                mandi="Delhi",
                current_price=2500,
                recommendation_action="WAIT",
                recommendation_risk="HIGH",
                recommendation_confidence=42,
            )
        )
        report_storage.save_report(
            self._payload_with(
                crop="Tomato",
                mandi="Mumbai",
                current_price=3200,
                recommendation_action="SELL NOW",
                recommendation_risk="MEDIUM",
                recommendation_confidence=65,
            )
        )
        report_storage.save_report(
            self._payload_with(
                crop="Onion",
                mandi="Pune",
                current_price=2100,
                recommendation_action="HOLD",
                recommendation_risk="LOW",
                recommendation_confidence=55,
            )
        )

        filtered = report_storage.query_reports(
            q="to",
            recommendation="SELL NOW",
            risk_level="MEDIUM",
            sort="price",
            limit=10,
            offset=0,
        )
        self.assertEqual(filtered["total"], 1)
        self.assertEqual(filtered["reports"][0]["crop"], "Tomato")

        paged = report_storage.query_reports(sort="conf", limit=1, offset=1)
        self.assertEqual(paged["total"], 3)
        self.assertEqual(len(paged["reports"]), 1)


if __name__ == "__main__":
    unittest.main()
