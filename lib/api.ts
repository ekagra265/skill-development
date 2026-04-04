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

export type ReportHistoryParams = {
  q?: string;
  recommendation?: "WAIT" | "SELL NOW" | "HOLD";
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  sort?: "date" | "price" | "conf";
  limit?: number;
  offset?: number;
};

export type ReportHistoryResponse = {
  reports: SavedReport[];
  total: number;
  limit: number;
  offset: number;
};

export type AuthUser = {
  username: string;
  role: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_expires_in: number;
  user: AuthUser;
};

const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const RAW_API_KEY = process.env.NEXT_PUBLIC_API_KEY?.trim() ?? "";
const METADATA_CACHE_TTL_MS = 15_000;
const METADATA_TIMEOUT_MS = 8_000;
const FORECAST_TIMEOUT_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 12_000;
const ACCESS_TOKEN_KEY = "agripulse_access_token";
const REFRESH_TOKEN_KEY = "agripulse_refresh_token";

const metadataCache = new Map<string, { ts: number; data: MetadataResponse }>();
const metadataInflight = new Map<string, Promise<MetadataResponse>>();

if (!RAW_API_BASE_URL) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_BASE_URL");
}

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");
const API_KEY = RAW_API_KEY;

const authHeaders: HeadersInit = API_KEY ? { "X-API-Key": API_KEY } : {};
const jsonAuthHeaders: HeadersInit = API_KEY
  ? { "Content-Type": "application/json", "X-API-Key": API_KEY }
  : { "Content-Type": "application/json" };

function getAccessTokenFromStorage(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

function getRefreshTokenFromStorage(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";
}

function buildReportHeaders(json = false): HeadersInit {
  const token = getAccessTokenFromStorage().trim();
  const headers: Record<string, string> = {};
  if (json) headers["Content-Type"] = "application/json";
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function storeAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  const clean = token.trim();
  if (!clean) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, clean);
}

function storeRefreshToken(token: string): void {
  if (typeof window === "undefined") return;
  const clean = token.trim();
  if (!clean) return;
  window.localStorage.setItem(REFRESH_TOKEN_KEY, clean);
}

function storeAuthTokens(payload: LoginResponse): void {
  storeAccessToken(payload.access_token);
  storeRefreshToken(payload.refresh_token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessTokenFromStorage().trim());
}

function hasRefreshToken(): boolean {
  return Boolean(getRefreshTokenFromStorage().trim());
}

async function readError(res: Response, fallback: string): Promise<never> {
  const error = await res.json().catch(() => ({ detail: fallback }));
  throw new Error(error.detail || `Request failed with status ${res.status}`);
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function refreshAccessToken(): Promise<void> {
  const refreshToken = getRefreshTokenFromStorage().trim();
  if (!refreshToken) {
    throw new Error("Missing refresh token.");
  }

  const res = await fetchWithTimeout(
    `${API_BASE_URL}/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    DEFAULT_TIMEOUT_MS
  );
  if (!res.ok) {
    clearAccessToken();
    return readError(res, "Session refresh failed");
  }
  const payload = (await res.json()) as LoginResponse;
  storeAuthTokens(payload);
}

async function fetchWithAuthRetry(
  makeRequest: () => Promise<Response>
): Promise<Response> {
  let res = await makeRequest();
  if (res.status !== 401 || !hasRefreshToken()) {
    return res;
  }
  try {
    await refreshAccessToken();
  } catch {
    return res;
  }
  res = await makeRequest();
  return res;
}

export async function fetchForecast(
  payload: ForecastRequest
): Promise<ForecastResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/forecast`,
    {
      method: "POST",
      headers: jsonAuthHeaders,
      body: JSON.stringify(payload),
    },
    FORECAST_TIMEOUT_MS
  );
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
  const cacheKey = path;
  const cached = metadataCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < METADATA_CACHE_TTL_MS) {
    return cached.data;
  }

  const inflight = metadataInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      { headers: authHeaders },
      METADATA_TIMEOUT_MS
    );
    if (!res.ok) {
      return readError(res, "Metadata request failed");
    }
    const data = (await res.json()) as MetadataResponse;
    metadataCache.set(cacheKey, { ts: Date.now(), data });
    return data;
  })();

  metadataInflight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    metadataInflight.delete(cacheKey);
  }
}

