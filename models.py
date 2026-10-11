"""Database models for countries, networks, stations and community input."""
from datetime import datetime, timedelta, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

REPORT_WINDOW_DAYS = 3


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_ms(dt: datetime | None) -> int | None:
    if dt is None:
        return None
    if dt.tzinfo is None:  # SQLite returns naive datetimes
        dt = dt.replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


class Country(db.Model):
    __tablename__ = "countries"

    key = db.Column(db.String(4), primary_key=True)  # "gh"
    code = db.Column(db.String(4), nullable=False)  # "GH"
    name = db.Column(db.String(80), nullable=False)
    city = db.Column(db.String(80), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    locale = db.Column(db.String(10), nullable=False)
    lang = db.Column(db.String(80), nullable=False)
    colors = db.Column(db.JSON, nullable=False)
    me_lat = db.Column(db.Float, nullable=False)
    me_lng = db.Column(db.Float, nullable=False)
    bounds = db.Column(db.JSON, nullable=False)
    pay_methods = db.Column(db.JSON, nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    topups = db.Column(db.JSON, nullable=False)
    welcome = db.Column(db.Numeric(14, 2), nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "name": self.name,
            "city": self.city,
            "cur": self.currency,
            "locale": self.locale,
            "lang": self.lang,
            "c": self.colors,
            "me": {"lat": self.me_lat, "lng": self.me_lng},
            "bounds": self.bounds,
            "pay": self.pay_methods,
            "phone": self.phone,
            "top": self.topups,
            "welcome": float(self.welcome),
        }


class Operator(db.Model):
    __tablename__ = "operators"

    key = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    kind = db.Column(db.String(10), nullable=False)  # charge | swap
    country_key = db.Column(db.String(4), db.ForeignKey("countries.key"), nullable=False)

    def to_dict(self) -> dict:
        return {"name": self.name, "kind": self.kind, "cc": self.country_key}


class Station(db.Model):
    __tablename__ = "stations"

    id = db.Column(db.String(20), primary_key=True)
    country_key = db.Column(db.String(4), db.ForeignKey("countries.key"), nullable=False, index=True)
    operator_key = db.Column(db.String(20), db.ForeignKey("operators.key"), nullable=False)
    kind = db.Column(db.String(10), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    area = db.Column(db.String(120), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    price = db.Column(db.Numeric(14, 2), nullable=False)  # per kWh (charge) or per swap
    hours = db.Column(db.String(60), nullable=False)
    amenities = db.Column(db.String(200), nullable=False, default="")
    vehicle_classes = db.Column(db.JSON)  # swap stations only
    pack = db.Column(db.String(40))
    slots = db.Column(db.Integer)
    # Baseline rating carried over from the operator feed; community reviews add to it
    base_rating = db.Column(db.Float, nullable=False, default=0)
    base_count = db.Column(db.Integer, nullable=False, default=0)
    update_minutes = db.Column(db.Integer, nullable=False, default=5)
    last_confirmed_at = db.Column(db.DateTime(timezone=True))

    connectors = db.relationship(
        "Connector", backref="station", order_by="Connector.position", cascade="all, delete-orphan"
    )
    reviews = db.relationship("Review", backref="station", lazy="dynamic", cascade="all, delete-orphan")
    reports = db.relationship("Report", backref="station", lazy="dynamic", cascade="all, delete-orphan")

    def rating(self) -> tuple[float, int]:
        total = db.session.query(db.func.count(Review.id), db.func.coalesce(db.func.sum(Review.stars), 0)).filter(
            Review.station_id == self.id
        ).one()
        n_reviews, star_sum = int(total[0]), float(total[1])
        n = self.base_count + n_reviews
        if n == 0:
            return 0.0, 0
        return (self.base_rating * self.base_count + star_sum) / n, n

    def recent_reports(self) -> list[dict]:
        since = utcnow() - timedelta(days=REPORT_WINDOW_DAYS)
        rows = self.reports.filter(Report.created_at >= since).order_by(Report.created_at.asc()).all()
        return [r.to_dict() for r in rows]

    def to_dict(self) -> dict:
        avg, n = self.rating()
        d = {
            "id": self.id,
            "cc": self.country_key,
            "op": self.operator_key,
            "kind": self.kind,
            "name": self.name,
            "area": self.area,
            "lat": self.lat,
            "lng": self.lng,
            "price": float(self.price),
            "hours": self.hours,
            "amen": self.amenities,
            "r0": round(avg, 3),
            "n0": n,
            "upd": self.update_minutes,
            "confirmedAt": to_ms(self.last_confirmed_at),
            "reports": self.recent_reports(),
            "conns": [c.to_dict(self.kind) for c in self.connectors],
        }
        if self.kind == "swap":
            d.update({"veh": self.vehicle_classes or [], "pack": self.pack, "slots": self.slots})
        return d


class Connector(db.Model):
    """A charger plug (charge stations) or a battery slot (swap stations)."""

    __tablename__ = "connectors"

    id = db.Column(db.String(30), primary_key=True)
    station_id = db.Column(db.String(20), db.ForeignKey("stations.id"), nullable=False, index=True)
    position = db.Column(db.Integer, nullable=False)
    plug_type = db.Column(db.String(20))  # charge only
    kw = db.Column(db.Integer)  # charge only
    slot = db.Column(db.Integer)  # swap only
    status = db.Column(db.String(12), nullable=False, default="available")

    def to_dict(self, kind: str) -> dict:
        if kind == "swap":
            return {"id": self.id, "slot": self.slot, "status": self.status}
        return {"type": self.plug_type, "kw": self.kw, "id": self.id, "status": self.status}


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.String(20), db.ForeignKey("stations.id"), nullable=False, index=True)
    stars = db.Column(db.Integer, nullable=False)
    text = db.Column(db.String(160), nullable=False, default="")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    station_id = db.Column(db.String(20), db.ForeignKey("stations.id"), nullable=False, index=True)
    issue = db.Column(db.String(60), nullable=False)
    units = db.Column(db.JSON, nullable=False, default=list)
    note = db.Column(db.String(200), nullable=False, default="")
    photos = db.Column(db.JSON, nullable=False, default=list)  # small JPEG data URLs, max 3
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, index=True)

    def to_dict(self) -> dict:
        return {
            "issue": self.issue,
            "units": self.units or [],
            "photos": self.photos or [],
            "note": self.note,
            "d": to_ms(self.created_at),
        }
