"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  Target,
  TrendingUp,
  MapPin,
  Plus,
  History,
  Download,
  Loader2,
  Sprout,
  ChevronRight,
} from "lucide-react";
import { fetchReportHistory, getReportDownloadUrl } from "@/lib/api";
import type { SavedReport } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

function RecBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    "SELL NOW": "bg-success/10 text-success",
    HOLD:       "bg-warning/10 text-warning",
    WAIT:       "bg-accent/10 text-accent",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[action] || "bg-muted text-foreground"}`}>
      {action}
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    LOW:    "text-success",
    MEDIUM: "text-warning",
    HIGH:   "text-destructive",
  };
  return (
    <span className={`text-xs font-bold ${styles[level] || "text-muted-foreground"}`}>
      {level}
    </span>
  );
}

export default function DashboardPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportHistory({ limit: 8, sort: "date" })
      .then((d) => setReports(d.reports))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "";
        if (/token|unauthorized|missing bearer|invalid token|expired/i.test(msg)) {
          setError("Login required for reports. Open /login and sign in.");
        } else {
          setError("Could not load reports. Make sure the backend is running.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const total = reports.length;
  const avgConf = total
    ? Math.round(reports.reduce((a, r) => a + r.confidence, 0) / total)
    : 0;
  const cropCount: Record<string, number> = {};
  reports.forEach((r) => { cropCount[r.crop] = (cropCount[r.crop] || 0) + 1; });
  const topCrop = Object.entries(cropCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const recentMandi = reports[0]?.mandi ?? "—";

  const statCards = [
    { icon: BarChart2, label: "Total Forecasts",  value: String(total),    color: "bg-primary/10 text-primary" },
    { icon: Target,    label: "Avg Confidence",   value: `${avgConf}%`,    color: "bg-accent/10 text-accent" },
    { icon: TrendingUp,label: "Most Tracked Crop",value: topCrop,          color: "bg-success/10 text-success" },
    { icon: MapPin,    label: "Recent Mandi",      value: recentMandi.split(" ")[0], color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-10">
        <div className="container">

          {/* Page header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sprout className="h-4 w-4 text-primary" />
                AgriPulse
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your saved forecasts and market history
              </p>
            </div>
            <Link
              href="/forecast"
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Forecast
            </Link>
          </div>

          {/* Stat cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                </div>
                <span className="text-2xl font-bold text-card-foreground">
                  {loading ? "..." : s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Recent forecasts table */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-bold text-foreground">Recent Forecasts</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click ⬇ PDF to download any report
                </p>
              </div>
              <Link
                href="/history"
                className="flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading forecasts…
              </div>
            ) : error ? (
              <div className="py-16 text-center text-sm text-destructive">{error}</div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center">
                <Sprout className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 font-semibold text-foreground">No forecasts yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Run your first forecast and click &quot;Save Report&quot; to see it here.
                </p>
                <Link
                  href="/forecast"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Start Forecast
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Crop", "Mandi", "Date", "Price", "Change", "Action", "Risk", "PDF"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground">{r.crop}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.mandi}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                        <td className="px-4 py-3 font-semibold">
                          ₹{r.current_price.toLocaleString("en-IN")}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            r.predicted_change >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {r.predicted_change >= 0 ? "+" : ""}
                          {r.predicted_change}%
                        </td>
                        <td className="px-4 py-3">
                          <RecBadge action={r.recommendation} />
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge level={r.risk_level} />
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={getReportDownloadUrl(r.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
                          >
                            <Download className="h-3.5 w-3.5 text-primary" />
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick action cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Plus,
                title: "New Forecast",
                desc: "Predict prices for any crop & mandi",
                href: "/forecast",
                color: "bg-primary/10 text-primary",
              },
              {
                icon: History,
                title: "Full History",
                desc: "Search and filter all past reports",
                href: "/history",
                color: "bg-accent/10 text-accent",
              },
              {
                icon: MapPin,
                title: "Best Mandi",
                desc: "Find the highest paying market nearby",
                href: "/best-mandi",
                color: "bg-success/10 text-success",
              },
            ].map((a) => (
              <Link
                key={a.title}
                href={a.href}
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${a.color}`}>
                  <a.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
