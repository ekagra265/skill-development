"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { t } from "@/lib/types";

const faqs = {
  en: [
    {
      q: "How does AgriPulse predict crop prices?",
      a: "AgriPulse uses time-series forecasting trained on historical mandi price data and market signals to produce 7-day projections with confidence intervals.",
    },
    {
      q: "Which mandis and crops are supported?",
      a: "The platform tracks 500+ mandis across India and covers 50+ crops including wheat, tomato, onion, cotton, soybean, and maize.",
    },
    {
      q: "How accurate are predictions?",
      a: "Accuracy varies by crop and volatility, but forecasts generally perform strongly within the shown confidence band and include risk labeling for context.",
    },
    {
      q: "What do SELL NOW, HOLD, and WAIT mean?",
      a: "SELL NOW means downside risk is high, HOLD means price is relatively stable, and WAIT means upside potential remains. Use AI guidance with local mandi knowledge.",
    },
    {
      q: "Is AgriPulse free to use?",
      a: "A free tier is available for limited daily forecasts, while premium plans include deeper analytics, alerts, and expanded forecasting limits.",
    },
  ],
  hi: [
    {
      q: "AgriPulse फसल कीमतों का अनुमान कैसे लगाता है?",
      a: "AgriPulse ऐतिहासिक मंडी मूल्य डेटा और बाजार संकेतों पर आधारित टाइम-सीरीज़ मॉडल से 7-दिन का पूर्वानुमान देता है, जिसमें विश्वास सीमा भी शामिल होती है।",
    },
    {
      q: "कौन-सी मंडियां और फसलें समर्थित हैं?",
      a: "यह प्लेटफ़ॉर्म भारत की 500+ मंडियों को ट्रैक करता है और गेहूं, टमाटर, प्याज, कपास, सोयाबीन, मक्का सहित 50+ फसलें कवर करता है।",
    },
    {
      q: "पूर्वानुमान कितने सटीक हैं?",
      a: "सटीकता फसल और अस्थिरता पर निर्भर करती है, लेकिन अधिकांश मामलों में पूर्वानुमान विश्वास सीमा के भीतर अच्छा प्रदर्शन करते हैं और जोखिम स्तर भी दिखाते हैं।",
    },
    {
      q: "अभी बेचें, रुकें और प्रतीक्षा करें का क्या अर्थ है?",
      a: "‘अभी बेचें’ का मतलब गिरावट का जोखिम ज्यादा है, ‘रुकें’ का मतलब कीमत अपेक्षाकृत स्थिर है, और ‘प्रतीक्षा करें’ का मतलब आगे बढ़त की संभावना है।",
    },
    {
      q: "क्या AgriPulse मुफ्त है?",
      a: "सीमित दैनिक पूर्वानुमान के लिए मुफ्त संस्करण उपलब्ध है। प्रीमियम प्लान में उन्नत विश्लेषण, अलर्ट और अधिक पूर्वानुमान सीमा मिलती है।",
    },
  ],
};

function FaqItem({ q, a, isHindi }: { q: string; a: string; isHindi: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 py-5 text-left"
        aria-expanded={open}
      >
        <span className={`pr-2 text-sm font-semibold text-foreground md:text-base ${isHindi ? "font-devanagari" : ""}`}>
          {q}
        </span>

        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
            open
              ? "border-success bg-success text-white"
              : "border-border bg-secondary text-muted-foreground"
          }`}
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      <div
        className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}
      >
        <p className={`overflow-hidden pr-8 text-sm leading-relaxed text-muted-foreground ${isHindi ? "font-devanagari" : ""}`}>
          {a}
        </p>
      </div>
    </div>
  );
}

export function FaqSection() {
  const { lang, isHindi } = useLang();
  const items = faqs[lang];

  return (
    <section id="faq" className="py-16 md:py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <span className={`mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "faq_badge")}
            </span>
            <h2 className={`text-2xl font-display font-bold text-foreground md:text-3xl ${isHindi ? "font-devanagari" : ""}`}>
              {t(lang, "faq_title")}
            </h2>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card px-6 shadow-card">
            {items.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} isHindi={isHindi} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
