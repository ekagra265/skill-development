"""
Report storage service.
Saves forecasts in SQLite and generates PDF reports using reportlab.
Legacy JSON data (data/reports.json) is migrated automatically on first run.
"""
from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Optional

_HERE = Path(__file__).resolve()
_DATA_DIR = _HERE.parents[3] / "data"
REPORTS_DB_PATH = Path(
    os.getenv("AGRIPULSE_REPORTS_DB_PATH", str(_DATA_DIR / "reports.db"))
).resolve()
LEGACY_REPORTS_FILE = Path(
    os.getenv("AGRIPULSE_REPORTS_JSON_PATH", str(_DATA_DIR / "reports.json"))
).resolve()

_MAX_REPORTS = 200
_INIT_LOCK = Lock()
_INITIALIZED = False
_VALID_RECOMMENDATIONS = {"WAIT", "SELL NOW", "HOLD"}
_VALID_RISK_LEVELS = {"LOW", "MEDIUM", "HIGH"}
_LEGACY_OWNER = "legacy"


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _connect() -> sqlite3.Connection:
    _ensure_parent(REPORTS_DB_PATH)
    conn = sqlite3.connect(REPORTS_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _coerce_int(value: object, default: int = 0) -> int:
    try:
        return int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _coerce_float(value: object, default: float = 0.0) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _normalize_owner(owner_username: str | None) -> str | None:
    if owner_username is None:
        return None
    normalized = owner_username.strip()
    return normalized or None


def _extract_index_fields(report: dict) -> tuple[str, str, str, str, float, int]:
    recommendation = str(report.get("recommendation", "")).upper().strip()
    risk_level = str(report.get("risk_level", "")).upper().strip()
    return (
        str(report.get("crop", "")).strip(),
        str(report.get("mandi", "")).strip(),
        recommendation if recommendation in _VALID_RECOMMENDATIONS else "",
        risk_level if risk_level in _VALID_RISK_LEVELS else "",
        _coerce_float(report.get("current_price"), 0.0),
        _coerce_int(report.get("confidence"), 0),
    )


def _ensure_report_columns(conn: sqlite3.Connection) -> None:
    existing = {
        row["name"] for row in conn.execute("PRAGMA table_info(reports)").fetchall()
    }
    desired: dict[str, str] = {
        "owner_username": "TEXT",
        "crop": "TEXT",
        "mandi": "TEXT",
        "recommendation": "TEXT",
        "risk_level": "TEXT",
        "current_price": "REAL",
        "confidence": "INTEGER",
    }
    for column, sql_type in desired.items():
        if column not in existing:
            conn.execute(f"ALTER TABLE reports ADD COLUMN {column} {sql_type}")

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reports_crop_mandi ON reports(crop, mandi)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reports_owner_created_at ON reports(owner_username, created_at DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reports_recommendation ON reports(recommendation)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_reports_risk_level ON reports(risk_level)"
    )


def _backfill_report_columns(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        """
        SELECT id, payload
        FROM reports
        WHERE owner_username IS NULL OR crop IS NULL OR mandi IS NULL OR recommendation IS NULL
           OR risk_level IS NULL OR current_price IS NULL OR confidence IS NULL
        """
    ).fetchall()
    for row in rows:
        try:
            payload = json.loads(row["payload"])
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        owner_username = _normalize_owner(payload.get("owner_username")) or _LEGACY_OWNER
        payload["owner_username"] = owner_username
        payload_json = json.dumps(payload, ensure_ascii=False)
        crop, mandi, recommendation, risk_level, current_price, confidence = (
            _extract_index_fields(payload)
        )
        conn.execute(
            """
            UPDATE reports
            SET payload = ?, owner_username = ?, crop = ?, mandi = ?, recommendation = ?, risk_level = ?,
                current_price = ?, confidence = ?
            WHERE id = ?
            """,
            (
                payload_json,
                owner_username,
                crop,
                mandi,
                recommendation,
                risk_level,
                current_price,
                confidence,
                row["id"],
            ),
        )


def _build_report(data: dict, report_id: str, owner_username: str) -> dict:
    rec = data.get("recommendation") or {}
    now = datetime.now()
    return {
        "id": report_id,
        "owner_username": owner_username,
        "crop": str(data.get("crop", "")),
        "mandi": str(data.get("mandi", "")),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M"),
        "recommendation": str(rec.get("action", "")),
        "recommendation_message": str(rec.get("message", "")),
        "confidence": _coerce_int(rec.get("confidence"), 0),
        "risk_level": str(rec.get("risk_level", "")),
        "current_price": _coerce_float(data.get("current_price"), 0.0),
        "predicted_change": round(_coerce_float(data.get("expected_change_pct"), 0.0), 2),
        "trend_direction": str(data.get("trend_direction", "")),
        "volatility_level": str(data.get("volatility_level", "")),
        "shock_alert": data.get("shock_alert"),
        "insights": data.get("insights", []),
        "forecast": data.get("forecast", []),
        "nearby_mandis": data.get("nearby_mandis", []),
        "language": str(data.get("language", "en")),
    }


def _parse_created_at(report: dict) -> str:
    date_value = str(report.get("date", "")).strip()
    time_value = str(report.get("time", "")).strip() or "00:00"
    if date_value:
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(f"{date_value} {time_value}", fmt).isoformat()
            except ValueError:
                continue
    return datetime.now().isoformat()


def _load_legacy_reports() -> list[dict]:
    if not LEGACY_REPORTS_FILE.exists():
        return []
    try:
        payload = json.loads(LEGACY_REPORTS_FILE.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            return [item for item in payload if isinstance(item, dict)]
    except Exception:
        pass
    return []


def _initialize() -> None:
    global _INITIALIZED
    if _INITIALIZED:
        return

    with _INIT_LOCK:
        if _INITIALIZED:
            return

        with _connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS reports (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    owner_username TEXT,
                    crop TEXT,
                    mandi TEXT,
                    recommendation TEXT,
                    risk_level TEXT,
                    current_price REAL,
                    confidence INTEGER
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)"
            )
            _ensure_report_columns(conn)

            existing_count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
            if not existing_count:
                for raw in _load_legacy_reports():
                    legacy_id = str(raw.get("id") or uuid.uuid4())[:8]
                    owner_username = (
                        _normalize_owner(raw.get("owner_username")) or _LEGACY_OWNER
                    )
                    payload_with_owner = dict(raw)
                    payload_with_owner["owner_username"] = owner_username
                    (
                        crop,
                        mandi,
                        recommendation,
                        risk_level,
                        current_price,
                        confidence,
                    ) = _extract_index_fields(raw)
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO reports(
                            id, created_at, payload, owner_username, crop, mandi, recommendation,
                            risk_level, current_price, confidence
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            legacy_id,
                            _parse_created_at(raw),
                            json.dumps(payload_with_owner, ensure_ascii=False),
                            owner_username,
                            crop,
                            mandi,
                            recommendation,
                            risk_level,
                            current_price,
                            confidence,
                        ),
                    )
            _backfill_report_columns(conn)
            conn.commit()

        _INITIALIZED = True