export async function fetchMarketsForCommodity(
  commodity: string
): Promise<{ commodity: string; markets: string[] }> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/metadata?commodity=${encodeURIComponent(commodity)}`,
    { headers: authHeaders },
    METADATA_TIMEOUT_MS
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
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/best-mandi?${params}`,
    { headers: authHeaders },
    DEFAULT_TIMEOUT_MS
  );
  if (!res.ok) {
    return readError(res, "Best mandi request failed");
  }
  return res.json();
}

// ─── NEW: Report API functions ────────────────────────────────────────────────

export async function saveReport(
  forecastData: ForecastResponse
): Promise<{ success: boolean; report_id: string }> {
  const res = await fetchWithAuthRetry(() =>
    fetchWithTimeout(
      `${API_BASE_URL}/reports/save`,
      {
        method: "POST",
        headers: buildReportHeaders(true),
        body: JSON.stringify(forecastData),
      },
      DEFAULT_TIMEOUT_MS
    )
  );
  if (!res.ok) {
    return readError(res, "Failed to save report");
  }
  return res.json();
}

export async function fetchReportHistory(
  params: ReportHistoryParams = {}
): Promise<ReportHistoryResponse> {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.recommendation) query.set("recommendation", params.recommendation);
  if (params.riskLevel) query.set("riskLevel", params.riskLevel);
  if (params.sort) query.set("sort", params.sort);
  if (typeof params.limit === "number" && Number.isFinite(params.limit)) {
    query.set("limit", String(Math.trunc(params.limit)));
  }
  if (typeof params.offset === "number" && Number.isFinite(params.offset)) {
    query.set("offset", String(Math.trunc(params.offset)));
  }
  const path = query.toString() ? `/reports/history?${query}` : "/reports/history";

  const res = await fetchWithAuthRetry(() =>
    fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      { headers: buildReportHeaders(false) },
      DEFAULT_TIMEOUT_MS
    )
  );
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
  const token = getAccessTokenFromStorage().trim();
  if (token) {
    url.searchParams.set("access_token", token);
  }
  return url.toString();
}

export async function deleteReport(reportId: string): Promise<void> {
  const res = await fetchWithAuthRetry(() =>
    fetchWithTimeout(
      `${API_BASE_URL}/reports/${reportId}`,
      {
        method: "DELETE",
        headers: buildReportHeaders(false),
      },
      DEFAULT_TIMEOUT_MS
    )
  );
  if (!res.ok) {
    return readError(res, "Failed to delete report");
  }
}

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    DEFAULT_TIMEOUT_MS
  );
  if (!res.ok) {
    return readError(res, "Login failed");
  }
  const payload = (await res.json()) as LoginResponse;
  storeAuthTokens(payload);
  return payload;
}

export async function register(
  username: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE_URL}/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    DEFAULT_TIMEOUT_MS
  );
  if (!res.ok) {
    return readError(res, "Registration failed");
  }
  const payload = (await res.json()) as LoginResponse;
  storeAuthTokens(payload);
  return payload;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  let token = getAccessTokenFromStorage().trim();
  if (!token && hasRefreshToken()) {
    await refreshAccessToken();
    token = getAccessTokenFromStorage().trim();
  }
  if (!token) {
    throw new Error("Missing bearer token.");
  }
  const res = await fetchWithAuthRetry(() =>
    fetchWithTimeout(
      `${API_BASE_URL}/auth/me`,
      {
        headers: { Authorization: `Bearer ${getAccessTokenFromStorage().trim()}` },
      },
      DEFAULT_TIMEOUT_MS
    )
  );
  if (!res.ok) {
    return readError(res, "Failed to fetch current user");
  }
  return (await res.json()) as AuthUser;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshTokenFromStorage().trim();
  try {
    if (refreshToken) {
      await fetchWithTimeout(
        `${API_BASE_URL}/auth/logout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
        DEFAULT_TIMEOUT_MS
      );
    }
  } finally {
    clearAccessToken();
  }
}
