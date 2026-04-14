import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Skip lifespan (avoid real DB init); use TestClient without context manager
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_token(client):
    resp = client.post(
        "/api/auth/signup",
        json={
            "email": "test@example.com",
            "password": "password123",
            "nickname": "철수",
            "sport": "철인3종",
            "team_code": "AB12CD",
        },
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_signup_and_login(client):
    r = client.post(
        "/api/auth/signup",
        json={
            "email": "a@b.com",
            "password": "password123",
            "nickname": "kim",
        },
    )
    assert r.status_code == 201
    assert "access_token" in r.json()

    r = client.post(
        "/api/auth/login",
        json={"email": "a@b.com", "password": "password123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_signup_duplicate_email(client):
    body = {"email": "dup@x.com", "password": "password123", "nickname": "ab"}
    assert client.post("/api/auth/signup", json=body).status_code == 201
    assert client.post("/api/auth/signup", json=body).status_code == 409


def test_login_invalid(client):
    client.post(
        "/api/auth/signup",
        json={"email": "c@d.com", "password": "password123", "nickname": "bb"},
    )
    r = client.post(
        "/api/auth/login", json={"email": "c@d.com", "password": "wrong"}
    )
    assert r.status_code == 401


def test_me(client, auth_token):
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "test@example.com"
    assert data["nickname"] == "철수"
    assert data["athlete_code"].startswith("LR-")
    assert data["team_code"] == "AB12CD"


def test_me_unauthorized(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 403  # HTTPBearer returns 403 without credentials


def test_daily_record_create_and_list(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = client.post(
        "/api/records",
        headers=headers,
        json={
            "date": "2026-04-14",
            "intensity": 7,
            "injury_tags": ["무릎", "어깨"],
            "injury_note": "왼쪽 무릎 통증",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["intensity"] == 7
    assert data["injury_tags"] == ["무릎", "어깨"]

    r = client.get("/api/records", headers=headers)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_daily_record_upsert(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    body1 = {"date": "2026-04-14", "intensity": 5, "injury_tags": [], "injury_note": ""}
    body2 = {"date": "2026-04-14", "intensity": 8, "injury_tags": [], "injury_note": ""}
    client.post("/api/records", headers=headers, json=body1)
    client.post("/api/records", headers=headers, json=body2)
    r = client.get("/api/records", headers=headers)
    assert r.status_code == 200
    records = r.json()
    assert len(records) == 1  # Same date → upserted
    assert records[0]["intensity"] == 8


def test_daily_record_intensity_validation(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = client.post(
        "/api/records",
        headers=headers,
        json={"date": "2026-04-14", "intensity": 11, "injury_tags": [], "injury_note": ""},
    )
    assert r.status_code == 422


def test_watch_metric_post_and_latest(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = client.post(
        "/api/watch/metrics",
        headers=headers,
        json={"heart_rate": 75, "spo2": 98, "temperature": 36.5},
    )
    assert r.status_code == 201

    r = client.get("/api/watch/latest", headers=headers)
    assert r.status_code == 200
    assert r.json()["heart_rate"] == 75


def test_watch_latest_empty(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = client.get("/api/watch/latest", headers=headers)
    assert r.status_code == 404


def test_team_join(client, auth_token):
    headers = {"Authorization": f"Bearer {auth_token}"}
    r = client.post("/api/team/join", headers=headers, json={"team_code": "xyz789"})
    assert r.status_code == 200
    assert r.json()["code"] == "XYZ789"

    r = client.get("/api/team/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["code"] == "XYZ789"
