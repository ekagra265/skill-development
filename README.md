# AgriPulse - Real-Time Crop Price Intelligence (Starter)

AgriPulse is a starter implementation for a 7-day mandi price intelligence system.
This version is intentionally lightweight so you can integrate real data pipelines and ML models later.

## What is included

- FastAPI backend scaffold
- Forecast stub (replaceable with Prophet/ARIMA/LSTM)
- Sell/Hold recommendation logic
- Volatility meter (Low/Medium/High)
- Price shock alert detection
- Nearby mandi comparison stub
- Bilingual responses (`en`, `hi`)
- Streamlit frontend starter for quick demo

## Project structure

```text
backend/
  app/
    core/config.py
    services/
      forecast.py
      recommendation.py
      volatility.py
      alerts.py
      mandi_lookup.py
      insights.py
      i18n.py
    main.py
    schemas.py
  requirements.txt
frontend/
  app.py
data/
```

## Quick start

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: `http://127.0.0.1:8000/docs`

### 2) Frontend (optional)

```bash
cd frontend
pip install streamlit requests
streamlit run app.py
```

## Suggested next integrations

1. Replace `services/forecast.py` with Prophet/ARIMA/LSTM training + model registry.
2. Add Agmarknet ETL job and store prices in PostgreSQL.
3. Replace `services/mandi_lookup.py` with geospatial distance logic.
4. Add auth and user profiles for district/crop preferences.
5. Add scheduled daily forecast refresh.
