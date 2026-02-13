import os

import requests
import streamlit as st

API_BASE_URL = os.getenv("AGRIPULSE_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
FORECAST_API_URL = f"{API_BASE_URL}/forecast"
HEALTH_API_URL = f"{API_BASE_URL}/health"

st.set_page_config(page_title="AgriPulse", page_icon="seedling", layout="wide")
st.title("AgriPulse - Crop Price Intelligence")

col1, col2 = st.columns(2)
with col1:
    crop = st.text_input("Crop", value="Wheat")
    mandi = st.text_input("Mandi", value="Delhi Azadpur")
    district = st.text_input("District", value="Delhi")
with col2:
    pincode = st.text_input("Pincode", value="110001")
    days = st.slider("Forecast Days", min_value=1, max_value=7, value=7)
    language = st.selectbox("Language", ["en", "hi"], index=0)

with st.sidebar:
    st.caption(f"Backend: {API_BASE_URL}")
    if st.button("Check Backend Health"):
        try:
            health_response = requests.get(HEALTH_API_URL, timeout=10)
            health_response.raise_for_status()
            health = health_response.json()
            st.success(f"{health.get('service', 'service')} is {health.get('status', 'ok')}")
        except Exception as exc:
            st.error(f"Backend health check failed: {exc}")


if st.button("Get Forecast"):
    payload = {
        "crop": crop,
        "mandi": mandi,
        "district": district,
        "pincode": pincode,
        "days": days,
        "language": language,
    }
    try:
        response = requests.post(FORECAST_API_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()

        recommendation = data.get("recommendation", {})
        recommendation_action = recommendation.get("action", "N/A")
        recommendation_message = recommendation.get(
            "message", "No recommendation message available."
        )
        confidence = recommendation.get("confidence")
        risk_level = recommendation.get("risk_level")

        st.subheader("Recommendation")
        st.success(f"{recommendation_action} | {recommendation_message}")
        if confidence is not None and risk_level is not None:
            st.write(f"Confidence: **{confidence}%** | Risk: **{risk_level}**")

        st.write(f"Expected change: **{data['expected_change_pct']}%**")
        st.write(f"Trend: **{data['trend_direction']}**")
        st.write(f"Volatility: **{data['volatility_level']}**")

        if data.get("shock_alert"):
            st.warning(data["shock_alert"])

        st.subheader("7-Day Forecast")
        st.dataframe(data.get("forecast", []), use_container_width=True)

        st.subheader("Nearby Mandis")
        st.dataframe(data.get("nearby_mandis", []), use_container_width=True)

        st.subheader("Insights")
        for item in data.get("insights", []):
            st.write(f"- {item}")
    except requests.HTTPError as exc:
        status_code = exc.response.status_code if exc.response is not None else "unknown"
        detail = ""
        if exc.response is not None:
            try:
                detail = exc.response.json().get("detail", "")
            except Exception:
                detail = exc.response.text
        st.error(f"Forecast request failed ({status_code}): {detail}")
    except Exception as exc:
        st.error(f"Failed to fetch forecast: {exc}")
