# Regression tests for Cleaning Service Wels multi-service pivot (iteration 7)
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "admin@limpia.com"
ADMIN_PASSWORD = "Kwtklaz52URXLj8zHaIhaQ"
DEV = f"TEST_dev_{uuid.uuid4().hex[:8]}"


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
    r = s.get(f"{API}/services")
    assert r.status_code == 200
    return r.json()


def _hourly(services, name="Unterhaltsreinigung"):
    return next(x for x in services if x["name"] == name)


def _book(s, svc, **kw):
    body = dict(device_id=DEV, customer_name="TEST_Kunde", customer_phone="+436641234567",
                service_id=svc["id"], address="TEST Straße 1, 4600 Wels",
                scheduled_date=(__import__("datetime").date.today() + __import__("datetime").timedelta(days=7)).isoformat(), scheduled_time="10:00", consent_accepted=True)
    body.update(kw)
    return s.post(f"{API}/bookings", json=body)


# --- Services & settings ---
class TestCatalog:
    def test_services_six(self, services):
        assert len(services) == 6
        hourly = [x for x in services if x["pricing"] == "hourly"]
        quote = [x for x in services if x["pricing"] == "quote"]
        assert len(hourly) == 3 and all(x["category"] == "Reinigung" for x in hourly)
        assert len(quote) == 3
        assert {x["category"] for x in quote} == {"Garten", "Winterdienst", "Dach & PV"}
        assert all("_id" not in x for x in services)

    def test_settings_fee(self, s):
        r = s.get(f"{API}/settings")
        assert r.status_code == 200
        assert r.json()["materials_fee"] == 10.0


# --- Booking pricing ---
class TestBookingPricing:
    def test_hourly_with_materials_and_discount(self, s, services):
        svc = _hourly(services)
        r = _book(s, svc, hours=3, materials_by_us=True, discount_code="willkommen10")
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["hours"] == 3 and b["hourly_rate"] == svc["price"]
        assert b["materials_fee"] == 10.0
        expected = svc["price"] * 3 + 10
        assert b["service_price"] == expected
        assert b["discount_code"] == "WILLKOMMEN10"
        assert b["discount_amount"] == round(expected * 0.1, 2)
        assert b["final_price"] == round(expected * 0.9, 2)
        assert b["status"] == "pending_payment"
        pytest.booking_id = b["id"]

    def test_hourly_no_materials(self, s, services):
        svc = _hourly(services)
        r = _book(s, svc, hours=2, materials_by_us=False)
        assert r.status_code == 200
        assert r.json()["final_price"] == svc["price"] * 2
        assert r.json()["materials_fee"] == 0

    def test_hours_below_min(self, s, services):
        svc = _hourly(services, "Grundreinigung")  # min 3
        r = _book(s, svc, hours=2)
        assert r.status_code == 400

    def test_hours_above_max(self, s, services):
        r = _book(s, _hourly(services), hours=13)
        assert r.status_code == 400

    def test_invalid_discount(self, s, services):
        r = _book(s, _hourly(services), hours=2, discount_code="NOPE")
        assert r.status_code == 400

    def test_no_consent(self, s, services):
        r = _book(s, _hourly(services), hours=2, consent_accepted=False)
        assert r.status_code == 400

    def test_quote_service(self, s, services):
        svc = next(x for x in services if x["category"] == "Winterdienst")
        r = _book(s, svc, hours=5, materials_by_us=True, discount_code="WILLKOMMEN10")
        assert r.status_code == 200
        b = r.json()
        assert b["status"] == "quote_requested"
        assert b["final_price"] == 0 and b["materials_fee"] == 0 and b["hours"] is None
        pytest.quote_id = b["id"]


# --- Payment & invoice ---
class TestPayInvoice:
    def test_invoice_unpaid_400(self, s):
        r = s.get(f"{API}/bookings/{pytest.booking_id}/invoice", params={"device_id": DEV})
        assert r.status_code == 400

    def test_pay_wrong_device_403(self, s):
        r = s.post(f"{API}/bookings/{pytest.booking_id}/pay", headers={"X-Device-Id": "other"},
                   json={"card_number": "4242424242424242", "card_holder": "T", "exp": "12/28", "cvc": "123"})
        assert r.status_code == 403

    def test_pay_declined_402(self, s):
        r = s.post(f"{API}/bookings/{pytest.booking_id}/pay", headers={"X-Device-Id": DEV},
                   json={"card_number": "4000 0000 0000 0002", "card_holder": "T", "exp": "12/28", "cvc": "123"})
        assert r.status_code == 402

    def test_pay_ok(self, s):
        r = s.post(f"{API}/bookings/{pytest.booking_id}/pay", headers={"X-Device-Id": DEV},
                   json={"card_number": "4242 4242 4242 4242", "card_holder": "TEST Holder", "exp": "12/28", "cvc": "123"})
        assert r.status_code == 200
        assert r.json()["status"] == "paid" and r.json()["payment_ref"].startswith("MOCK-")

    def test_pay_quote_rejected(self, s):
        r = s.post(f"{API}/bookings/{pytest.quote_id}/pay", headers={"X-Device-Id": DEV},
                   json={"card_number": "4242424242424242", "card_holder": "T", "exp": "12/28", "cvc": "123"})
        assert r.status_code == 400

    def test_invoice_pdf_and_stable(self, s):
        r = s.get(f"{API}/bookings/{pytest.booking_id}/invoice", params={"device_id": DEV})
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        m = re.search(r"Rechnung-(RE-\d{4}-\d{4})\.pdf", r.headers["content-disposition"])
        assert m
        r2 = s.get(f"{API}/bookings/{pytest.booking_id}/invoice", headers={"X-Device-Id": DEV})
        assert m.group(1) in r2.headers["content-disposition"]
        g = s.get(f"{API}/bookings/{pytest.booking_id}", headers={"X-Device-Id": DEV}).json()
        assert g["invoice_number"] == m.group(1)

    def test_invoice_wrong_device_403(self, s):
        r = s.get(f"{API}/bookings/{pytest.booking_id}/invoice", params={"device_id": "other"})
        assert r.status_code == 403

    def test_customer_bookings(self, s):
        r = s.get(f"{API}/bookings/customer/{DEV}", headers={"X-Device-Id": DEV})
        assert r.status_code == 200 and len(r.json()) >= 3


