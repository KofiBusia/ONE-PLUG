# OnePlug Africa

EV charging and battery-swap finder for Ghana, Nigeria, Kenya, Côte d'Ivoire, Rwanda and Togo. Flask serves the app, keeps countries, networks and stations in a database, and stores community ratings, problem reports and status confirmations so every driver sees them.

## Project layout

```
oneplug-africa/
├── app.py                 # Flask entry point (python app.py / gunicorn app:app)
├── config.py              # settings from environment variables
├── models.py              # Country, Operator, Station, Connector, Review, Report
├── seed.py                # loads seed/seed_data.json into the database
├── seed/seed_data.json    # demo networks and stations (fictional networks, real locations)
├── routes/
│   ├── pages.py           # "/" and "/healthz"
│   └── api.py             # JSON API
├── templates/index.html   # page shell; injects data as window.ONEPLUG
├── static/css/app.css
├── static/js/app.js       # the single-page app
├── tests/test_app.py
├── render.yaml            # Render Blueprint (web service + Postgres)
├── requirements.txt
└── .python-version        # 3.11
```

## Run locally (Windows PowerShell)

```powershell
cd oneplug-africa
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env      # then paste your Google Maps key and Map ID into .env
python app.py                    # http://localhost:5000
```

First boot creates `instance/oneplug.db` (SQLite) and loads the demo data. To use local PostgreSQL instead, set `DATABASE_URL` in `.env`.

```powershell
pytest -q                                   # run tests
flask --app app seed-db --reset             # wipe and reload demo data
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/countries` | Country settings (currency, payment methods, map bounds) |
| GET | `/api/operators?cc=gh` | Charging and swap networks |
| GET | `/api/stations?cc=gh&kind=swap` | Stations with connectors, rating, recent reports |
| GET | `/api/stations/<id>` | One station |
| POST | `/api/stations/<id>/reviews` | `{"stars": 1-5, "text": "..."}` |
| POST | `/api/stations/<id>/reports` | `{"issue": "...", "units": [], "note": "...", "photos": [dataURL]}` |
| POST | `/api/stations/<id>/confirm` | Mark the shown status as correct |
| GET | `/healthz` | Health check used by Render |

## Deploy on Render

1. Push this folder to a GitHub repo.
2. Render dashboard → **New → Blueprint** → select the repo. `render.yaml` creates the web service and a Postgres database.
3. When prompted, enter `GOOGLE_MAPS_API_KEY` and `GOOGLE_MAP_ID`. `SECRET_KEY` is generated for you.
4. In Google Cloud, add your Render URL (`https://<service>.onrender.com/*`) to the API key's website restrictions.

Free plan limits (render.com/docs/free): the web service sleeps after 15 minutes idle and takes about a minute to wake; the free database expires 30 days after creation unless upgraded.

## What stays on the device

Wallet balance, transactions, vehicles, favourites, charging sessions and 15-minute holds are still kept in the browser (`localStorage`), as in the original prototype. Moving them server-side needs user accounts and a payments integration (MoMo etc.), which this version does not include.
