import {
  MapPin,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Award,
} from "lucide-react";
import type { MandiOption } from "@/lib/types";

function MandiCard({
  mandi,
  rank,
}: {
  mandi: MandiOption;
  rank: number;
}) {
  const isPositive = mandi.expected_7d_change_pct >= 0;

  return (
    <div className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
              rank === 1
                ? "bg-warning/10 text-warning"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {rank === 1 ? <Award className="h-4 w-4" /> : `#${rank}`}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-card-foreground">
              {mandi.mandi}
            </h4>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {mandi.district} &middot; {mandi.distance_km.toFixed(0)} km
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            isPositive
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isPositive ? "+" : ""}
          {mandi.expected_7d_change_pct.toFixed(1)}%
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-card-foreground">
          {"\u20B9"}{mandi.current_price.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-muted-foreground">/quintal</span>
      </div>
    </div>
  );
}

export function BestMandi({ mandis }: { mandis: MandiOption[] }) {
  if (!mandis.length) return null;

  return (
    <section id="best-mandi" className="pb-8">
      <div className="container">
        <div className="rounded-xl border border-border bg-secondary/30 p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Best Mandi
            </span>
            <h3 className="text-lg font-bold text-foreground">
              Recommended Selling Locations
            </h3>
            <p className="text-sm text-muted-foreground">
              Mandis ranked by expected 7-day price advantage
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mandis.map((m, i) => (
              <MandiCard key={m.mandi} mandi={m} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
