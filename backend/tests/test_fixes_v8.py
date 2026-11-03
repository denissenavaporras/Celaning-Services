# Retest of iteration-7 fixes: invoice gating, booking/service validation, German errors, X-Device-Id on customer list
import os
import uuid
from datetime import date, timedelta
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@limpia.com"
ADMIN_PASSWORD = "Kwtklaz52URXLj8zHaIhaQ"
DEV = f"TEST_dev8_{uuid.uuid4().hex[:8]}"
FUTURE = (date.today() + timedelta(days=5)).isoformat()


@pytest.fixture(scope="session")
def s():
    x = requests.Session()
    x.headers.update({"Content-Type": "application/json"})
    return x


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def services(s):
    return s.get(f"{API}/services").json()


def svc(services, name):
    return next(x for x in services if x["name"] == name)


def payload(service_id, **kw):
    p = {
        "device_id": DEV, "customer_name": "TEST Kunde", "customer_phone": "+43 664 1234567",
        "service_id": service_id, "address": "Teststraße 1, 4600 Wels",
        "scheduled_date": FUTURE, "scheduled_time": "10:00", "consent_accepted": True,
    }
    p.update(kw)
    return p


# ---- Fix 3: booking validation ----
@pytest.mark.parametrize("override,msg_part", [
    ({"scheduled_date": "2020-01-01"}, "Vergangenheit"),
    ({"scheduled_time": "99:99"}, "Ungültiges Datum"),
    ({"scheduled_date": "2026-13-45"}, "Ungültiges Datum"),
    ({"customer_name": "  "}, "Namen"),
    ({"customer_phone": ""}, "Telefon"),
    ({"address": ""}, "Adresse"),
    ({"device_id": "abc"}, "Geräte-ID"),
])
def test_booking_validation(s, services, override, msg_part):
    r = s.post(f"{API}/bookings", json=payload(svc(services, "Unterhaltsreinigung")["id"], **override))
    assert r.status_code == 400, r.text
    assert msg_part in r.json()["detail"]


def test_booking_unknown_service_german(s):
    r = s.post(f"{API}/bookings", json=payload("nope"))
    assert r.status_code == 404 and r.json()["detail"] == "Service nicht gefunden"


def test_booking_no_consent_german(s, services):
    r = s.post(f"{API}/bookings", json=payload(svc(services, "Unterhaltsreinigung")["id"], consent_accepted=False))
    assert r.status_code == 400 and "Einwilligung" in r.json()["detail"]


# ---- Fix 4: German payment errors + Fix 2 invoice for paid hourly ----
def test_hourly_flow_decimal_and_invoice(s, services):
    sid = svc(services, "Unterhaltsreinigung")["id"]
    r = s.post(f"{API}/bookings", json=payload(sid, hours=3, materials_by_us=True, discount_code="WILLKOMMEN10"))
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["final_price"] == 76.5  # (25*3+10)*0.9
    h = {"X-Device-Id": DEV}
    # invoice before payment -> 400 German
    r = s.get(f"{API}/bookings/{b['id']}/invoice", headers=h)
    assert r.status_code == 400 and "Rechnung" in r.json()["detail"]
    card = {"card_number": "4242424242424242", "card_holder": "TEST", "exp": "12/28", "cvc": "123"}
    bad = [
        ({**card, "card_number": "4000000000000002"}, 402, "Karte abgelehnt. Bitte andere Karte versuchen."),
        ({**card, "card_number": "1234"}, 400, "Ungültige Kartennummer"),
        ({**card, "cvc": "1"}, 400, "Ungültiger CVC"),
        ({**card, "card_holder": " "}, 400, "Karteninhaber erforderlich"),
    ]
    for body, code, msg in bad:
        r = s.post(f"{API}/bookings/{b['id']}/pay", json=body, headers=h)
        assert r.status_code == code and r.json()["detail"] == msg, r.text
    r = s.post(f"{API}/bookings/{b['id']}/pay", json=card, headers={"X-Device-Id": "other-device-123"})
    assert r.status_code == 403 and r.json()["detail"] == "Zugriff verweigert"
    r = s.post(f"{API}/bookings/{b['id']}/pay", json=card, headers=h)
    assert r.status_code == 200 and r.json()["status"] == "paid"
    r = s.post(f"{API}/bookings/{b['id']}/pay", json=card, headers=h)
    assert r.status_code == 400 and "bereits bezahlt" in r.json()["detail"]
    r = s.get(f"{API}/bookings/{b['id']}/invoice", headers=h)
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


