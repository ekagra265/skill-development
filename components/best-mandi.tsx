import { MapPin, TrendingUp, TrendingDown, Trophy } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";
import type { MandiOption } from "@/lib/types";

function MandiCard({ mandi, rank }: { mandi: MandiOption; rank: number }) {
  const { isHindi } = useLang();
  const isPositive = mandi.expected_7d_change_pct >= 0;
  const isBest = rank === 1;

  return (
    <div
      className={`card-hover relative flex flex-col gap-4 rounded-2xl border p-5 shadow-card ${
        isBest ? "border-amber-300 bg-amber-50/60" : "border-border bg-card"
      }`}
    >
      {isBest && (
        <span className="absolute right-3 top-3 rounded-full border border-amber-300 bg-gradient-to-r from-amber-400 to-yellow-300 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-amber-900">
          BEST
        </span>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
              isBest
                ? "bg-gradient-to-br from-amber-400 to-yellow-300 text-amber-900"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isBest ? <Trophy className="h-4.5 w-4.5" /> : `#${rank}`}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-card-foreground">{mandi.mandi}</h4>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {mandi.district} · {mandi.distance_km.toFixed(0)} km
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}
          {mandi.expected_7d_change_pct.toFixed(1)}%
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-display font-bold ${isBest ? "text-amber-700" : "text-card-foreground"}`}>
          ₹{mandi.current_price.toLocaleString("en-IN")}
        </span>
        <span className={`text-xs text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
          {isHindi ? "/क्विंटल" : "/quintal"}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${isPositive ? "bg-success" : "bg-destructive"}`}
          style={{ width: `${Math.min(Math.abs(mandi.expected_7d_change_pct) * 15, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function BestMandi({ mandis }: { mandis: MandiOption[] }) {
  const { lang, isHindi } = useLang();
  if (!mandis.length) return null;

  return (
    <section id="best-mandi" className="pb-8">
      <div className="container">
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-b from-amber-50/40 via-white to-white p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-1">
            <span className={`text-xs font-semibold uppercase tracking-wider text-amber-700 ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "mandi_badge")}
            </span>
            <h3 className={`text-xl font-display font-bold text-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "mandi_title")}
            </h3>
            <p className={`text-sm text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "mandi_subtitle")}
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
