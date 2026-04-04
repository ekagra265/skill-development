import { Lightbulb, AlertCircle, TrendingUp, Zap } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";

const iconMap = [Lightbulb, TrendingUp, AlertCircle, Zap];
const iconBg = [
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

const fallbackInsights = {
  en: [
    "Monitor market volatility closely before making large-volume trades.",
    "Diversify selling across multiple mandis to reduce concentration risk.",
    "Early morning arrivals at mandis typically secure better auction prices.",
    "Track government MSP announcements for price floor protections.",
  ],
  hi: [
    "बड़े व्यापार निर्णय से पहले बाजार की अस्थिरता को ध्यान से देखें।",
    "जोखिम कम करने के लिए कई मंडियों में बिक्री का संतुलन रखें।",
    "सुबह जल्दी मंडी पहुंचने पर अक्सर बेहतर बोली कीमत मिलती है।",
    "MSP घोषणाओं पर नजर रखें ताकि न्यूनतम मूल्य सुरक्षा समझ सकें।",
  ],
};

export function InsightsSection({ insights }: { insights?: string[] }) {
  const { lang, isHindi } = useLang();
  const displayInsights = insights?.length ? insights : fallbackInsights[lang];

  return (
    <section
      id="insights"
      className="py-16 md:py-20"
      style={{ background: "linear-gradient(180deg, #edf5f0 0%, #f5f7f5 100%)" }}
    >
      <div className="container">
        <div className="mb-10 text-center">
          <span className={`mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "insights_badge")}
          </span>
          <h2 className={`text-2xl font-display font-bold text-foreground md:text-3xl ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "insights_title")}
          </h2>
          <p className={`mt-2 text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
            {t(lang, "insights_subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {displayInsights.map((insight, i) => {
            const Icon = iconMap[i % iconMap.length];
            const iconClass = iconBg[i % iconBg.length];

            return (
              <div
                key={i}
                className="card-hover animate-fade-up flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-card"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
                    {t(lang, "insight_label", i + 1)}
                  </span>
                  <p className={`text-sm leading-relaxed text-card-foreground ${isHindi ? "font-devanagari" : ""}`}>
                    {insight}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
