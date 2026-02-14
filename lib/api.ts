import type { ForecastRequest, ForecastResponse, BestMandiResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const API_KEY =
  process.env.NEXT_PUBLIC_API_KEY || "agripulse-dev-key";

const headers: HeadersInit = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
};

export async function fetchForecast(
  payload: ForecastRequest
): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE_URL}/forecast`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Forecast request failed" }));
    throw new Error(error.detail || `Request failed with status ${res.status}`);
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
  const res = await fetch(`${API_BASE_URL}/best-mandi?${params}`, { headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Best mandi request failed" }));
    throw new Error(error.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function checkHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}
