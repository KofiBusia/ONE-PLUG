"""HTML page and health check."""
from flask import Blueprint, current_app, render_template
from sqlalchemy import text

from models import Country, Operator, Station, db

pages_bp = Blueprint("pages", __name__)


def bootstrap_payload() -> dict:
    """Everything the single-page app needs on first paint."""
    countries = Country.query.order_by(Country.sort_order).all()
    return {
        "config": {
            "apiBase": "/api",
            "googleMapsApiKey": current_app.config["GOOGLE_MAPS_API_KEY"],
            "googleMapId": current_app.config["GOOGLE_MAP_ID"],
        },
        "countries": {c.key: c.to_dict() for c in countries},
        "operators": {o.key: o.to_dict() for o in Operator.query.all()},
        "stations": [s.to_dict() for s in Station.query.order_by(Station.country_key, Station.id).all()],
    }


@pages_bp.get("/")
def index():
    return render_template("index.html", boot=bootstrap_payload())


@pages_bp.get("/healthz")
def healthz():
    db.session.execute(text("SELECT 1"))
    return {"status": "ok"}
