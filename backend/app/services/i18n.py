"""Bilingual text helpers for AgriPulse API responses (English + Hindi)."""
from __future__ import annotations

TRANSLATIONS: dict[str, dict[str, str]] = {
    "en": {
        # Recommendations
        "sell_now":      "Recommended: Sell Now",
        "hold":          "Recommended: Hold",
        "wait_days":     "Recommended: Wait {days} days",
        # Price change messages
        "price_rise":    "Prices expected to rise by {pct}% over the forecast horizon. Waiting is recommended.",
        "price_drop":    "Prices expected to fall by {pct}% over the forecast horizon. Selling now is recommended.",
        "price_stable":  "Prices are relatively stable ({pct}% change). You can hold or sell flexibly.",
        # Insights
        "trend_up":      "Prices show an upward trend this week.",
        "trend_down":    "Market shows downward pressure this week.",
        "trend_flat":    "Prices are mostly flat over the forecast window.",
        "change_pct":    "Projected change from first to last forecast day is {pct}%.",
        "change_zero":   "Percent change cannot be computed: first price is zero.",
        "change_na":     "Projected percent change is unavailable.",
        "risk_high":     "Risk is HIGH — volatility may cause sharp price swings.",
        "risk_medium":   "Risk is MEDIUM — moderate volatility is possible.",
        "risk_low":      "Risk is LOW — comparatively stable forecast confidence.",
        "risk_unknown":  "Risk level is unavailable for this forecast.",
        "action_sfx":    "Suggested action: {action}.",
        "action_na":     "Suggested action is unavailable.",
        # Shock alerts
        "shock_drop":    "Sudden price drop detected today ({pct}%).",
        "shock_jump":    "Sudden price jump detected today ({pct}%).",
    },
    "hi": {
        # Recommendations
        "sell_now":      "सलाह: अभी बेचें",
        "hold":          "सलाह: रुकें",
        "wait_days":     "सलाह: {days} दिन प्रतीक्षा करें",
        # Price change messages
        "price_rise":    "पूर्वानुमान अवधि में कीमतें {pct}% बढ़ने की संभावना है। प्रतीक्षा करना उचित है।",
        "price_drop":    "पूर्वानुमान अवधि में कीमतें {pct}% गिरने की संभावना है। अभी बेचना उचित है।",
        "price_stable":  "कीमतें अपेक्षाकृत स्थिर हैं ({pct}% बदलाव)। आप लचीले ढंग से बेच सकते हैं या रुक सकते हैं।",
        # Insights
        "trend_up":      "इस सप्ताह कीमतों में ऊपर की ओर रुझान दिखता है।",
        "trend_down":    "इस सप्ताह बाज़ार में गिरावट का दबाव है।",
        "trend_flat":    "पूर्वानुमान अवधि में कीमतें अधिकतर स्थिर हैं।",
        "change_pct":    "पहले से अंतिम पूर्वानुमान दिन तक अनुमानित बदलाव {pct}% है।",
        "change_zero":   "प्रतिशत परिवर्तन की गणना नहीं हो सकी: पहली कीमत शून्य है।",
        "change_na":     "अनुमानित प्रतिशत परिवर्तन उपलब्ध नहीं है।",
        "risk_high":     "जोखिम उच्च है — अस्थिरता से तेज़ मूल्य बदलाव हो सकता है।",
        "risk_medium":   "जोखिम मध्यम है — मध्यम अस्थिरता संभव है।",
        "risk_low":      "जोखिम कम है — पूर्वानुमान अपेक्षाकृत स्थिर है।",
        "risk_unknown":  "इस पूर्वानुमान के लिए जोखिम स्तर उपलब्ध नहीं है।",
        "action_sfx":    "सुझाई गई कार्रवाई: {action}।",
        "action_na":     "सुझाई गई कार्रवाई उपलब्ध नहीं है।",
        # Shock alerts
        "shock_drop":    "आज अचानक कीमत गिरावट दर्ज हुई ({pct}%)।",
        "shock_jump":    "आज अचानक कीमत उछाल दर्ज हुई ({pct}%)।",
    },
}

ACTION_HINDI = {
    "SELL NOW": "अभी बेचें",
    "HOLD":     "रुकें",
    "WAIT":     "प्रतीक्षा करें",
}


def t(lang: str, key: str, **kwargs: object) -> str:
    """Translate *key* into *lang*, falling back to English."""
    language = lang if lang in TRANSLATIONS else "en"
    template = TRANSLATIONS[language].get(key) or TRANSLATIONS["en"].get(key, key)
    return template.format(**kwargs) if kwargs else template


def localise_action(lang: str, action: str) -> str:
    """Return action label in the requested language."""
    if lang == "hi":
        return ACTION_HINDI.get(action, action)
    return action
