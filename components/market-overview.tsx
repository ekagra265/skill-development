"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fetchMetadata } from "@/lib/api";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";

interface CropPrice {
  name: string;
  price: number;
  change: number;
  trend: "up" | "down" | "flat";
}

type CropTheme = {
  emoji: string;
  cardBg: string;
  badgeBg: string;
  text: string;
};

const REQUESTED_TOP_CROPS = 50;

const cropTheme: Record<string, CropTheme> = {
  Wheat: {
    emoji: "🌾",
    cardBg: "linear-gradient(140deg, #fff7e6 0%, #ffefc8 50%, #ffe3a3 100%)",
    badgeBg: "bg-amber-100/80",
    text: "text-amber-700",
  },
  Tomato: {
    emoji: "🍅",
    cardBg: "linear-gradient(140deg, #fff0ef 0%, #ffd9d6 50%, #ffc2bc 100%)",
    badgeBg: "bg-red-100/80",
    text: "text-red-700",
  },
  Onion: {
    emoji: "🧅",
    cardBg: "linear-gradient(140deg, #f8f2ff 0%, #eadbff 50%, #ddc4ff 100%)",
    badgeBg: "bg-purple-100/80",
    text: "text-purple-700",
  },
  Potato: {
    emoji: "🥔",
    cardBg: "linear-gradient(140deg, #fffcec 0%, #fff4c0 50%, #ffe89a 100%)",
    badgeBg: "bg-yellow-100/80",
    text: "text-yellow-700",
  },
};

function TrendBadge({ change, trend }: { change: number; trend: CropPrice["trend"] }) {
  const color =
    trend === "up"
      ? "bg-success/15 text-success"
      : trend === "down"
      ? "bg-destructive/15 text-destructive"
      : "bg-muted text-muted-foreground";
  const Icon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}

function CropCard({ crop, lang }: { crop: CropPrice; lang: "en" | "hi" }) {
  const theme = cropTheme[crop.name] ?? {
    emoji: "🌱",
    cardBg: "linear-gradient(140deg, #eef8f1 0%, #dff1e5 100%)",
    badgeBg: "bg-primary/10",
    text: "text-primary",
  };

  return (
    <div
      className="card-hover flex flex-col gap-4 rounded-2xl border border-border/70 p-5 shadow-card"
      style={{ background: theme.cardBg }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${theme.badgeBg}`}>
            <span aria-hidden="true">{theme.emoji}</span>
          </div>
          <div>
            <h3 className={`text-sm font-bold ${theme.text}`}>{crop.name}</h3>
            <p className={`text-xs text-muted-foreground ${lang === "hi" ? "font-devanagari" : ""}`}>
              {t(lang, "market_modal")}
            </p>
          </div>
        </div>
        <TrendBadge change={crop.change} trend={crop.trend} />
      </div>

      <div className="flex items-end gap-1">
        <span className="text-2xl font-display font-bold text-card-foreground">
          ₹{crop.price.toLocaleString("en-IN")}
        </span>
        <span className={`pb-1 text-xs text-muted-foreground ${lang === "hi" ? "font-devanagari" : ""}`}>
          {t(lang, "market_per_quintal")}
        </span>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              crop.trend === "up"
                ? "bg-success"
                : crop.trend === "down"
                ? "bg-destructive"
                : "bg-muted-foreground"
            }`}
            style={{ width: `${Math.min(Math.abs(crop.change) * 12, 100)}%` }}
          />
        </div>
        <p className={`text-xs text-muted-foreground ${lang === "hi" ? "font-devanagari" : ""}`}>
          {t(lang, "market_daily_change")}
        </p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skeleton h-11 w-11 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-8 w-28 rounded" />
      <div className="skeleton h-1.5 w-full rounded-full" />
    </div>
  );
}

export function MarketOverview() {
  const { lang, isHindi } = useLang();
  const [crops, setCrops] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const hasInsufficientCropData = !loading && crops.length > 0 && crops.length < REQUESTED_TOP_CROPS;

  useEffect(() => {
    fetchMetadata(REQUESTED_TOP_CROPS)
      .then((d) => setCrops(d.cropPrices))
      .catch(() => setCrops([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="dashboard" className="py-16 md:py-20">
      <div className="container">
        <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className={`mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "market_badge")}
            </span>
            <h2 className={`text-2xl font-display font-bold text-foreground md:text-3xl ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "market_title")}
            </h2>
            <p className={`mt-1 text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "market_subtitle")}
            </p>
          </div>
        </div>

        {hasInsufficientCropData && (
          <div className="mb-6 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {`Only ${crops.length} crops are available in the current dataset. Add more commodities to show ${REQUESTED_TOP_CROPS}.`}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : crops.map((crop) => <CropCard key={crop.name} crop={crop} lang={lang} />)}
          {!loading && crops.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Unable to load market data. Check that the backend is running.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
