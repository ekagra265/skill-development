export interface ForecastRequest {
  crop: string;
  mandi: string;
  district?: string;
  pincode?: string;
  days?: number;
  language?: "en" | "hi";
}

export interface ForecastPoint {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface RecommendationResult {
  action: "WAIT" | "SELL NOW" | "HOLD";
  expected_change_percent: number;
  message: string;
  confidence: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

export interface MandiOption {
  mandi: string;
  district: string;
  distance_km: number;
  current_price: number;
  expected_7d_change_pct: number;
}

export interface ForecastResponse {
  crop: string;
  mandi: string;
  current_price: number;
  trend_direction: "up" | "down" | "flat";
  expected_change_pct: number;
  recommendation: RecommendationResult;
  volatility_level: "Low" | "Medium" | "High";
  shock_alert: string | null;
  forecast: ForecastPoint[];
  nearby_mandis: MandiOption[];
  insights: string[];
  language: "en" | "hi";
}

export interface BestMandiResponse {
  state: string;
  commodity: string;
  best_mandis: {
    mandi: string;
    expected_change_percent: number;
  }[];
}

export interface CropOverview {
  name: string;
  icon: string;
  price: number;
  change: number;
  trend: "up" | "down" | "flat";
}
