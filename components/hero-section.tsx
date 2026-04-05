import { TrendingUp, BarChart3 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";

export function HeroSection() {
  const { lang, isHindi } = useLang();

  return (
    <section className="hero-mesh noise-overlay relative overflow-hidden bg-[#071510]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, #071510 0%, #0a1e13 45%, #071510 100%)",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute -top-24 right-[8%] h-72 w-72 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(33,140,84,0.45) 0%, rgba(33,140,84,0) 70%)" }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-7rem] left-[-4rem] h-80 w-80 rounded-full opacity-55 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.38) 0%, rgba(16,185,129,0) 70%)" }}
        aria-hidden="true"
      />

      <div className="container relative z-10 flex flex-col items-center py-24 text-center md:py-32 lg:py-40">
        <div className="fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
          <span className="glow-dot h-2.5 w-2.5 rounded-full bg-green-400" />
          <span className={`text-xs font-semibold tracking-wide text-white/80 ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "hero_badge")}
          </span>
        </div>

        <h1
          className={`animate-fade-up animate-fade-up-1 max-w-4xl text-balance text-4xl font-display font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl ${isHindi ? "font-devanagari" : ""}`}
        >
          {t(lang, "hero_title")}
        </h1>

        <p
          className={`animate-fade-up animate-fade-up-2 mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-white/70 md:text-xl ${isHindi ? "font-devanagari" : ""}`}
        >
          {t(lang, "hero_subtitle")}
        </p>

        <div className="animate-fade-up animate-fade-up-3 mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <a
            href="#forecast"
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-primary-dark hover:shadow-xl ${isHindi ? "font-devanagari" : ""}`}
          >
            <TrendingUp className="h-4 w-4" />
            {t(lang, "hero_cta_primary")}
          </a>
          <a
            href="#dashboard"
            className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 ${isHindi ? "font-devanagari" : ""}`}
          >
            <BarChart3 className="h-4 w-4" />
            {t(lang, "hero_cta_secondary")}
          </a>
        </div>

        <div className="animate-fade-up animate-fade-up-4 mt-16 grid w-full max-w-3xl grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-white/8 backdrop-blur-md">
          {[
            { labelKey: "hero_stat_mandis" as const, value: "500+" },
            { labelKey: "hero_stat_crops" as const, value: "50+" },
            { labelKey: "hero_stat_accuracy" as const, value: "92%" },
          ].map((stat, idx) => (
            <div
              key={stat.labelKey}
              className={`flex flex-col items-center gap-1.5 px-4 py-6 transition-colors hover:bg-black/20 ${idx !== 0 ? "border-l border-white/10" : ""}`}
            >
              <span className="text-3xl font-display font-bold text-white md:text-4xl">
                {stat.value}
              </span>
              <span className={`text-xs text-white/55 ${isHindi ? "font-devanagari" : ""}`}>
                {t(lang, stat.labelKey)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
