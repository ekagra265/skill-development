"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, MapPin, Wheat, ChevronDown } from "lucide-react";
import { fetchForecast, fetchMetadata, fetchMarketsForCommodity } from "@/lib/api";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";
import type { ForecastResponse } from "@/lib/types";

interface ForecastSearchProps {
  onResult: (data: ForecastResponse) => void;
  onError:  (error: string) => void;
}

export function ForecastSearch({ onResult, onError }: ForecastSearchProps) {
  const { lang, isHindi } = useLang();
  const [crop,  setCrop]  = useState("");
  const [mandi, setMandi] = useState("");
  const [loading,        setLoading]        = useState(false);
  const [commodities,    setCommodities]    = useState<string[]>([]);
  const [markets,        setMarkets]        = useState<string[]>([]);
  const [loadingMeta,    setLoadingMeta]    = useState(true);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  useEffect(() => {
    fetchMetadata()
      .then((d) => setCommodities(d.commodities))
      .catch(() => setCommodities(["Wheat", "Tomato", "Potato", "Onion"]))
      .finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (!crop) { setMarkets([]); setMandi(""); return; }
    setLoadingMarkets(true);
    setMandi("");
    fetchMarketsForCommodity(crop)
      .then((d) => setMarkets(d.markets))
      .catch(() => setMarkets([]))
      .finally(() => setLoadingMarkets(false));
  }, [crop]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop || !mandi) return;
    setLoading(true);
    onError("");
    try {
      const data = await fetchForecast({ crop, mandi, language: lang });
      onResult(data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Forecast failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const mandiPlaceholder = !crop
    ? t(lang, "forecast_mandi_placeholder_first")
    : loadingMarkets
    ? t(lang, "forecast_mandi_placeholder_loading")
    : t(lang, "forecast_mandi_placeholder", markets.length);

  return (
    <section id="forecast" className="py-16 md:py-20" style={{ background: "linear-gradient(180deg, #f5f7f5 0%, #edf5f0 100%)" }}>
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className={`mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "forecast_badge")}
          </span>
          <h2 className={`text-2xl font-display font-bold text-foreground md:text-3xl ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "forecast_title")}
          </h2>
          <p className={`mt-2 text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "forecast_subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Crop selector */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="crop-select"
                className={`flex items-center gap-1.5 text-sm font-semibold text-card-foreground ${isHindi ? "font-devanagari" : ""}`}
              >
                <Wheat className="h-4 w-4 text-primary" />
                {t(lang, "forecast_crop_label")}
              </label>
              <div className="relative">
                <select
                  id="crop-select"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  disabled={loadingMeta}
                  className={`w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${isHindi ? "font-devanagari" : ""}`}
                  required
                >
                  <option value="">
                    {loadingMeta ? t(lang, "forecast_crop_placeholder_loading") : t(lang, "forecast_crop_placeholder")}
                  </option>
                  {commodities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mandi selector */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="mandi-select"
                className={`flex items-center gap-1.5 text-sm font-semibold text-card-foreground ${isHindi ? "font-devanagari" : ""}`}
              >
                <MapPin className="h-4 w-4 text-accent-blue" />
                {t(lang, "forecast_mandi_label")}
              </label>
              <div className="relative">
                <select
                  id="mandi-select"
                  value={mandi}
                  onChange={(e) => setMandi(e.target.value)}
                  disabled={!crop || loadingMarkets}
                  className={`w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${isHindi ? "font-devanagari" : ""}`}
                  required
                >
                  <option value="">{mandiPlaceholder}</option>
                  {markets.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !crop || !mandi}
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 ${isHindi ? "font-devanagari" : ""}`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t(lang, "forecast_btn_loading")}
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {t(lang, "forecast_btn")}
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
