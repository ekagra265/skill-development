"""
Report storage service.
Saves forecasts as JSON and generates PDF reports using reportlab.
Reports are stored at: backend/data/reports.json
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime
from typing import Optional

# Path: agripulse/backend/data/reports.json
_HERE = os.path.dirname(os.path.abspath(__file__))
REPORTS_FILE = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "data", "reports.json"))


def _ensure_dir() -> None:
    os.makedirs(os.path.dirname(REPORTS_FILE), exist_ok=True)


def _load() -> list:
    _ensure_dir()
    if not os.path.exists(REPORTS_FILE):
        return []
    try:
        with open(REPORTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _dump(reports: list) -> None:
    _ensure_dir()
    with open(REPORTS_FILE, "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2, ensure_ascii=False)


def save_report(data: dict) -> str:
    """
    Save a ForecastResponse dict as a report.
    data matches your ForecastResponse schema from schemas.py.
    Returns the new report ID.
    """
    reports = _load()
    report_id = str(uuid.uuid4())[:8]

    # Safely extract nested recommendation block (matches RecommendationResult)
    rec = data.get("recommendation") or {}

    report = {
        "id": report_id,
        "crop": data.get("crop", ""),
        "mandi": data.get("mandi", ""),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%H:%M"),
        # From recommendation block
        "recommendation": rec.get("action", ""),
        "recommendation_message": rec.get("message", ""),
        "confidence": rec.get("confidence", 0),
        "risk_level": rec.get("risk_level", ""),
        # Price fields from ForecastResponse
        "current_price": data.get("current_price", 0),
        "predicted_change": round(float(data.get("expected_change_pct", 0)), 2),
        "trend_direction": data.get("trend_direction", ""),
        "volatility_level": data.get("volatility_level", ""),
        "shock_alert": data.get("shock_alert"),
        "insights": data.get("insights", []),
        "forecast": data.get("forecast", []),
        "nearby_mandis": data.get("nearby_mandis", []),
        "language": data.get("language", "en"),
    }

    reports.insert(0, report)   # newest first
    reports = reports[:200]     # cap at 200
    _dump(reports)
    return report_id


def get_all_reports() -> list:
    return _load()


def get_report_by_id(report_id: str) -> Optional[dict]:
    return next((r for r in _load() if r["id"] == report_id), None)


def delete_report_by_id(report_id: str) -> bool:
    reports = _load()
    updated = [r for r in reports if r["id"] != report_id]
    if len(updated) == len(reports):
        return False
    _dump(updated)
    return True


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
