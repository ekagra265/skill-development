"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { ForecastPoint } from "@/lib/types";

interface ForecastChartProps {
  forecast: ForecastPoint[];
  cropName: string;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
        {formatDate(label)}
      </p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">
            {item.dataKey === "yhat"
              ? "Predicted"
              : item.dataKey === "yhat_upper"
                ? "Upper"
                : "Lower"}
            :
          </span>
          <span className="font-semibold text-card-foreground">
            {"\u20B9"}{item.value.toFixed(0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ForecastChart({ forecast, cropName }: ForecastChartProps) {
  const chartData = forecast.map((p) => ({
    ...p,
    dateLabel: formatDate(p.ds),
  }));

  // Compute JS colors for Recharts (CSS vars don't work)
  const primaryColor = "#16803c";
  const accentColor = "#1a73e8";
  const mutedColor = "#dce5df";

  return (
    <section className="pb-8">
      <div className="container">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-1">
            <h3 className="text-lg font-bold text-card-foreground">
              7-Day Price Forecast
            </h3>
            <p className="text-sm text-muted-foreground">
              Predicted prices for {cropName} with confidence bands
            </p>
          </div>

          <div className="h-72 w-full md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primaryColor} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={primaryColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={mutedColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="ds"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12, fill: "#5a6e60" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#5a6e60" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `\u20B9${v}`}
                />
                <Tooltip
                  content={<CustomTooltip />}
                />
                <Area
                  type="monotone"
                  dataKey="yhat_upper"
                  stroke="transparent"
                  fill="url(#bandFill)"
                  fillOpacity={1}
                />
                <Area
                  type="monotone"
                  dataKey="yhat_lower"
                  stroke="transparent"
                  fill="#ffffff"
                  fillOpacity={0.8}
                />
                <Line
                  type="monotone"
                  dataKey="yhat"
                  stroke={primaryColor}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#ffffff", stroke: primaryColor, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: primaryColor }}
                />
                <Line
                  type="monotone"
                  dataKey="yhat_upper"
                  stroke={accentColor}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="yhat_lower"
                  stroke={accentColor}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-0.5 w-5 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              Predicted Price
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-0.5 w-5 rounded-full border border-dashed"
                style={{ borderColor: accentColor }}
              />
              Confidence Band
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
