import pytest

from app import create_app
from config import TestConfig
from models import db

PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=="


@pytest.fixture()
def client():
    app = create_app(TestConfig)
    with app.test_client() as c:
        yield c
    with app.app_context():
        db.drop_all()


def test_home_and_health(client):
    r = client.get("/")
    assert r.status_code == 200
    assert b'id="oneplug-boot"' in r.data
    assert "Content-Security-Policy" in r.headers
    assert client.get("/healthz").json == {"status": "ok"}


def test_seeded_data(client):
    assert len(client.get("/api/countries").json) == 6
    assert len(client.get("/api/operators").json) == 19
    assert len(client.get("/api/stations").json) == 52
    gh_swaps = client.get("/api/stations?cc=gh&kind=swap").json
    assert gh_swaps and all(s["kind"] == "swap" and s["cc"] == "gh" for s in gh_swaps)


def test_review_updates_rating(client):
    before = client.get("/api/stations/GH-VG-001").json
    r = client.post("/api/stations/GH-VG-001/reviews", json={"stars": 5, "text": "Fast and clean"})
    assert r.status_code == 201
    assert r.json["n0"] == before["n0"] + 1
    assert r.json["r0"] >= before["r0"]


@pytest.mark.parametrize("stars", [0, 6, "5", 4.5, True, None])
def test_review_rejects_bad_stars(client, stars):
    assert client.post("/api/stations/GH-VG-001/reviews", json={"stars": stars}).status_code == 400


def test_report_flow(client):
    r = client.post(
        "/api/stations/GH-PS-001/reports",
        json={"issue": "No full batteries", "units": ["Slot 1"], "note": "Queue of 6", "photos": [PHOTO]},
    )
    assert r.status_code == 201
    assert r.json["reports"][-1]["issue"] == "No full batteries"


def test_report_validation(client):
    # charge-only issue on a swap station
    assert client.post("/api/stations/GH-PS-001/reports", json={"issue": "Cable damaged"}).status_code == 400
    bad_photo = {"issue": "Station closed", "photos": ["javascript:alert(1)"]}
    assert client.post("/api/stations/GH-PS-001/reports", json=bad_photo).status_code == 400
    assert client.post("/api/stations/NOPE/reports", json={"issue": "Station closed"}).status_code == 404


def test_confirm(client):
    r = client.post("/api/stations/GH-VG-001/confirm", json={})
    assert r.status_code == 200 and r.json["confirmedAt"]
