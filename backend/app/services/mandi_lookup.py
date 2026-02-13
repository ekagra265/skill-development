def get_nearby_mandis(
    district: str | None = None,
    pincode: str | None = None,
) -> list[dict]:
    # Placeholder logic; replace with geospatial lookup from DB.
    base_district = district or "Unknown"
    return [
        {
            "mandi": "Central Mandi",
            "district": base_district,
            "distance_km": 8.4,
            "current_price": 2410.0,
            "expected_7d_change_pct": 2.8,
        },
        {
            "mandi": "City Grain Market",
            "district": base_district,
            "distance_km": 14.2,
            "current_price": 2385.0,
            "expected_7d_change_pct": 1.9,
        },
        {
            "mandi": "Regional Agro Hub",
            "district": base_district,
            "distance_km": 21.7,
            "current_price": 2445.0,
            "expected_7d_change_pct": 3.4,
        },
    ]