def save_report(data: dict, owner_username: str) -> str:
    """
    Save a ForecastResponse dict as a report and return the new report ID.
    """
    _initialize()
    owner = _normalize_owner(owner_username)
    if owner is None:
        raise ValueError("owner_username is required")
    report_id = str(uuid.uuid4())[:8]
    report = _build_report(data, report_id, owner)
    crop, mandi, recommendation, risk_level, current_price, confidence = (
        _extract_index_fields(report)
    )

    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO reports(
                id, created_at, payload, owner_username, crop, mandi, recommendation,
                risk_level, current_price, confidence
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                datetime.now().isoformat(),
                json.dumps(report, ensure_ascii=False),
                owner,
                crop,
                mandi,
                recommendation,
                risk_level,
                current_price,
                confidence,
            ),
        )
        conn.execute(
            """
            DELETE FROM reports
            WHERE id IN (
                SELECT id
                FROM reports
                ORDER BY created_at DESC
                LIMIT -1 OFFSET ?
            )
            """,
            (_MAX_REPORTS,),
        )
        conn.commit()
    return report_id


def get_all_reports(owner_username: str | None = None) -> list:
    _initialize()
    owner = _normalize_owner(owner_username)
    with _connect() as conn:
        if owner is None:
            rows = conn.execute(
                "SELECT payload FROM reports ORDER BY created_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT payload FROM reports WHERE owner_username = ? ORDER BY created_at DESC",
                (owner,),
            ).fetchall()
    reports: list[dict] = []
    for row in rows:
        try:
            reports.append(json.loads(row["payload"]))
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
    return reports


