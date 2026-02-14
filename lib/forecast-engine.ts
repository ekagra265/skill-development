/**
 * TypeScript port of the Python backend forecast pipeline.
 * Replicates: forecast_model.py, recommendation.py, volatility.py,
 * alerts.py, risk_analysis.py, insights.py, forecast_pipeline.py
 *
 * Uses linear regression + noise for 7-day forecasting instead of Prophet,
 * but all recommendation thresholds, risk levels, and insight generation
 * match the original Python logic exactly.
 */

// ── Linear-regression forecast (replaces Prophet) ──────────────────────────

export interface ForecastPoint {
  ds: string; // ISO date
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += ys[i];
    sumXY += i * ys[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function runForecast(
  history: { ds: Date; y: number }[],
  periods = 7
): ForecastPoint[] {
  if (history.length < 2) {
    throw new Error(
      "Historical dataset is too short for forecasting; need at least 2 points."
    );
  }

  const prices = history.map((h) => h.y);
  const { slope, intercept } = linearRegression(prices);
  const n = prices.length;
  const residualStd = std(
    prices.map((p, i) => p - (intercept + slope * i))
  );
  // Use 1.96 * residualStd for ~95% confidence band (mimics Prophet yhat_lower/yhat_upper)
  const bandWidth = 1.96 * (residualStd || prices[prices.length - 1] * 0.02);

  const lastDate = history[history.length - 1].ds;
  const results: ForecastPoint[] = [];
  for (let d = 1; d <= periods; d++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + d);

    const yhat = intercept + slope * (n - 1 + d);
    results.push({
      ds: futureDate.toISOString().split("T")[0],
      yhat: Math.round(yhat * 100) / 100,
      yhat_lower: Math.round((yhat - bandWidth) * 100) / 100,
      yhat_upper: Math.round((yhat + bandWidth) * 100) / 100,
    });
  }

  return results;
}

// ── Recommendation (replaces recommendation.py) ────────────────────────────

export interface Recommendation {
  action: "WAIT" | "SELL NOW" | "HOLD";
  expected_change_percent: number;
  message: string;
  confidence: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

export function generateRecommendation(
  forecast: ForecastPoint[]
): Omit<Recommendation, "confidence" | "risk_level"> {
  if (!forecast.length) throw new Error("Forecast is empty.");
  if (forecast.length < 2) throw new Error("Need at least 2 forecast points.");

  const first = forecast[0].yhat;
  const last = forecast[forecast.length - 1].yhat;

  if (first === 0) {
    return {
      action: "HOLD",
      expected_change_percent: 0,
      message:
        "Unable to compute percent change because first forecast price is zero.",
    };
  }

  const changePct =
    Math.round(((last - first) / first) * 100 * 100) / 100;

  let action: "WAIT" | "SELL NOW" | "HOLD";
  let message: string;

  if (changePct > 2) {
    action = "WAIT";
    message = `Forecast shows a ${changePct.toFixed(2)}% rise over the horizon. Waiting is recommended.`;
  } else if (changePct < -2) {
    action = "SELL NOW";
    message = `Forecast shows a ${Math.abs(changePct).toFixed(2)}% drop over the horizon. Selling now is recommended.`;
  } else {
    action = "HOLD";
    message = `Forecast change is ${changePct.toFixed(2)}%, within the hold band (-2% to +2%).`;
  }

  return { action, expected_change_percent: changePct, message };
}

// ── Confidence & Risk (replaces risk_analysis.py) ──────────────────────────

export function calculateConfidenceAndRisk(
  forecast: ForecastPoint[]
): { confidence: number; risk_level: "LOW" | "MEDIUM" | "HIGH" } {
  if (!forecast.length) throw new Error("Forecast is empty.");

  const spreads: number[] = [];
  const prices: number[] = [];

  for (const pt of forecast) {
    const spread = pt.yhat_upper - pt.yhat_lower;
    spreads.push(Math.max(0, spread));
    prices.push(pt.yhat);
  }

  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const uncertaintyRatio = avgPrice === 0 ? 1 : Math.max(0, avgSpread / avgPrice);

  const confidence = Math.round(
    Math.max(0, Math.min(100, (1 - uncertaintyRatio) * 100))
  );

  let riskLevel: "LOW" | "MEDIUM" | "HIGH";
  if (uncertaintyRatio < 0.05) riskLevel = "LOW";
  else if (uncertaintyRatio < 0.12) riskLevel = "MEDIUM";
  else riskLevel = "HIGH";

  return { confidence, risk_level: riskLevel };
}

// ── Volatility (replaces volatility.py) ────────────────────────────────────

export function classifyVolatility(
  priceSeries: number[]
): "Low" | "Medium" | "High" {
  if (priceSeries.length < 2) return "Low";

  const mean = priceSeries.reduce((a, b) => a + b, 0) / priceSeries.length;
  const stdDev = std(priceSeries);
  const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

  if (cv < 1.2) return "Low";
  if (cv < 2.5) return "Medium";
  return "High";
}

// ── Shock Alert (replaces alerts.py) ───────────────────────────────────────

export function detectPriceShock(
  history: number[],
  thresholdPct = 5.0
): string | null {
  if (history.length < 2) return null;

  const prev = history[history.length - 2];
  const last = history[history.length - 1];
  if (prev === 0) return null;

  const changePct = ((last - prev) / prev) * 100;
  if (Math.abs(changePct) >= thresholdPct) {
    const direction = changePct < 0 ? "drop" : "jump";
    return `Sudden price ${direction} detected today (${changePct.toFixed(1)}%).`;
  }
  return null;
}

// ── Insights (replaces insights.py) ────────────────────────────────────────

export function generateInsights(
  forecast: ForecastPoint[],
  recommendation: { risk_level?: string; action?: string }
): string {
  if (!forecast.length) return "No forecast data available for insight generation.";
  if (forecast.length < 2) return "Insufficient forecast data for insights.";

  const prices = forecast.map((p) => p.yhat);
  const first = prices[0];
  const last = prices[prices.length - 1];

  let trendLine: string;
  if (last > first) trendLine = "Prices show an upward trend this week.";
  else if (last < first) trendLine = "Market shows downward pressure this week.";
  else trendLine = "Prices are mostly flat over the forecast window.";

  let changeLine: string;
  if (first === 0) {
    changeLine =
      "Percent change cannot be computed because the first forecasted price is zero.";
  } else {
    const changePct = ((last - first) / first) * 100;
    changeLine = `Projected change from first to last forecast day is ${changePct.toFixed(2)}%.`;
  }

  const riskLevel = (recommendation.risk_level || "").toUpperCase();
  let riskLine: string;
  if (riskLevel === "HIGH")
    riskLine = "Risk is HIGH, so volatility may cause sharp price swings.";
  else if (riskLevel === "MEDIUM")
    riskLine = "Risk is MEDIUM, so moderate volatility is possible.";
  else if (riskLevel === "LOW")
    riskLine =
      "Risk is LOW, indicating comparatively stable forecast confidence.";
  else riskLine = "Risk level is unavailable for this forecast.";

  const action = (recommendation.action || "").toUpperCase();
  const actionLine =
    action === "WAIT" || action === "SELL NOW" || action === "HOLD"
      ? `Suggested action: ${action}.`
      : "Suggested action is unavailable.";

  return `${trendLine} ${changeLine} ${riskLine} ${actionLine}`;
}
