# Round 3: launch prices - contact offer field + chatbot launch-price answers
import os
import json
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
OFFER = "Tiefenreinigung 70–90 m² – 150 € (Einführungspreis)"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def H(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@cleaning-services.at", "password": "Admin2026!"})
    if r.status_code != 200:
        pytest.skip("login failed")
    return {"Authorization": f"Bearer {r.json()['token']}"}


# offer > 200 chars rejected (no email sent)
def test_offer_too_long(s):
    r = s.post(f"{BASE_URL}/api/contact", json={"name": "TEST_x", "phone": "+43 664 1", "email": "delivered@resend.dev",
                                                 "service": "Wohnung", "offer": "x" * 201})
    assert r.status_code == 422


# contact with offer -> admin list returns offer -> delete
def test_contact_with_offer(s, H):
    r = s.post(f"{BASE_URL}/api/contact", json={"name": "TEST_Offer", "phone": "+43 664 1234567",
                                                 "email": "delivered@resend.dev", "service": "Wohnung",
                                                 "message": "launch test", "offer": OFFER}, timeout=60)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    try:
        lst = s.get(f"{BASE_URL}/api/admin/contacts", headers=H).json()
        f = [c for c in lst if c["id"] == cid]
        assert f and f[0]["offer"] == OFFER and f[0]["service"] == "Wohnung"
        assert "_id" not in f[0]
    finally:
        assert s.delete(f"{BASE_URL}/api/admin/contacts/{cid}", headers=H).status_code == 200


def _chat(s, sid, msg):
    r = s.post(f"{BASE_URL}/api/chat", json={"session_id": sid, "message": msg}, stream=True, timeout=120)
    assert r.status_code == 200
    text, err = "", None
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        d = line[6:]
        if d == "[DONE]":
            break
        j = json.loads(d)
        text += j.get("delta", "")
        err = j.get("error", err)
    return text, err


@pytest.mark.parametrize("q,price", [("Was kostet eine Tiefenreinigung für 80 m²?", "150"),
                                     ("Wie teuer ist der Winterdienst?", "40")])
def test_chat_launch_price(s, q, price):
    text, err = _chat(s, f"TEST_{uuid.uuid4().hex[:10]}", q)
    print("ANSWER:", text)
    assert err is None
    assert price in text
    assert "Einführung" in text, text
    assert "15.11" in text and "15.12" in text, text
    assert "Angebot" in text or "Jetzt buchen" in text, text
