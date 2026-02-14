import { TrendingUp, BarChart3, ArrowRight, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero-bg">
      {/* Background image with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-hero-bg/70" aria-hidden="true" />

      {/* Subtle decorative grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
        aria-hidden="true"
      />

      <div className="container relative z-10 flex flex-col items-center py-28 text-center md:py-36 lg:py-44">
        <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold tracking-wide text-hero-muted">
            Prescriptive Agricultural Intelligence
          </span>
        </div>

        <h1 className="max-w-4xl text-balance font-serif text-4xl leading-tight tracking-tight text-hero-text md:text-5xl lg:text-7xl">
          AI-Powered Agricultural Market Intelligence
        </h1>

        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-hero-muted md:text-lg">
          Predict crop prices, discover the best mandis, and make smarter
          selling decisions with real-time AI-driven forecasts and
          recommendations built for Indian agriculture.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="#forecast"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
          >
            <TrendingUp className="h-4 w-4" />
            Start Forecast
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <a
            href="#dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-hero-muted/20 bg-hero-text/5 px-7 py-3.5 text-sm font-semibold text-hero-text backdrop-blur-sm transition-all hover:bg-hero-text/10 hover:border-hero-muted/30"
          >
            <BarChart3 className="h-4 w-4" />
            View Market Trends
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid w-full max-w-3xl grid-cols-3 gap-6 rounded-2xl border border-hero-text/10 bg-hero-text/5 px-8 py-7 backdrop-blur-md">
          {[
            { label: "Mandis Tracked", value: "500+" },
            { label: "Crops Covered", value: "50+" },
            { label: "Forecast Accuracy", value: "92%" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center gap-1.5 ${
                i < 2 ? "border-r border-hero-text/10" : ""
              }`}
            >
              <span className="text-3xl font-bold text-hero-text md:text-4xl">
                {stat.value}
              </span>
              <span className="text-xs font-medium tracking-wide text-hero-muted">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
