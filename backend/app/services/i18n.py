TRANSLATIONS = {
    "en": {
        "sell_now": "Recommended: Sell Now",
        "wait_days": "Recommended: Wait {days} Days",
        "increase_msg": "Expected {pct}% price increase",
        "drop_msg": "Downward trend expected ({pct}%)",
    },
    "hi": {
        "sell_now": "सलाह: अभी बेचें",
        "wait_days": "सलाह: {days} दिन रुकें",
        "increase_msg": "कीमत में {pct}% वृद्धि की संभावना",
        "drop_msg": "कीमत गिरने की संभावना ({pct}%)",
    },
}


def t(lang: str, key: str, **kwargs) -> str:
    language = lang if lang in TRANSLATIONS else "en"
    template = TRANSLATIONS[language].get(key, key)
    return template.format(**kwargs)
