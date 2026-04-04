import type { ForecastRequest, ForecastResponse, BestMandiResponse } from "./types";

type MetadataResponse = {
  states: string[];
  commodities: string[];
  cropPrices: {
    name: string;
    price: number;
    change: number;
    trend: "up" | "down" | "flat";
  }[];
};

export type SavedReport = {
  id: string;
  crop: string;
  mandi: string;
  date: string;
  time: string;
  recommendation: string;
  recommendation_message: string;
  confidence: number;
  risk_level: string;
  current_price: number;
  predicted_change: number;
  trend_direction: string;
  volatility_level: string;
  shock_alert: string | null;
  insights: string[];
  forecast: ForecastResponse["forecast"];
  nearby_mandis: ForecastResponse["nearby_mandis"];
  language: string;
};

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const RAW_API_KEY = process.env.NEXT_PUBLIC_API_KEY?.trim() ?? "";

if (!RAW_API_BASE_URL) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_BASE_URL");
}

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
const API_KEY = RAW_API_KEY;

const authHeaders: HeadersInit = API_KEY ? { "X-API-Key": API_KEY } : {};
const jsonAuthHeaders: HeadersInit = API_KEY
  ? { "Content-Type": "application/json", "X-API-Key": API_KEY }
  : { "Content-Type": "application/json" };

async function readError(res: Response, fallback: string): Promise<never> {
  const error = await res.json().catch(() => ({ detail: fallback }));
  throw new Error(error.detail || `Request failed with status ${res.status}`);
}

export async function fetchForecast(
  payload: ForecastRequest
): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE_URL}/forecast`, {
    method: "POST",
    headers: jsonAuthHeaders,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return readError(res, "Forecast request failed");
  }
  return res.json();
}

export async function fetchMetadata(topCrops?: number): Promise<MetadataResponse> {
  const query = new URLSearchParams();
  if (typeof topCrops === "number" && Number.isFinite(topCrops) && topCrops > 0) {
    query.set("top_crops", String(Math.trunc(topCrops)));
  }
  const path = query.toString() ? `/metadata?${query}` : "/metadata";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    return readError(res, "Metadata request failed");
  }
  return res.json();
}

export async function fetchMarketsForCommodity(
  commodity: string
): Promise<{ commodity: string; markets: string[] }> {
  const res = await fetch(
    `${API_BASE_URL}/metadata?commodity=${encodeURIComponent(commodity)}`,
    { headers: authHeaders }
  );
  if (!res.ok) {
    return readError(res, "Markets request failed");
  }
  return res.json();
}

export async function fetchBestMandi(
  state: string,
  commodity: string,
  days = 7,
  limit = 3
): Promise<BestMandiResponse> {
  const params = new URLSearchParams({
    state,
    commodity,
    days: String(days),
    limit: String(limit),
  });
  const res = await fetch(`${API_BASE_URL}/best-mandi?${params}`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    return readError(res, "Best mandi request failed");
  }
  return res.json();
}

// ─── NEW: Report API functions ────────────────────────────────────────────────

export async function saveReport(
  forecastData: ForecastResponse
): Promise<{ success: boolean; report_id: string }> {
  const res = await fetch(`${API_BASE_URL}/reports/save`, {
    method: "POST",
    headers: jsonAuthHeaders,
    body: JSON.stringify(forecastData),
  });
  if (!res.ok) {
    return readError(res, "Failed to save report");
  }
  return res.json();
}

export async function fetchReportHistory(): Promise<{
  reports: SavedReport[];
  total: number;
}> {
  const res = await fetch(`${API_BASE_URL}/reports/history`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    return readError(res, "Failed to fetch report history");
  }
  return res.json();
}

export function getReportDownloadUrl(reportId: string): string {
  const url = new URL(`${API_BASE_URL}/reports/download/${reportId}`);
  if (API_KEY) {
    url.searchParams.set("x_api_key", API_KEY);
  }
  return url.toString();
}

export async function deleteReport(reportId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (!res.ok) {
    return readError(res, "Failed to delete report");
  }
}
