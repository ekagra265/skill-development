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

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const RAW_API_KEY = process.env.NEXT_PUBLIC_API_KEY?.trim();

if (!RAW_API_BASE_URL) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_BASE_URL");
}
if (!RAW_API_KEY) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_KEY");
}

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
const API_KEY = RAW_API_KEY;

const authHeaders: HeadersInit = { "X-API-Key": API_KEY };
const jsonAuthHeaders: HeadersInit = {
  "Content-Type": "application/json",
  "X-API-Key": API_KEY,
};

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

export async function fetchMetadata(): Promise<MetadataResponse> {
  const res = await fetch(`${API_BASE_URL}/metadata`, {
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
    {
      headers: authHeaders,
    }
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
