"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";
import type { ForecastPoint } from "@/lib/types";

interface ForecastChartProps {
  forecast: ForecastPoint[];
  cropName: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

type TooltipEntry = {
  dataKey: string;
  color: string;
  value: number;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  const { lang, isHindi } = useLang();
  if (!active || !payload?.length || !label) return null;

  const getValue = (key: string) => payload.find((p) => p.dataKey === key)?.value;
  const predicted = getValue("yhat");
  const upper = getValue("yhat_upper");
  const lower = getValue("yhat_lower");

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card-hover">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">{formatDate(label)}</p>
      {predicted !== undefined && (
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className={`text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "chart_predicted")}:
          </span>
          <span className="font-bold text-card-foreground">₹{predicted.toFixed(0)}</span>
        </div>
      )}
      {upper !== undefined && lower !== undefined && (
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className={`text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "chart_confidence_band")}:
          </span>
          <span className="font-bold text-card-foreground">₹{lower.toFixed(0)} - ₹{upper.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}

export function ForecastChart({ forecast, cropName }: ForecastChartProps) {
  const { lang, isHindi } = useLang();

  const chartData = forecast.map((p) => ({
    ...p,
    bandBase: p.yhat_lower,
    bandRange: p.yhat_upper - p.yhat_lower,
  }));

  const yValues = forecast.flatMap((p) => [p.yhat, p.yhat_lower, p.yhat_upper]);
  const yMin = Math.floor(Math.min(...yValues) * 0.97);
  const yMax = Math.ceil(Math.max(...yValues) * 1.03);

  return (
    <section className="pb-8">
      <div className="container">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6 flex flex-col gap-1">
            <h3 className={`text-lg font-display font-bold text-card-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "chart_title")}
            </h3>
            <p className={`text-sm text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "chart_subtitle", cropName)}
            </p>
          </div>

          <div className="h-72 w-full md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="confidenceBandSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#bae6fd" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="predictionLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#d4e2d9" vertical={false} />
                <XAxis
                  dataKey="ds"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11, fill: "#5f7065" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[yMin, yMax]}
                  tick={{ fontSize: 11, fill: "#5f7065" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${v}`}
                  width={72}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area dataKey="bandBase" stackId="band" stroke="none" fill="transparent" />
                <Area
                  dataKey="bandRange"
                  stackId="band"
                  stroke="none"
                  fill="url(#confidenceBandSky)"
                />

                <Line
                  type="monotone"
                  dataKey="yhat"
                  stroke="url(#predictionLine)"
                  strokeWidth={3}
                  dot={{ r: 3.6, fill: "#ffffff", stroke: "#1a7a3f", strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: "#1a7a3f" }}
                />
                <Line
                  type="monotone"
                  dataKey="yhat_upper"
                  stroke="#60a5fa"
                  strokeWidth={1.2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="yhat_lower"
                  stroke="#60a5fa"
                  strokeWidth={1.2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-0.5 w-6 rounded-full"
                style={{ background: "linear-gradient(90deg, #16a34a, #2563eb)" }}
              />
              <span className={isHindi ? "font-devanagari" : ""}>{t(lang, "chart_predicted")}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-6 rounded-full bg-sky-300/70" />
              <span className={isHindi ? "font-devanagari" : ""}>{t(lang, "chart_confidence_band")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
