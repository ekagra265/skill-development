import type { ForecastRequest, ForecastResponse, BestMandiResponse } from "./types";

/** All requests now go to the local Next.js API routes that read the CSV dataset directly. */

export async function fetchForecast(
  payload: ForecastRequest
): Promise<ForecastResponse> {
  const res = await fetch("/api/forecast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Forecast request failed" }));
    throw new Error(
      error.detail || `Request failed with status ${res.status}`
    );
  }
  return res.json();
}

export async function fetchMetadata(): Promise<{
  states: string[];
  commodities: string[];
  cropPrices: {
    name: string;
    price: number;
    change: number;
    trend: "up" | "down" | "flat";
  }[];
}> {
  const res = await fetch("/api/metadata");
  if (!res.ok) throw new Error("Failed to load metadata");
  return res.json();
}

export async function fetchMarketsForCommodity(
  commodity: string
): Promise<{ commodity: string; markets: string[] }> {
  const res = await fetch(
    `/api/metadata?commodity=${encodeURIComponent(commodity)}`
  );
  if (!res.ok) throw new Error("Failed to load markets");
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
  const res = await fetch(`/api/best-mandi?${params}`);
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ detail: "Best mandi request failed" }));
    throw new Error(
      error.detail || `Request failed with status ${res.status}`
    );
  }
  return res.json();
}
