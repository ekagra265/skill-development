export type Language = "en" | "hi";

export interface ForecastRequest {
  crop: string;
  mandi: string;
  district?: string;
  pincode?: string;
  days?: number;
  language?: Language;
}

export interface ForecastPoint {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

export interface RecommendationResult {
  action: "WAIT" | "SELL NOW" | "HOLD";
  expected_change_percent: number;
  message: string;
  confidence: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
}

export interface MandiOption {
  mandi: string;
  district: string;
  distance_km: number;
  current_price: number;
  expected_7d_change_pct: number;
}

export interface ForecastResponse {
  crop: string;
  mandi: string;
  current_price: number;
  trend_direction: "up" | "down" | "flat";
  expected_change_pct: number;
  recommendation: RecommendationResult;
  volatility_level: "Low" | "Medium" | "High";
  shock_alert: string | null;
  forecast: ForecastPoint[];
  nearby_mandis: MandiOption[];
  insights: string[];
  language: Language;
}

export interface BestMandiResponse {
  state: string;
  commodity: string;
  best_mandis: {
    mandi: string;
    expected_change_percent: number;
  }[];
}

export interface CropOverview {
  name: string;
  icon: string;
  price: number;
  change: number;
  trend: "up" | "down" | "flat";
}

// ─── i18n dictionary ───────────────────────────────────────────────────────────
export const UI_TEXT = {
  en: {
    // Navbar
    nav_dashboard: "Dashboard",
    nav_forecast: "Forecast",
    nav_best_mandi: "Best Mandi",
    nav_insights: "Insights",
    nav_faq: "FAQ",
    nav_cta: "Start Forecast",

    // Hero
    hero_badge: "Prescriptive Agricultural Intelligence",
    hero_title: "AI-Powered Agricultural Market Intelligence",
    hero_subtitle:
      "Predict crop prices, discover best mandis, and make smarter selling decisions with real-time AI-driven forecasts.",
    hero_cta_primary: "Start Forecast",
    hero_cta_secondary: "View Market Trends",
    hero_stat_mandis: "Mandis Tracked",
    hero_stat_crops: "Crops Covered",
    hero_stat_accuracy: "Forecast Accuracy",

    // Market Overview
    market_badge: "Market Overview",
    market_title: "Top Crop Prices Today",
    market_subtitle: "Average modal prices across all mandis from your dataset",
    market_modal: "Modal Price",
    market_per_quintal: "/quintal",
    market_daily_change: "vs. previous trading day",

    // Forecast Search
    forecast_badge: "AI Forecast",
    forecast_title: "Predict Crop Prices",
    forecast_subtitle:
      "Select a crop and mandi to get a 7-day price forecast with actionable recommendations.",
    forecast_crop_label: "Crop",
    forecast_crop_placeholder_loading: "Loading crops…",
    forecast_crop_placeholder: "Select a crop",
    forecast_mandi_label: "Mandi",
    forecast_mandi_placeholder_first: "Select a crop first",
    forecast_mandi_placeholder_loading: "Loading mandis…",
    forecast_mandi_placeholder: (n: number) => `Select a mandi (${n} available)`,
    forecast_btn: "Predict Prices",
    forecast_btn_loading: "Running Forecast…",

    // Dashboard
    dashboard_label: "Forecast Results",
    dashboard_ai_label: "AI Recommendation",
    dashboard_current_price: "Current Price",
    dashboard_expected_change: "Expected Change",
    dashboard_confidence: "Confidence",
    dashboard_risk: "Risk Level",
    dashboard_volatility: "Volatility",
    dashboard_shock_title: "Price Shock Alert",

    // Chart
    chart_title: "7-Day Price Forecast",
    chart_subtitle: (crop: string) =>
      `Predicted prices for ${crop} with confidence bands`,
    chart_predicted: "Predicted Price",
    chart_confidence_band: "Confidence Band",

    // Best Mandi
    mandi_badge: "Best Mandi",
    mandi_title: "Recommended Selling Locations",
    mandi_subtitle: "Mandis ranked by expected 7-day price advantage",
    mandi_per_quintal: "/quintal",

    // Insights
    insights_badge: "Smart Insights",
    insights_title: "AI-Generated Intelligence",
    insights_subtitle:
      "Actionable insights to help you make better selling decisions",
    insight_label: (n: number) => `Insight ${n}`,

    // FAQ
    faq_badge: "FAQ",
    faq_title: "Frequently Asked Questions",

    // Footer
    footer_tagline:
      "Prescriptive agricultural intelligence for smarter farming and trading decisions across India.",
    footer_product: "Product",
    footer_resources: "Resources",
    footer_company: "Company",
    footer_about: "About",
    footer_contact: "Contact",
    footer_privacy: "Privacy",
    footer_api_docs: "API Docs",
    footer_copy: "2026 AgriPulse. All rights reserved. Built for Indian Agriculture.",
  },

  hi: {
    // Navbar
    nav_dashboard: "डैशबोर्ड",
    nav_forecast: "पूर्वानुमान",
    nav_best_mandi: "सर्वश्रेष्ठ मंडी",
    nav_insights: "अंतर्दृष्टि",
    nav_faq: "सामान्य प्रश्न",
    nav_cta: "पूर्वानुमान शुरू करें",

    // Hero
    hero_badge: "कृषि बुद्धिमत्ता प्रणाली",
    hero_title: "AI-आधारित कृषि बाज़ार बुद्धिमत्ता",
    hero_subtitle:
      "फसल की कीमतों का अनुमान लगाएं, सर्वश्रेष्ठ मंडियां खोजें, और AI-आधारित पूर्वानुमान से स्मार्ट बिक्री निर्णय लें।",
    hero_cta_primary: "पूर्वानुमान शुरू करें",
    hero_cta_secondary: "बाज़ार रुझान देखें",
    hero_stat_mandis: "मंडियां ट्रैक",
    hero_stat_crops: "फसलें शामिल",
    hero_stat_accuracy: "पूर्वानुमान सटीकता",

    // Market Overview
    market_badge: "बाज़ार अवलोकन",
    market_title: "आज की प्रमुख फसल कीमतें",
    market_subtitle: "आपके डेटासेट से सभी मंडियों की औसत मोडल कीमतें",
    market_modal: "मोडल मूल्य",
    market_per_quintal: "/क्विंटल",
    market_daily_change: "पिछले कारोबारी दिन की तुलना में",

    // Forecast Search
    forecast_badge: "AI पूर्वानुमान",
    forecast_title: "फसल कीमतों का अनुमान लगाएं",
    forecast_subtitle:
      "7-दिन के मूल्य पूर्वानुमान के लिए फसल और मंडी चुनें।",
    forecast_crop_label: "फसल",
    forecast_crop_placeholder_loading: "फसलें लोड हो रही हैं…",
    forecast_crop_placeholder: "फसल चुनें",
    forecast_mandi_label: "मंडी",
    forecast_mandi_placeholder_first: "पहले फसल चुनें",
    forecast_mandi_placeholder_loading: "मंडियां लोड हो रही हैं…",
    forecast_mandi_placeholder: (n: number) => `मंडी चुनें (${n} उपलब्ध)`,
    forecast_btn: "कीमत अनुमान लगाएं",
    forecast_btn_loading: "पूर्वानुमान चल रहा है…",

    // Dashboard
    dashboard_label: "पूर्वानुमान परिणाम",
    dashboard_ai_label: "AI सलाह",
    dashboard_current_price: "वर्तमान मूल्य",
    dashboard_expected_change: "अपेक्षित बदलाव",
    dashboard_confidence: "विश्वास स्तर",
    dashboard_risk: "जोखिम स्तर",
    dashboard_volatility: "अस्थिरता",
    dashboard_shock_title: "मूल्य झटका चेतावनी",

    // Chart
    chart_title: "7-दिन मूल्य पूर्वानुमान",
    chart_subtitle: (crop: string) =>
      `${crop} के लिए विश्वास बैंड सहित अनुमानित कीमतें`,
    chart_predicted: "अनुमानित मूल्य",
    chart_confidence_band: "विश्वास बैंड",

    // Best Mandi
    mandi_badge: "सर्वश्रेष्ठ मंडी",
    mandi_title: "अनुशंसित बिक्री स्थान",
    mandi_subtitle: "7-दिन के मूल्य लाभ के आधार पर मंडियों की रैंकिंग",
    mandi_per_quintal: "/क्विंटल",

    // Insights
    insights_badge: "स्मार्ट अंतर्दृष्टि",
    insights_title: "AI-जनित बुद्धिमत्ता",
    insights_subtitle: "बेहतर बिक्री निर्णय लेने के लिए कार्रवाई योग्य अंतर्दृष्टि",
    insight_label: (n: number) => `अंतर्दृष्टि ${n}`,

    // FAQ
    faq_badge: "सामान्य प्रश्न",
    faq_title: "अक्सर पूछे जाने वाले प्रश्न",

    // Footer
    footer_tagline:
      "पूरे भारत में स्मार्ट खेती और व्यापार निर्णयों के लिए कृषि बुद्धिमत्ता।",
    footer_product: "उत्पाद",
    footer_resources: "संसाधन",
    footer_company: "कंपनी",
    footer_about: "हमारे बारे में",
    footer_contact: "संपर्क",
    footer_privacy: "गोपनीयता",
    footer_api_docs: "API दस्तावेज़",
    footer_copy: "2026 AgriPulse। सर्वाधिकार सुरक्षित। भारतीय कृषि के लिए निर्मित।",
  },
} as const;

export type UITextKey = keyof typeof UI_TEXT.en;

export function t(lang: Language, key: UITextKey, ...args: unknown[]): string {
  const dict = UI_TEXT[lang] ?? UI_TEXT.en;
  const val = (dict as Record<string, unknown>)[key];
  if (typeof val === "function") {
    return (val as (...a: unknown[]) => string)(...args);
  }
  return (val as string) ?? key;
}
