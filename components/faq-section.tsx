"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does AgriPulse predict crop prices?",
    a: "AgriPulse uses advanced time-series forecasting models (Prophet/ARIMA) trained on historical mandi price data from Agmarknet. Our AI analyzes seasonal patterns, market trends, and regional factors to provide 7-day forecasts with confidence intervals.",
  },
  {
    q: "Which mandis and crops are supported?",
    a: "We currently track 500+ mandis across India and cover 50+ crops including Wheat, Rice, Tomato, Onion, Cotton, Soybean, Maize, and more. Coverage is expanding regularly as we onboard new data sources.",
  },
  {
    q: "How accurate are the price predictions?",
    a: "Our models achieve approximately 92% accuracy within the confidence band for most crops. Accuracy varies by crop volatility and data availability. Each forecast includes a confidence score and risk level to help you gauge reliability.",
  },
  {
    q: "What do SELL NOW, HOLD, and WAIT mean?",
    a: "SELL NOW means our AI expects prices to decline, so selling quickly maximizes returns. HOLD suggests prices are stable, so timing is flexible. WAIT indicates prices may rise, so waiting could yield better returns. Always combine AI insights with your own market knowledge.",
  },
  {
    q: "Is AgriPulse free to use?",
    a: "AgriPulse offers a free tier with limited daily forecasts. Premium plans unlock unlimited forecasts, real-time alerts, multi-mandi comparison, and priority API access. Contact us for enterprise pricing.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
        aria-expanded={open}
      >
        <span className="pr-4 text-sm font-semibold text-foreground md:text-base">
          {q}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-20">
      <div className="container">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <span className="mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              FAQ
            </span>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-card px-6 shadow-sm">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
