"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft, MapPin } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ForecastSearch } from "@/components/forecast-search";
import { ForecastDashboard } from "@/components/forecast-dashboard";
import { ForecastChart } from "@/components/forecast-chart";
import { BestMandi } from "@/components/best-mandi";
import type { ForecastResponse } from "@/lib/types";

export default function BestMandiPage() {
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState("");

  function handleResult(data: ForecastResponse) {
    setForecastData(data);
    setError("");
    setTimeout(() => {
      document.getElementById("best-mandi-results")?.scrollIntoView({
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Best Mandi</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare nearby mandis and find where prices look strongest.
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
          <div id="best-mandi-results">
            <ForecastDashboard data={forecastData} />
            <ForecastChart
              forecast={forecastData.forecast}
              cropName={forecastData.crop}
            />
            {forecastData.nearby_mandis.length > 0 ? (
              <BestMandi mandis={forecastData.nearby_mandis} />
            ) : (
              <section className="pb-10">
                <div className="container">
                  <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm">
                    <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-3 font-semibold text-foreground">
                      No nearby mandi options available for this selection.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try another crop or mandi to see market comparison recommendations.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
