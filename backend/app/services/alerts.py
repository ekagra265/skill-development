def detect_price_shock(history: list[float], threshold_pct: float = 5.0) -> str | None:
    if len(history) < 2:
        return None

    prev_price = history[-2]
    last_price = history[-1]
    if prev_price == 0:
        return None

    change_pct = ((last_price - prev_price) / prev_price) * 100
    if abs(change_pct) >= threshold_pct:
        direction = "drop" if change_pct < 0 else "jump"
        return f"Sudden price {direction} detected today ({change_pct:.1f}%)."
    return None
