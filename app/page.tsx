"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { MarketOverview } from "@/components/market-overview";
import { ForecastSearch } from "@/components/forecast-search";
import { ForecastDashboard } from "@/components/forecast-dashboard";
import { ForecastChart } from "@/components/forecast-chart";
import { BestMandi } from "@/components/best-mandi";
import { InsightsSection } from "@/components/insights-section";
import { FaqSection } from "@/components/faq-section";
import { Footer } from "@/components/footer";
import { ForecastSkeleton } from "@/components/skeleton";
import type { ForecastResponse } from "@/lib/types";
import { AlertCircle } from "lucide-react";

export default function HomePage() {
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(
    null
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleResult(data: ForecastResponse) {
    setForecastData(data);
    setError("");
    // Scroll to results
    setTimeout(() => {
      document.getElementById("forecast-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleError(msg: string) {
    setError(msg);
    if (msg) setForecastData(null);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <MarketOverview />
        <ForecastSearch onResult={handleResult} onError={handleError} />

        {/* Error state */}
        {error && (
          <div className="container py-8">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  Forecast Error
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Forecast results */}
        {forecastData && (
          <div id="forecast-results">
            <ForecastDashboard data={forecastData} />
            <ForecastChart
              forecast={forecastData.forecast}
              cropName={forecastData.crop}
            />
            {forecastData.nearby_mandis.length > 0 && (
              <BestMandi mandis={forecastData.nearby_mandis} />
            )}
          </div>
        )}

        <InsightsSection
          insights={forecastData?.insights}
        />
        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
