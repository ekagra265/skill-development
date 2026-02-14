import { TrendingUp, BarChart3 } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-foreground">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-foreground/60" aria-hidden="true" />

      <div className="container relative z-10 flex flex-col items-center py-24 text-center md:py-32 lg:py-40">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs font-medium text-primary-foreground/80">
            Prescriptive Agricultural Intelligence
          </span>
        </div>

        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-card md:text-5xl lg:text-6xl">
          AI-Powered Agricultural Market Intelligence
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-card/70 md:text-xl">
          Predict crop prices, discover best mandis, and make smarter selling
          decisions with real-time AI-driven forecasts and recommendations.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="#forecast"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-primary/40"
          >
            <TrendingUp className="h-4 w-4" />
            Start Forecast
          </a>
          <a
            href="#dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-card/20 bg-card/10 px-6 py-3 text-sm font-semibold text-card backdrop-blur-sm transition-colors hover:bg-card/20"
          >
            <BarChart3 className="h-4 w-4" />
            View Market Trends
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-4 rounded-2xl border border-card/10 bg-card/5 p-6 backdrop-blur-md">
          {[
            { label: "Mandis Tracked", value: "500+" },
            { label: "Crops Covered", value: "50+" },
            { label: "Forecast Accuracy", value: "92%" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold text-card md:text-3xl">
                {stat.value}
              </span>
              <span className="text-xs text-card/60">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
