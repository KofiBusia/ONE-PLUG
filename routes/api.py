"""JSON API: read networks, post ratings, problem reports and status confirmations."""
import re

from flask import Blueprint, jsonify, request

from extensions import limiter
from models import Country, Operator, Report, Review, Station, db, utcnow

api_bp = Blueprint("api", __name__, url_prefix="/api")

ISSUES = {
    "charge": [
        "Charger not working",
        "Status shown is wrong",
        "Blocked by a petrol car",
        "Payment failed",
        "Cable damaged",
        "Station closed",
    ],
    "swap": [
        "No full batteries",
        "Battery wouldn't release",
        "Status shown is wrong",
        "Payment failed",
        "Station closed",
    ],
}
MAX_PHOTOS = 3
MAX_PHOTO_CHARS = 400_000  # ~300 KB JPEG once base64-decoded; the app sends ~480px images
PHOTO_RE = re.compile(r"^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$")


class ApiError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message, self.status = message, status


@api_bp.errorhandler(ApiError)
def _api_error(e: ApiError):
    return jsonify(error=e.message), e.status


def _station_or_404(station_id: str) -> Station:
    st = db.session.get(Station, station_id)
    if st is None:
        raise ApiError("Station not found", 404)
    return st


def _body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Send a JSON object")
    return data


def _clean_text(value, limit: int, field: str) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ApiError(f"{field} must be text")
    value = value.strip()
    if len(value) > limit:
        raise ApiError(f"{field} is longer than {limit} characters")
    return value


# ---------- reads ----------
@api_bp.get("/countries")
def countries():
    rows = Country.query.order_by(Country.sort_order).all()
    return jsonify({c.key: c.to_dict() for c in rows})


@api_bp.get("/operators")
def operators():
    q = Operator.query
    if cc := request.args.get("cc"):
        q = q.filter_by(country_key=cc)
    return jsonify({o.key: o.to_dict() for o in q.all()})


@api_bp.get("/stations")
def stations():
    q = Station.query
    if cc := request.args.get("cc"):
        q = q.filter_by(country_key=cc)
    if kind := request.args.get("kind"):
        if kind not in ISSUES:
            raise ApiError("kind must be 'charge' or 'swap'")
        q = q.filter_by(kind=kind)
    return jsonify([s.to_dict() for s in q.order_by(Station.id).all()])


@api_bp.get("/stations/<station_id>")
def station(station_id):
    return jsonify(_station_or_404(station_id).to_dict())


# ---------- community writes ----------
@api_bp.post("/stations/<station_id>/reviews")
@limiter.limit("20 per hour")
def add_review(station_id):
    st = _station_or_404(station_id)
    data = _body()
    stars = data.get("stars")
    if not isinstance(stars, int) or isinstance(stars, bool) or not 1 <= stars <= 5:
        raise ApiError("stars must be a whole number from 1 to 5")
    db.session.add(Review(station_id=st.id, stars=stars, text=_clean_text(data.get("text"), 160, "text")))
    db.session.commit()
    return jsonify(st.to_dict()), 201


@api_bp.post("/stations/<station_id>/reports")
@limiter.limit("20 per hour")
def add_report(station_id):
    st = _station_or_404(station_id)
    data = _body()

    issue = data.get("issue")
    if issue not in ISSUES[st.kind]:
        raise ApiError("Pick one of the listed problems")

    units = data.get("units") or []
    if not isinstance(units, list) or len(units) > len(st.connectors):
        raise ApiError("units must be a list of affected chargers or batteries")
    units = [_clean_text(u, 40, "unit") for u in units]

    photos = data.get("photos") or []
    if not isinstance(photos, list) or len(photos) > MAX_PHOTOS:
        raise ApiError(f"Up to {MAX_PHOTOS} photos")
    for p in photos:
        if not isinstance(p, str) or len(p) > MAX_PHOTO_CHARS or not PHOTO_RE.match(p):
            raise ApiError("Each photo must be a small JPEG, PNG or WebP image")

    db.session.add(
        Report(
            station_id=st.id,
            issue=issue,
            units=units,
            note=_clean_text(data.get("note"), 200, "note"),
            photos=photos,
        )
    )
    db.session.commit()
    return jsonify(st.to_dict()), 201


@api_bp.post("/stations/<station_id>/confirm")
@limiter.limit("30 per hour")
def confirm_status(station_id):
    st = _station_or_404(station_id)
    st.last_confirmed_at = utcnow()
    db.session.commit()
    return jsonify(st.to_dict())
