"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, MapPin, Wheat } from "lucide-react";
import { fetchForecast, fetchMetadata, fetchMarketsForCommodity } from "@/lib/api";
import type { ForecastResponse } from "@/lib/types";

interface ForecastSearchProps {
  onResult: (data: ForecastResponse) => void;
  onError: (error: string) => void;
}

export function ForecastSearch({ onResult, onError }: ForecastSearchProps) {
  const [crop, setCrop] = useState("");
  const [mandi, setMandi] = useState("");
  const [loading, setLoading] = useState(false);

  // Dynamic data from the real CSV dataset
  const [commodities, setCommodities] = useState<string[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingMarkets, setLoadingMarkets] = useState(false);

  // Load commodities on mount
  useEffect(() => {
    fetchMetadata()
      .then((data) => {
        setCommodities(data.commodities);
      })
      .catch(() => {
        setCommodities(["Wheat", "Tomato", "Potato", "Onion"]);
      })
      .finally(() => setLoadingMeta(false));
  }, []);

  // Load markets when a crop is selected
  useEffect(() => {
    if (!crop) {
      setMarkets([]);
      setMandi("");
      return;
    }
    setLoadingMarkets(true);
    setMandi("");
    fetchMarketsForCommodity(crop)
      .then((data) => {
        setMarkets(data.markets);
      })
      .catch(() => {
        setMarkets([]);
      })
      .finally(() => setLoadingMarkets(false));
  }, [crop]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!crop || !mandi) return;

    setLoading(true);
    onError("");

    try {
      const data = await fetchForecast({ crop, mandi });
      onResult(data);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Forecast failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="forecast" className="bg-secondary/50 py-16 md:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            AI Forecast
          </span>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            Predict Crop Prices
          </h2>
          <p className="mt-2 text-muted-foreground">
            Select a crop and mandi to get a 7-day price forecast with
            actionable recommendations powered by your dataset.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm md:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Crop selector -- populated from the real dataset */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="crop-select"
                className="flex items-center gap-1.5 text-sm font-medium text-card-foreground"
              >
                <Wheat className="h-4 w-4 text-primary" />
                Crop
              </label>
              <select
                id="crop-select"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                disabled={loadingMeta}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                required
              >
                <option value="">
                  {loadingMeta ? "Loading crops..." : "Select a crop"}
                </option>
                {commodities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Mandi selector -- populated based on the selected crop */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="mandi-select"
                className="flex items-center gap-1.5 text-sm font-medium text-card-foreground"
              >
                <MapPin className="h-4 w-4 text-accent" />
                Mandi
              </label>
              <select
                id="mandi-select"
                value={mandi}
                onChange={(e) => setMandi(e.target.value)}
                disabled={!crop || loadingMarkets}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                required
              >
                <option value="">
                  {!crop
                    ? "Select a crop first"
                    : loadingMarkets
                      ? "Loading mandis..."
                      : `Select a mandi (${markets.length} available)`}
                </option>
                {markets.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !crop || !mandi}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Forecast...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Predict Prices
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