# --- Profile ---
class TestProfile:
    def test_no_header_403(self, s):
        assert s.get(f"{API}/profile").status_code == 403
        assert s.put(f"{API}/profile", json={}).status_code == 403

    def test_put_get(self, s):
        body = {"name": " TEST Name ", "phone": "+43 1", "email": "t@x.at", "address": "Wels", "materials_by_us": True}
        r = s.put(f"{API}/profile", json=body, headers={"X-Device-Id": DEV})
        assert r.status_code == 200 and r.json()["name"] == "TEST Name"
        g = s.get(f"{API}/profile", headers={"X-Device-Id": DEV}).json()
        assert g["materials_by_us"] is True and g["address"] == "Wels" and "device_id" not in g

    def test_new_device_default(self, s):
        g = s.get(f"{API}/profile", headers={"X-Device-Id": "TEST_new_" + uuid.uuid4().hex}).json()
        assert g == {"name": "", "phone": "", "email": "", "address": "", "materials_by_us": False}


# --- Admin ---
class TestAdmin:
    def test_settings_requires_auth(self, s):
        assert s.put(f"{API}/admin/settings", json={"materials_fee": 12}).status_code == 401

    def test_settings_update_and_restore(self, s, token, services):
        h = {"Authorization": f"Bearer {token}"}
        try:
            r = s.put(f"{API}/admin/settings", json={"materials_fee": 15}, headers=h)
            assert r.status_code == 200
            assert s.get(f"{API}/settings").json()["materials_fee"] == 15
            b = _book(s, _hourly(services), hours=2, materials_by_us=True).json()
            assert b["materials_fee"] == 15
            assert s.put(f"{API}/admin/settings", json={"materials_fee": -1}, headers=h).status_code == 400
        finally:
            s.put(f"{API}/admin/settings", json={"materials_fee": 10}, headers=h)
        assert s.get(f"{API}/settings").json()["materials_fee"] == 10

    def test_service_crud(self, s, token):
        h = {"Authorization": f"Bearer {token}"}
        r = s.post(f"{API}/admin/services", headers=h, json={
            "name": "TEST_Svc", "description": "d", "price": 0, "category": "Garten", "pricing": "quote", "min_hours": 0})
        assert r.status_code == 200
        sid = r.json()["id"]
        assert r.json()["category"] == "Garten" and r.json()["pricing"] == "quote"
        p = s.patch(f"{API}/admin/services/{sid}", headers=h, json={"pricing": "hourly", "price": 33, "min_hours": 4, "category": "Reinigung"})
        assert p.status_code == 200 and p.json()["min_hours"] == 4 and p.json()["pricing"] == "hourly"
        lst = s.get(f"{API}/admin/services", headers=h).json()
        assert any(x["id"] == sid and x["price"] == 33 for x in lst)
        assert s.delete(f"{API}/admin/services/{sid}", headers=h).status_code == 200
        assert s.delete(f"{API}/admin/services/{sid}", headers=h).status_code == 404

    def test_patch_status_quote_requested(self, s, token):
        h = {"Authorization": f"Bearer {token}"}
        r = s.patch(f"{API}/admin/bookings/{pytest.quote_id}/status", headers=h, json={"status": "confirmed"})
        assert r.status_code == 200
        r = s.patch(f"{API}/admin/bookings/{pytest.quote_id}/status", headers=h, json={"status": "quote_requested"})
        assert r.status_code == 200 and r.json()["status"] == "quote_requested"
        assert s.patch(f"{API}/admin/bookings/{pytest.quote_id}/status", headers=h, json={"status": "bogus"}).status_code == 400

    def test_admin_bookings_lists_quote(self, s, token):
        h = {"Authorization": f"Bearer {token}"}
        r = s.get(f"{API}/admin/bookings", headers=h, params={"status": "quote_requested"})
        assert r.status_code == 200 and any(x["id"] == pytest.quote_id for x in r.json())