def test_confirmed_quote_no_invoice(s, services, token):
    sid = svc(services, "Gartenpflege")["id"]
    r = s.post(f"{API}/bookings", json=payload(sid))
    assert r.status_code == 200
    b = r.json()
    assert b["status"] == "quote_requested" and b["final_price"] == 0
    h = {"X-Device-Id": DEV}
    r = s.post(f"{API}/bookings/{b['id']}/pay", json={"card_number": "4242424242424242", "card_holder": "T", "exp": "12/28", "cvc": "123"}, headers=h)
    assert r.status_code == 400 and "nicht zahlbar" in r.json()["detail"]
    r = s.patch(f"{API}/admin/bookings/{b['id']}/status", json={"status": "confirmed"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200 and r.json()["status"] == "confirmed"
    r = s.get(f"{API}/bookings/{b['id']}/invoice", headers=h)
    assert r.status_code == 400, r.text
    assert r.json()["detail"] == "Rechnung erst nach Zahlung verfügbar"
    # invoice_number must not be assigned
    r = s.get(f"{API}/bookings/{b['id']}", headers=h)
    assert r.json().get("invoice_number") in (None, "")


def test_admin_set_paid_without_payment_no_invoice(s, services, token):
    sid = svc(services, "Unterhaltsreinigung")["id"]
    b = s.post(f"{API}/bookings", json=payload(sid)).json()
    s.patch(f"{API}/admin/bookings/{b['id']}/status", json={"status": "paid"}, headers={"Authorization": f"Bearer {token}"})
    r = s.get(f"{API}/bookings/{b['id']}/invoice", headers={"X-Device-Id": DEV})
    assert r.status_code == 400


# ---- Change: X-Device-Id required on customer list ----
def test_customer_list_requires_header(s):
    r = s.get(f"{API}/bookings/customer/{DEV}")
    assert r.status_code == 403 and r.json()["detail"] == "Zugriff verweigert"
    r = s.get(f"{API}/bookings/customer/{DEV}", headers={"X-Device-Id": "someone-else-1234"})
    assert r.status_code == 403
    r = s.get(f"{API}/bookings/customer/{DEV}", headers={"X-Device-Id": DEV})
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) >= 3 and all(x["device_id"] == DEV for x in lst) and "_id" not in lst[0]


# ---- Fix 3: admin service validation ----
@pytest.mark.parametrize("override,msg", [
    ({"price": -5}, "Preis darf nicht negativ sein"),
    ({"pricing": "weird"}, "Ungültiges Preismodell"),
    ({"category": "Foo"}, "Ungültige Kategorie"),
    ({"min_hours": 13}, "Mindeststunden müssen zwischen 0 und 12 liegen"),
])
def test_admin_service_create_validation(s, token, override, msg):
    body = {"name": "TEST_svc", "description": "d", "price": 20, "category": "Reinigung", "pricing": "hourly", "min_hours": 2}
    body.update(override)
    r = s.post(f"{API}/admin/services", json=body, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 400 and r.json()["detail"] == msg, r.text


def test_admin_service_patch_validation_and_crud(s, token):
    H = {"Authorization": f"Bearer {token}"}
    r = s.post(f"{API}/admin/services", json={"name": "TEST_svc_ok", "description": "d", "price": 20, "category": "Garten", "pricing": "hourly", "min_hours": 2}, headers=H)
    assert r.status_code == 200
    sid = r.json()["id"]
    try:
        for body in ({"price": -1}, {"pricing": "x"}, {"category": "Y"}, {"min_hours": 20}):
            r = s.patch(f"{API}/admin/services/{sid}", json=body, headers=H)
            assert r.status_code == 400, body
        r = s.patch(f"{API}/admin/services/{sid}", json={"price": 22.5}, headers=H)
        assert r.status_code == 200 and r.json()["price"] == 22.5
    finally:
        assert s.delete(f"{API}/admin/services/{sid}", headers=H).status_code == 200
    r = s.patch(f"{API}/admin/services/{sid}", json={"price": 1}, headers=H)
    assert r.status_code == 404 and r.json()["detail"] == "Service nicht gefunden"


# ---- Fix 4: German auth/admin errors ----
def test_german_admin_errors(s, token):
    assert s.get(f"{API}/admin/bookings").json()["detail"] == "Nicht autorisiert"
    assert s.get(f"{API}/admin/bookings", headers={"Authorization": "Bearer xxx"}).json()["detail"] == "Ungültiges Token"
    r = s.patch(f"{API}/admin/bookings/x/status", json={"status": "bad"}, headers={"Authorization": f"Bearer {token}"})
    assert r.json()["detail"] == "Ungültiger Status"
    r = s.patch(f"{API}/admin/bookings/x/status", json={"status": "paid"}, headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404 and r.json()["detail"] == "Termin nicht gefunden"
    r = s.post(f"{API}/discount/validate", json={"code": "XXX", "price": 50})
    assert r.json()["detail"] == "Ungültiger Rabattcode"


def test_settings_fee_is_10(s):
    assert s.get(f"{API}/settings").json()["materials_fee"] == 10.0
