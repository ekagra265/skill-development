"use client";

import { useState } from "react";
import { Save, Download, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { saveReport, getReportDownloadUrl } from "@/lib/api";
import type { ForecastResponse } from "@/lib/types";

interface SaveReportBtnProps {
  forecastData: ForecastResponse;
}

type Status = "idle" | "saving" | "saved" | "error";

export function SaveReportBtn({ forecastData }: SaveReportBtnProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [reportId, setReportId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    try {
      const data = await saveReport(forecastData);
      setReportId(data.report_id);
      setStatus("saved");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to save";
      const requiresLogin =
        /token|unauthorized|missing bearer|invalid token|expired/i.test(raw);
      setErrorMsg(
        requiresLogin
          ? "Login required for report actions. Open /login and sign in."
          : raw
      );
      setStatus("error");
    }
  }

  function handleDownload() {
    if (!reportId) return;
    const url = getReportDownloadUrl(reportId);
    window.open(url, "_blank");
  }

  if (status === "saved" && reportId) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 py-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm font-semibold text-success">
            Report saved! #{reportId}
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">
            {errorMsg || "Save failed. Is the backend running?"}
          </span>
        </div>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm font-medium text-muted-foreground underline transition-colors hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={status === "saving"}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {status === "saving" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 text-primary" />
          Save Report
        </>
      )}
    </button>
  );
}