def query_reports(
    owner_username: str | None = None,
    q: str | None = None,
    recommendation: str | None = None,
    risk_level: str | None = None,
    sort: str = "date",
    limit: int = 20,
    offset: int = 0,
) -> dict:
    _initialize()
    where_clauses: list[str] = []
    params: list[object] = []
    owner = _normalize_owner(owner_username)

    if owner is not None:
        where_clauses.append("owner_username = ?")
        params.append(owner)

    if q and q.strip():
        needle = f"%{q.strip().lower()}%"
        where_clauses.append("(lower(crop) LIKE ? OR lower(mandi) LIKE ?)")
        params.extend([needle, needle])

    normalized_recommendation = (recommendation or "").strip().upper()
    if normalized_recommendation in _VALID_RECOMMENDATIONS:
        where_clauses.append("recommendation = ?")
        params.append(normalized_recommendation)

    normalized_risk = (risk_level or "").strip().upper()
    if normalized_risk in _VALID_RISK_LEVELS:
        where_clauses.append("risk_level = ?")
        params.append(normalized_risk)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    order_sql = {
        "date": "created_at DESC",
        "price": "current_price DESC, created_at DESC",
        "conf": "confidence DESC, created_at DESC",
    }.get(sort, "created_at DESC")

    safe_limit = max(1, min(int(limit), 100))
    safe_offset = max(0, int(offset))

    with _connect() as conn:
        total = int(
            conn.execute(f"SELECT COUNT(*) FROM reports {where_sql}", tuple(params)).fetchone()[0]
        )
        rows = conn.execute(
            f"""
            SELECT payload
            FROM reports
            {where_sql}
            ORDER BY {order_sql}
            LIMIT ? OFFSET ?
            """,
            tuple(params + [safe_limit, safe_offset]),
        ).fetchall()

    reports: list[dict] = []
    for row in rows:
        try:
            reports.append(json.loads(row["payload"]))
        except (TypeError, ValueError, json.JSONDecodeError):
            continue

    return {
        "reports": reports,
        "total": total,
        "limit": safe_limit,
        "offset": safe_offset,
    }


def get_report_by_id(report_id: str, owner_username: str | None = None) -> Optional[dict]:
    _initialize()
    owner = _normalize_owner(owner_username)
    with _connect() as conn:
        if owner is None:
            row = conn.execute(
                "SELECT payload FROM reports WHERE id = ?",
                (report_id,),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT payload FROM reports WHERE id = ? AND owner_username = ?",
                (report_id, owner),
            ).fetchone()
    if row is None:
        return None
    try:
        return json.loads(row["payload"])
    except (TypeError, ValueError, json.JSONDecodeError):
        return None


def delete_report_by_id(report_id: str, owner_username: str | None = None) -> bool:
    _initialize()
    owner = _normalize_owner(owner_username)
    with _connect() as conn:
        if owner is None:
            cursor = conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        else:
            cursor = conn.execute(
                "DELETE FROM reports WHERE id = ? AND owner_username = ?",
                (report_id, owner),
            )
        conn.commit()
    return cursor.rowcount > 0


def get_report_store_status() -> dict:
    _initialize()
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    return {
        "backend": "sqlite",
        "path": str(REPORTS_DB_PATH),
        "total_reports": int(total),
    }


def _escape_pdf_text(value: str) -> str:
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", " ")
        .replace("\n", " ")
    )


