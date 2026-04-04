"use client";

import { useEffect, useState, useMemo } from "react";
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
import { fetchReportHistory, getReportDownloadUrl, deleteReport } from "@/lib/api";
import type { SavedReport } from "@/lib/api";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

function RecBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    "SELL NOW": "bg-success/10 text-success border-success/20",
    HOLD:       "bg-warning/10 text-warning border-warning/20",
    WAIT:       "bg-accent/10 text-accent border-accent/20",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[action] || "border-border bg-muted text-foreground"}`}>
      {action}
    </span>
  );
}

export default function HistoryPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRec, setFilterRec] = useState("ALL");
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [sortBy, setSortBy] = useState("date");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchReportHistory()
      .then((d) => setReports(d.reports))
      .catch(() => setError("Could not load history. Make sure the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...reports];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.crop.toLowerCase().includes(q) || r.mandi.toLowerCase().includes(q)
      );
    }
    if (filterRec !== "ALL") result = result.filter((r) => r.recommendation === filterRec);
    if (filterRisk !== "ALL") result = result.filter((r) => r.risk_level === filterRisk);
    if (sortBy === "date")       result.sort((a, b) => b.date.localeCompare(a.date));
    else if (sortBy === "price") result.sort((a, b) => b.current_price - a.current_price);
    else if (sortBy === "conf")  result.sort((a, b) => b.confidence - a.confidence);
    return result;
  }, [reports, search, filterRec, filterRisk, sortBy]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
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

          {/* Header */}
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
                {filtered.length} report{filtered.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <Link
              href="/forecast"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              + New Forecast
            </Link>
          </div>

          {/* Filters */}
          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />

              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search crop or mandi…"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
                />
              </div>

              {/* Recommendation filter */}
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

              {/* Risk filter */}
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

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
              >
                <option value="date">Newest First</option>
                <option value="price">Highest Price</option>
                <option value="conf">Highest Confidence</option>
              </select>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading history…
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <FileX className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3 font-semibold text-foreground">No reports found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search term.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Left: crop info */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">
                      {r.crop === "Wheat" ? "🌾"
                        : r.crop === "Tomato" ? "🍅"
                        : r.crop === "Onion" ? "🧅"
                        : r.crop === "Potato" ? "🥔"
                        : "🌱"}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{r.crop}</p>
                      <p className="text-sm text-muted-foreground">📍 {r.mandi}</p>
                      <p className="text-xs text-muted-foreground">🗓 {r.date} {r.time}</p>
                    </div>
                  </div>

                  {/* Right: stats */}
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
                        {r.predicted_change >= 0 ? "+" : ""}{r.predicted_change}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="font-bold text-accent">{r.confidence}%</p>
                    </div>
                    <RecBadge action={r.recommendation} />

                    {/* Download */}
                    <a
                      href={getReportDownloadUrl(r.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
                    >
                      <Download className="h-3.5 w-3.5 text-primary" />
                      PDF
                    </a>

                    {/* Delete */}
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
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
