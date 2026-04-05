"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ForecastSearch } from "@/components/forecast-search";
import { ForecastDashboard } from "@/components/forecast-dashboard";
import { ForecastChart } from "@/components/forecast-chart";
import { BestMandi } from "@/components/best-mandi";
import type { ForecastResponse } from "@/lib/types";

export default function ForecastPage() {
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState("");

  function handleResult(data: ForecastResponse) {
    setForecastData(data);
    setError("");
    setTimeout(() => {
      document.getElementById("forecast-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleError(msg: string) {
    setError(msg);
    if (msg) {
      setForecastData(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/35 py-6">
          <div className="container">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Forecast</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Run a new forecast and save the report as a PDF.
            </p>
          </div>
        </section>

        <ForecastSearch onResult={handleResult} onError={handleError} />

        {error && (
          <div className="container pb-6">
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">Forecast Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
        )}

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
      </main>

      <Footer />
    </div>
  );
}
