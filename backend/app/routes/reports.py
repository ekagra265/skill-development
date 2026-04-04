"""
Reports API routes.
Matches the auth pattern used in the rest of your main.py (require_api_key dependency).
"""
from __future__ import annotations

from typing import Literal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app.core.dependencies import require_api_key
from app.services.report_storage import (
    delete_report_by_id,
    generate_pdf,
    get_report_by_id,
    query_reports,
    save_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])

Auth = Annotated[None, Depends(require_api_key)]


@router.post("/save")
async def save_forecast_report(payload: dict, _: Auth) -> dict:
    """
    Save a forecast result as a report.
    Accepts the full ForecastResponse JSON body sent from the frontend.
    """
    try:
        report_id = save_report(payload)
        return {"success": True, "report_id": report_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/history")
async def get_report_history(
    _: Auth,
    q: str | None = None,
    recommendation: str | None = None,
    risk_level: str | None = Query(default=None, alias="riskLevel"),
    sort: Literal["date", "price", "conf"] = "date",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict:
    """Return paginated report history with optional filters."""
    try:
        return query_reports(
            q=q,
            recommendation=recommendation,
            risk_level=risk_level,
            sort=sort,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/download/{report_id}")
async def download_report_pdf(report_id: str, _: Auth) -> Response:
    """Download a specific report as a PDF file."""
    report = get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")
    try:
        pdf_bytes = generate_pdf(report)
        filename = f"agripulse_{report['crop']}_{report['date']}_{report_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}") from exc


@router.delete("/{report_id}")
async def delete_report(report_id: str, _: Auth) -> dict:
    """Delete a saved report by ID."""
    deleted = delete_report_by_id(report_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Report '{report_id}' not found")
    return {"success": True, "deleted_id": report_id}
