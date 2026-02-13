import numpy as np


def classify_volatility(price_series: list[float]) -> str:
    if len(price_series) < 2:
        return "Low"

    std = float(np.std(price_series))
    mean = float(np.mean(price_series))
    cv = (std / mean) * 100 if mean else 0.0

    if cv < 1.2:
        return "Low"
    if cv < 2.5:
        return "Medium"
    return "High"
