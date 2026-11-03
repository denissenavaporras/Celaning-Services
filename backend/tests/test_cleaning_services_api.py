"""Regression tests: Cleaning Services API (auth, contact, admin contacts, chat SSE)"""
import os
import json
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@cleaning-services.at", "password": "Admin2026!"}


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def H(token):
    return {"Authorization": f"Bearer {token}"}


# Health
def test_root(s):
    r = s.get(f"{BASE_URL}/api/")
    assert r.status_code == 200 and "Cleaning" in r.json()["message"]


# Auth
class TestAuth:
    def test_login_ok(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["token"], str) and d["user"]["role"] == "admin"
        assert d["user"]["email"] == ADMIN["email"]

    def test_login_uppercase_email(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN["email"].upper(), "password": ADMIN["password"]})
        assert r.status_code == 200

    def test_login_wrong_pw(self, s):
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "TEST_nobody@example.com", "password": "x"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_me(self, s, H):
        r = s.get(f"{BASE_URL}/api/auth/me", headers=H)
        assert r.status_code == 200 and r.json()["email"] == ADMIN["email"]

    def test_me_invalid_token(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer abc"})
        assert r.status_code == 401

    def test_bruteforce_lockout(self, s):
        email = f"test_lock_{uuid.uuid4().hex[:6]}@example.com"
        codes = [s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "bad"}).status_code
                 for _ in range(6)]
        assert codes[:5] == [401] * 5
        assert codes[5] == 429


# Admin endpoints require auth
@pytest.mark.parametrize("method,path", [
    ("get", "/api/admin/contacts"),
    ("patch", "/api/admin/contacts/000000000000000000000000"),
    ("delete", "/api/admin/contacts/000000000000000000000000"),
    ("get", "/api/auth/me"),
])
def test_admin_401(s, method, path):
    r = getattr(s, method)(f"{BASE_URL}{path}", json={"status": "neu"})
    assert r.status_code == 401


# Contact validation
class TestContactValidation:
    def test_missing_fields(self, s):
        r = s.post(f"{BASE_URL}/api/contact", json={"name": "TEST_x"})
        assert r.status_code == 422

    def test_bad_email(self, s):
        r = s.post(f"{BASE_URL}/api/contact", json={"name": "TEST_x", "phone": "0664123", "email": "nope",
                                                     "service": "Dach"})
        assert r.status_code == 422

    def test_bad_service(self, s):
        r = s.post(f"{BASE_URL}/api/contact", json={"name": "TEST_x", "phone": "0664123",
                                                     "email": "delivered@resend.dev", "service": "Auto"})
        assert r.status_code == 422


# Contact create -> admin list -> patch -> delete
def test_contact_full_flow(s, H):
    payload = {"name": "TEST_Backend", "phone": "+43 664 1234567", "email": "delivered@resend.dev",
               "service": "Winterdienst", "message": "Test <b>html</b> escape"}
    r = s.post(f"{BASE_URL}/api/contact", json=payload, timeout=60)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True and isinstance(d["id"], str)
    assert d["email_sent"] is True, "Email not sent via Resend"
    cid = d["id"]

    lst = s.get(f"{BASE_URL}/api/admin/contacts", headers=H).json()
    found = [c for c in lst if c["id"] == cid]
    assert found and found[0]["status"] == "neu" and found[0]["service"] == "Winterdienst"
    assert found[0]["email_sent"] is True
    assert "_id" not in found[0]

    r = s.patch(f"{BASE_URL}/api/admin/contacts/{cid}", json={"status": "in_bearbeitung"}, headers=H)
    assert r.status_code == 200 and r.json()["status"] == "in_bearbeitung"
    r = s.patch(f"{BASE_URL}/api/admin/contacts/{cid}", json={"status": "foo"}, headers=H)
    assert r.status_code == 422
    lst = s.get(f"{BASE_URL}/api/admin/contacts", headers=H).json()
    assert [c for c in lst if c["id"] == cid][0]["status"] == "in_bearbeitung"

    assert s.delete(f"{BASE_URL}/api/admin/contacts/{cid}", headers=H).status_code == 200
    assert s.delete(f"{BASE_URL}/api/admin/contacts/{cid}", headers=H).status_code == 404
    lst = s.get(f"{BASE_URL}/api/admin/contacts", headers=H).json()
    assert not [c for c in lst if c["id"] == cid]


def test_patch_invalid_id(s, H):
    r = s.patch(f"{BASE_URL}/api/admin/contacts/invalid", json={"status": "neu"}, headers=H)
    assert r.status_code == 404


# Chat SSE
def _chat(s, sid, msg):
    r = s.post(f"{BASE_URL}/api/chat", json={"session_id": sid, "message": msg}, stream=True, timeout=120)
    assert r.status_code == 200
    assert "text/event-stream" in r.headers.get("content-type", "")
    text, done, err = "", False, None
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        d = line[6:]
        if d == "[DONE]":
            done = True
            break
        j = json.loads(d)
        text += j.get("delta", "")
        err = j.get("error", err)
    return text, done, err


def test_chat_winterdienst_price(s):
    sid = f"TEST_{uuid.uuid4().hex[:10]}"
    text, done, err = _chat(s, sid, "Wie teuer ist der Winterdienst?")
    assert err is None, err
    assert done
    assert "40" in text, text
    # follow-up uses history
    text2, done2, err2 = _chat(s, sid, "Und was kostet eine Tiefenreinigung einer Wohnung?")
    assert err2 is None and done2
    assert "250" in text2, text2


def test_chat_validation(s):
    r = s.post(f"{BASE_URL}/api/chat", json={"session_id": "ab", "message": ""})
    assert r.status_code == 422
