import { Lightbulb, AlertCircle, TrendingUp, Zap } from "lucide-react";

const iconMap = [Lightbulb, TrendingUp, AlertCircle, Zap];

const fallbackInsights = [
  "Monitor market volatility closely before making large-volume trades.",
  "Diversify selling across multiple mandis to reduce concentration risk.",
  "Early morning arrivals at mandis typically secure better auction prices.",
  "Track government MSP announcements for price floor protections.",
];

export function InsightsSection({ insights }: { insights?: string[] }) {
  const displayInsights = insights?.length ? insights : fallbackInsights;

  return (
    <section id="insights" className="bg-secondary/50 py-16 md:py-20">
      <div className="container">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Smart Insights
          </span>
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">
            AI-Generated Intelligence
          </h2>
          <p className="mt-2 text-muted-foreground">
            Actionable insights to help you make better selling decisions
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {displayInsights.map((insight, i) => {
            const Icon = iconMap[i % iconMap.length];
            return (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Insight {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-card-foreground">
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
