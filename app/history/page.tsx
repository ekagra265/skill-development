"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  Trash2,
  Loader2,
  ChevronLeft,
  SlidersHorizontal,
  FileX,
} from "lucide-react";
import { deleteReport, fetchReportHistory, getReportDownloadUrl } from "@/lib/api";
import type { SavedReport } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const PAGE_SIZE = 20;

function RecBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    "SELL NOW": "bg-success/10 text-success border-success/20",
    HOLD: "bg-warning/10 text-warning border-warning/20",
    WAIT: "bg-accent/10 text-accent border-accent/20",
  };
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[action] || "border-border bg-muted text-foreground"}`}
    >
      {action}
    </span>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function HistoryPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRec, setFilterRec] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date" | "price" | "conf">("date");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterRec, filterRisk, sortBy]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    fetchReportHistory({
      q: debouncedSearch || undefined,
      recommendation:
        filterRec === "ALL" ? undefined : (filterRec as "WAIT" | "SELL NOW" | "HOLD"),
      riskLevel: filterRisk === "ALL" ? undefined : (filterRisk as "LOW" | "MEDIUM" | "HIGH"),
      sort: sortBy,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
      .then((data) => {
        if (!active) return;
        setReports(data.reports);
        setTotal(data.total);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "";
        if (/token|unauthorized|missing bearer|invalid token|expired/i.test(msg)) {
          setError("Login required for report history. Open /login and sign in.");
        } else {
          setError("Could not load history. Make sure the backend is running.");
        }
        setReports([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, filterRec, filterRisk, sortBy, page, refreshToken]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fromIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toIndex = Math.min((page - 1) * PAGE_SIZE + reports.length, total);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(debouncedSearch.trim()) ||
      filterRec !== "ALL" ||
      filterRisk !== "ALL" ||
      sortBy !== "date",
    [debouncedSearch, filterRec, filterRisk, sortBy]
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteReport(id);
      const wasOnlyItem = reports.length === 1 && page > 1;
      if (wasOnlyItem) {
        setPage((prev) => Math.max(1, prev - 1));
      } else {
        setRefreshToken((prev) => prev + 1);
      }
    } catch {
      alert("Failed to delete report.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 bg-background py-10">
        <div className="container">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link
                href="/dashboard"
                className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Forecast History
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Showing {fromIndex}-{toIndex} of {total} report
                {total === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              href="/forecast"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              + New Forecast
            </Link>
          </div>

          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />

              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search crop or mandi..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
                />
              </div>

              <select
                value={filterRec}
                onChange={(e) => setFilterRec(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              >
                <option value="ALL">All Recommendations</option>
                <option value="WAIT">WAIT</option>
                <option value="SELL NOW">SELL NOW</option>
                <option value="HOLD">HOLD</option>
              </select>

              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "date" | "price" | "conf")
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              >
                <option value="date">Newest First</option>
                <option value="price">Highest Price</option>
                <option value="conf">Highest Confidence</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading history...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileX className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 font-semibold text-foreground">
                {hasActiveFilters ? "No reports found" : "No reports saved yet"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Try changing search or filters."
                  : "Run a forecast and click Save Report."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">
                        {r.crop === "Wheat"
                          ? "🌾"
                          : r.crop === "Tomato"
                            ? "🍅"
                            : r.crop === "Onion"
                              ? "🧅"
                              : r.crop === "Potato"
                                ? "🥔"
                                : "🌱"}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{r.crop}</p>
                        <p className="text-sm text-muted-foreground">📍 {r.mandi}</p>
                        <p className="text-xs text-muted-foreground">
                          🗓 {r.date} {r.time}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="font-bold text-foreground">
                          ₹{r.current_price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Change</p>
                        <p
                          className={`font-bold ${r.predicted_change >= 0 ? "text-success" : "text-destructive"}`}
                        >
                          {r.predicted_change >= 0 ? "+" : ""}
                          {r.predicted_change}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className="font-bold text-accent">{r.confidence}%</p>
                      </div>
                      <RecBadge action={r.recommendation} />

                      <a
                        href={getReportDownloadUrl(r.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
                      >
                        <Download className="h-3.5 w-3.5 text-primary" />
                        PDF
                      </a>

                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deleting === r.id}
                        className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {deleting === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
