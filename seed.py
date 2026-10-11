"""Load the demo networks from seed/seed_data.json into the database.

Run manually:   flask --app app seed-db            (adds only if empty)
                flask --app app seed-db --reset    (drops and reloads everything)
"""
import json
from pathlib import Path

from models import Connector, Country, Operator, Station, db

SEED_FILE = Path(__file__).resolve().parent / "seed" / "seed_data.json"


def load_seed() -> dict:
    with SEED_FILE.open(encoding="utf-8") as f:
        return json.load(f)


def seed_database(reset: bool = False) -> int:
    if reset:
        db.drop_all()
        db.create_all()
    elif Station.query.first() is not None:
        return 0

    data = load_seed()

    for i, (key, c) in enumerate(data["COUNTRIES"].items()):
        db.session.add(
            Country(
                key=key,
                code=c["code"],
                name=c["name"],
                city=c["city"],
                currency=c["cur"],
                locale=c["locale"],
                lang=c["lang"],
                colors=c["c"],
                me_lat=c["me"]["lat"],
                me_lng=c["me"]["lng"],
                bounds=c["bounds"],
                pay_methods=c["pay"],
                phone=c["phone"],
                topups=c["top"],
                welcome=c["welcome"],
                sort_order=i,
            )
        )
    db.session.flush()

    for key, o in data["OPS"].items():
        db.session.add(Operator(key=key, name=o["name"], kind=o["kind"], country_key=o["cc"]))
    db.session.flush()

    for s in data["STATIONS"]:
        st = Station(
            id=s["id"],
            country_key=s["cc"],
            operator_key=s["op"],
            kind=s["kind"],
            name=s["name"],
            area=s["area"],
            lat=s["lat"],
            lng=s["lng"],
            price=s["price"],
            hours=s["hours"],
            amenities=s.get("amen", ""),
            vehicle_classes=s.get("veh"),
            pack=s.get("pack"),
            slots=s.get("slots"),
            base_rating=s["r0"],
            base_count=s["n0"],
            update_minutes=s["upd"],
        )
        for pos, c in enumerate(s["conns"]):
            st.connectors.append(
                Connector(
                    id=c["id"],
                    position=pos,
                    plug_type=c.get("type"),
                    kw=c.get("kw"),
                    slot=c.get("slot"),
                    status=c["status"],
                )
            )
        db.session.add(st)

    db.session.commit()
    return len(data["STATIONS"])
