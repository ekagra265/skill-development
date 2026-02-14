"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  AlertTriangle,
  Target,
  Activity,
  Zap,
} from "lucide-react";
import type { ForecastResponse } from "@/lib/types";

function RecommendationCard({
  recommendation,
}: {
  recommendation: ForecastResponse["recommendation"];
}) {
  const actionColor: Record<string, string> = {
    "SELL NOW": "border-success bg-success/5 text-success",
    HOLD: "border-warning bg-warning/5 text-warning",
    WAIT: "border-accent bg-accent/5 text-accent",
  };

  const actionBg: Record<string, string> = {
    "SELL NOW": "bg-success text-success-foreground",
    HOLD: "bg-warning text-warning-foreground",
    WAIT: "bg-accent text-accent-foreground",
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border-2 p-6 ${actionColor[recommendation.action] || "border-border bg-card"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI Recommendation
        </span>
        <span
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ${actionBg[recommendation.action] || "bg-muted text-foreground"}`}
        >
          {recommendation.action}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-card-foreground">
        {recommendation.message}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-bold text-card-foreground">{value}</span>
    </div>
  );
}

export function ForecastDashboard({ data }: { data: ForecastResponse }) {
  const trendIcon =
    data.trend_direction === "up"
      ? TrendingUp
      : data.trend_direction === "down"
        ? TrendingDown
        : Minus;

  const riskColor: Record<string, string> = {
    LOW: "bg-success/10 text-success",
    MEDIUM: "bg-warning/10 text-warning",
    HIGH: "bg-destructive/10 text-destructive",
  };

  return (
    <section className="py-8">
      <div className="container">
        <div className="mb-6 flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Forecast Results
          </span>
          <h2 className="text-2xl font-bold text-foreground">
            {data.crop} at {data.mandi}
          </h2>
        </div>

        {/* Key decision cards first */}
        <div className="mb-6">
          <RecommendationCard recommendation={data.recommendation} />
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Target}
            label="Current Price"
            value={`\u20B9${data.current_price.toLocaleString("en-IN")}/q`}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            icon={trendIcon}
            label="Expected Change"
            value={`${data.expected_change_pct > 0 ? "+" : ""}${data.expected_change_pct.toFixed(2)}%`}
            color={
              data.expected_change_pct >= 0
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }
          />
          <StatCard
            icon={ShieldCheck}
            label="Confidence"
            value={`${data.recommendation.confidence}%`}
            color="bg-accent/10 text-accent"
          />
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                Risk Level
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-card-foreground">
                {data.recommendation.risk_level}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskColor[data.recommendation.risk_level] || "bg-muted text-foreground"}`}
              >
                {data.volatility_level} Volatility
              </span>
            </div>
          </div>
        </div>

        {/* Shock alert */}
        {data.shock_alert && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-semibold text-warning-foreground">
                Price Shock Alert
              </p>
              <p className="text-sm text-muted-foreground">{data.shock_alert}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