def _generate_simple_pdf(lines: list[str]) -> bytes:
    page_width = 595
    page_height = 842
    left = 40
    top = 800
    line_height = 14

    commands = ["BT", "/F1 10 Tf", f"{left} {top} Td"]
    for i, line in enumerate(lines):
        if i > 0:
            commands.append(f"0 -{line_height} Td")
        commands.append(f"({_escape_pdf_text(line)}) Tj")
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj\n",
        (
            f"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_width} {page_height}] "
            "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n"
        ).encode("ascii"),
        b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
        (
            f"5 0 obj << /Length {len(stream)} >> stream\n".encode("ascii")
            + stream
            + b"\nendstream\nendobj\n"
        ),
    ]

    pdf = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets: list[int] = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj

    xref_pos = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")

    pdf += (
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode("ascii")
    return pdf


def _fallback_pdf(report: dict) -> bytes:
    lines = [
        "AGRIPULSE FORECAST REPORT",
        f"Report ID: #{report.get('id', '')}",
        f"Date: {report.get('date', '')} {report.get('time', '')}",
        "-" * 56,
        f"Crop            : {report.get('crop', '')}",
        f"Mandi           : {report.get('mandi', '')}",
        f"Current Price   : Rs. {report.get('current_price', 0):,}/q",
        f"Expected Change : {report.get('predicted_change', 0)}%",
        f"Confidence      : {report.get('confidence', 0)}%",
        f"Recommendation  : {report.get('recommendation', '')}",
        f"Risk Level      : {report.get('risk_level', '')}",
        "-" * 56,
        "INSIGHTS:",
    ] + [f"- {item}" for item in report.get("insights", [])]
    return _generate_simple_pdf(lines)


def generate_pdf(report: dict) -> bytes:
    """
    Generate a PDF for the given report dict.
    Requires: pip install reportlab
    """
    try:
        from io import BytesIO
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
        )

        buf = BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            leftMargin=2 * cm, rightMargin=2 * cm,
            topMargin=2 * cm, bottomMargin=2 * cm,
        )

        GREEN = colors.HexColor("#16803c")   # matches --color-primary
        DARK  = colors.HexColor("#0f1a12")   # matches --color-foreground
        GRAY  = colors.HexColor("#5a6e60")   # matches --color-muted-foreground
        LIGHT = colors.HexColor("#e8f5ec")   # matches --color-secondary

        styles = getSampleStyleSheet()
        title_s   = ParagraphStyle("T",  parent=styles["Normal"], fontSize=22, fontName="Helvetica-Bold",  textColor=DARK,  spaceAfter=4)
        sub_s     = ParagraphStyle("S",  parent=styles["Normal"], fontSize=10, fontName="Helvetica",       textColor=GRAY,  spaceAfter=14)
        head_s    = ParagraphStyle("H",  parent=styles["Normal"], fontSize=13, fontName="Helvetica-Bold",  textColor=GREEN, spaceBefore=16, spaceAfter=8)
        body_s    = ParagraphStyle("B",  parent=styles["Normal"], fontSize=10, fontName="Helvetica",       textColor=DARK,  spaceAfter=4, leading=15)
        small_s   = ParagraphStyle("Sm", parent=styles["Normal"], fontSize=8,  fontName="Helvetica",       textColor=GRAY)

        rec = report.get("recommendation", "N/A")
        rec_color = (
            colors.HexColor("#16a34a") if rec == "WAIT" else
            colors.HexColor("#dc2626") if rec == "SELL NOW" else
            colors.HexColor("#f59e0b")
        )
        change = report.get("predicted_change", 0)
        change_str = f"+{change}%" if change >= 0 else f"{change}%"

        story = []

        # ── Header ──────────────────────────────────────────────────
        story.append(Paragraph("AgriPulse Forecast Report", title_s))
        story.append(Paragraph(
            f"Generated: {report.get('date', '')} {report.get('time', '')}  |  "
            f"Report ID: #{report.get('id', '')}",
            small_s,
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#dce5df"), spaceAfter=16))

        # ── Details table ────────────────────────────────────────────
        story.append(Paragraph("Forecast Details", head_s))
        det = Table(
            [
                ["Crop", report.get("crop", "—"), "Mandi", report.get("mandi", "—")],
                ["Date", report.get("date", "—"),  "Risk",  report.get("risk_level", "—")],
            ],
            colWidths=[2.5 * cm, 6.5 * cm, 2.5 * cm, 6.5 * cm],
        )
        det.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), LIGHT),
            ("BACKGROUND", (2, 0), (2, -1), LIGHT),
            ("FONTNAME",   (0, 0), (-1, -1), "Helvetica"),
            ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME",   (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, -1), 10),
            ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#dce5df")),
            ("PADDING",    (0, 0), (-1, -1), 8),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(det)

        # ── Price summary ────────────────────────────────────────────
        story.append(Paragraph("Price Summary", head_s))
        price_tbl = Table(
            [
                ["Current Price", "Expected Change", "Confidence", "Recommendation"],
                [
                    f"Rs. {report.get('current_price', 0):,}/q",
                    change_str,
                    f"{report.get('confidence', 0)}%",
                    rec,
                ],
            ],
            colWidths=[4.5 * cm] * 4,
        )
        price_tbl.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, 1), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, -1), 11),
            ("ALIGN",       (0, 0), (-1, -1), "CENTER"),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#dce5df")),
            ("PADDING",     (0, 0), (-1, -1), 10),
            ("TEXTCOLOR",   (3, 1), (3, 1), rec_color),
            ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(price_tbl)

        # ── Recommendation ───────────────────────────────────────────
        story.append(Paragraph("AI Recommendation", head_s))
        story.append(Paragraph(
            f"<b>Action: {rec}</b> — {report.get('recommendation_message', '')}",
            body_s,
        ))

        # ── Insights ─────────────────────────────────────────────────
        insights = report.get("insights", [])
        if insights:
            story.append(Paragraph("Market Insights", head_s))
            for i, ins in enumerate(insights[:6], 1):
                story.append(Paragraph(f"{i}. {ins}", body_s))

        # ── Footer ───────────────────────────────────────────────────
        story.append(Spacer(1, 20))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#dce5df")))
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "AgriPulse — AI-Powered Agricultural Market Intelligence | Built for Indian Farmers",
            small_s,
        ))
        story.append(Paragraph(
            "Disclaimer: For informational purposes only. Prices may vary by market conditions.",
            small_s,
        ))

        doc.build(story)
        return buf.getvalue()

    except Exception:
        # Keep downloads valid even when reportlab is unavailable or errors.
        return _fallback_pdf(report)
