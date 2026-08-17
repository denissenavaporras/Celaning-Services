"""Backend API tests for Cleaning Service Wels — Iteration 6 (Security fixes)."""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get(
    "EXPO_BACKEND_URL",
    os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://cleanroute-app-2.preview.emergentagent.com"),
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@limpia.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Kwtklaz52URXLj8zHaIhaQ")
OLD_ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- Services (public) ----------
class TestServices:
    def test_root_health(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_list_services_wels_packs(self, session):
        r = session.get(f"{API}/services")
        assert r.status_code == 200
        data = r.json()
        names = {s["name"] for s in data}
        expected = {"Basis-Paket", "Familien-Paket", "Premium-Paket", "VIP-Monatspaket"}
        assert expected.issubset(names)
        prices = {s["name"]: s["price"] for s in data}
        assert prices["Basis-Paket"] == 66.0
        assert prices["Premium-Paket"] == 120.0


# ---------- Bookings + Payment (SEC-002: X-Device-Id required) ----------
class TestBookingsAndPayment:
    device_id = f"TEST_device_{uuid.uuid4().hex[:8]}"
    created_ids = []

    @pytest.fixture(scope="class")
    def service_id(self, session):
        r = session.get(f"{API}/services")
        return r.json()[0]["id"]

    def _payload(self, service_id, name="TEST User"):
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        return {
            "device_id": self.device_id,
            "customer_name": name,
            "customer_phone": "+43 660 1234567",
            "service_id": service_id,
            "address": "Wels, Test Str 1",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "consent_accepted": True,
        }

    def test_create_booking_requires_consent(self, session, service_id):
        payload = self._payload(service_id)
        payload["consent_accepted"] = False
        r = session.post(f"{API}/bookings", json=payload)
        assert r.status_code == 400
        assert "Datenschutz-Einwilligung ist erforderlich" in r.json().get("detail", "")

    def test_create_booking_ok(self, session, service_id):
        r = session.post(f"{API}/bookings", json=self._payload(service_id))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending_payment"
        assert d["consent_accepted"] is True
        TestBookingsAndPayment.created_ids.append(d["id"])

    def test_create_booking_with_xss_payload_stored_raw(self, session, service_id):
        """SEC-003 sanity: <script> in customer_name should NOT cause booking failure.
        Raw stored in DB; escape happens only in the email HTML (source verified)."""
        payload = self._payload(service_id, name="<script>alert(1)</script>")
        r = session.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200, r.text
        assert r.json()["customer_name"] == "<script>alert(1)</script>"
        TestBookingsAndPayment.created_ids.append(r.json()["id"])

    # ---- SEC-002 ----
    def test_get_booking_without_device_id_forbidden(self, session):
        bid = TestBookingsAndPayment.created_ids[0]
        r = session.get(f"{API}/bookings/{bid}")
        assert r.status_code == 403, r.text
        assert "Zugriff verweigert" in r.json().get("detail", "")

    def test_get_booking_wrong_device_id_forbidden(self, session):
        bid = TestBookingsAndPayment.created_ids[0]
        r = session.get(f"{API}/bookings/{bid}", headers={"X-Device-Id": "wrong-device-id"})
        assert r.status_code == 403

    def test_get_booking_matching_device_id_ok(self, session):
        bid = TestBookingsAndPayment.created_ids[0]
        r = session.get(f"{API}/bookings/{bid}", headers={"X-Device-Id": self.device_id})
        assert r.status_code == 200
        assert r.json()["id"] == bid

    def test_get_booking_admin_bypass(self, session, admin_headers):
        bid = TestBookingsAndPayment.created_ids[0]
        r = session.get(f"{API}/bookings/{bid}", headers=admin_headers)
        assert r.status_code == 200

    def test_get_customer_bookings(self, session):
        r = session.get(f"{API}/bookings/customer/{self.device_id}")
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 1

    def test_pay_without_device_id_forbidden(self, session):
        bid = TestBookingsAndPayment.created_ids[0]
        pay = {"card_number": "4242 4242 4242 4242", "card_holder": "T", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{bid}/pay", json=pay)
        assert r.status_code == 403

    def test_pay_declined_card(self, session, service_id):
        r = session.post(f"{API}/bookings", json=self._payload(service_id))
        bid = r.json()["id"]
        TestBookingsAndPayment.created_ids.append(bid)
        pay = {"card_number": "4000 0000 0000 0002", "card_holder": "T", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{bid}/pay", json=pay, headers={"X-Device-Id": self.device_id})
        assert r.status_code == 402

    def test_pay_success_card(self, session):
        bid = TestBookingsAndPayment.created_ids[0]
        pay = {"card_number": "4242 4242 4242 4242", "card_holder": "T", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{bid}/pay", json=pay, headers={"X-Device-Id": self.device_id})
        assert r.status_code == 200
        assert r.json()["status"] == "paid"

    def test_pay_already_paid_400(self, session):
        bid = TestBookingsAndPayment.created_ids[0]
        pay = {"card_number": "4242 4242 4242 4242", "card_holder": "T", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{bid}/pay", json=pay, headers={"X-Device-Id": self.device_id})
        assert r.status_code == 400

    def test_get_booking_not_found(self, session):
        r = session.get(f"{API}/bookings/nonexistent-id", headers={"X-Device-Id": self.device_id})
        assert r.status_code == 404


# ---------- Admin auth (SEC-001) ----------
class TestAdminAuth:
    def test_login_success_new_password(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert d["token_type"] == "bearer"
        assert "access_token" in d

    def test_login_rejects_old_password(self, session):
        """SEC-001: old hardcoded admin123 must NOT work."""
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": OLD_ADMIN_PASSWORD})
        assert r.status_code == 401, r.text

    def test_admin_bookings_no_token(self, session):
        r = session.get(f"{API}/admin/bookings")
        assert r.status_code == 401

    def test_admin_bookings_with_token(self, session, admin_headers):
        r = session.get(f"{API}/admin/bookings", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_stats(self, session, admin_headers):
        r = session.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        for key in ("total_bookings", "today_bookings", "paid_bookings", "revenue"):
            assert key in r.json()


# ---------- Admin operations ----------
class TestAdminOperations:
    created_service_id = None

    def test_update_booking_status(self, session, admin_headers):
        r = session.get(f"{API}/admin/bookings", headers=admin_headers)
        paid = [b for b in r.json() if b["status"] == "paid"]
        assert paid, "No paid bookings"
        bid = paid[0]["id"]
        r = session.patch(f"{API}/admin/bookings/{bid}/status", json={"status": "confirmed"}, headers=admin_headers)
        assert r.status_code == 200
        # verify via admin GET (uses X-Device-Id or admin JWT)
        r = session.get(f"{API}/bookings/{bid}", headers=admin_headers)
        assert r.json()["status"] == "confirmed"

    def test_create_update_delete_service(self, session, admin_headers):
        payload = {"name": "TEST_Extra", "description": "TEST", "price": 49.99, "duration_minutes": 90, "active": True}
        r = session.post(f"{API}/admin/services", json=payload, headers=admin_headers)
        assert r.status_code == 200
        sid = r.json()["id"]
        r = session.patch(f"{API}/admin/services/{sid}", json={"price": 59.99}, headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["price"] == 59.99
        r = session.delete(f"{API}/admin/services/{sid}", headers=admin_headers)
        assert r.status_code == 200
        r = session.delete(f"{API}/admin/services/{sid}", headers=admin_headers)
        assert r.status_code == 404


# ---------- Discount codes ----------
class TestDiscountValidation:
    def test_willkommen10(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "WILLKOMMEN10", "price": 120})
        assert r.status_code == 200
        d = r.json()
        assert d["discount_amount"] == 12 and d["final_price"] == 108

    def test_freundin2h(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "FREUNDIN2H", "price": 120})
        assert r.status_code == 200
        assert r.json()["final_price"] == 70

    def test_monat5(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "MONAT5", "price": 100})
        assert r.status_code == 200
        assert r.json()["final_price"] == 95

    def test_kuehl40(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "KUEHL40", "price": 120})
        assert r.status_code == 200
        assert r.json()["final_price"] == 80

    def test_invalid_code(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "INVALID", "price": 120})
        assert r.status_code == 400

    def test_empty_code(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "", "price": 120})
        assert r.status_code == 400


class TestBookingWithDiscount:
    device_id = f"TEST_disc_{uuid.uuid4().hex[:8]}"

    @pytest.fixture(scope="class")
    def premium_service(self, session):
        r = session.get(f"{API}/services")
        return next((s for s in r.json() if s["name"] == "Premium-Paket"), r.json()[0])

    def _payload(self, service_id, code=None):
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        p = {
            "device_id": self.device_id,
            "customer_name": "TEST Discount",
            "customer_phone": "+43 660 9999999",
            "service_id": service_id,
            "address": "Wels, Test 5",
            "scheduled_date": tomorrow,
            "scheduled_time": "11:00",
            "consent_accepted": True,
        }
        if code is not None:
            p["discount_code"] = code
        return p

    def test_booking_with_willkommen10(self, session, premium_service):
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"], "WILLKOMMEN10"))
        assert r.status_code == 200
        d = r.json()
        assert d["discount_amount"] == 12.0 and d["final_price"] == 108.0

    def test_booking_with_invalid_discount(self, session, premium_service):
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"], "BOGUS"))
        assert r.status_code == 400


class TestRevenueUsesFinalPrice:
    def test_revenue_delta_equals_final_price(self, session, admin_headers):
        r = session.get(f"{API}/services")
        premium = next((s for s in r.json() if s["name"] == "Premium-Paket"), r.json()[0])
        did = f"TEST_rev_{uuid.uuid4().hex[:6]}"
        tomorrow = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {
            "device_id": did, "customer_name": "TEST Revenue", "customer_phone": "+43 660 0000000",
            "service_id": premium["id"], "address": "Wels, Rev 1",
            "scheduled_date": tomorrow, "scheduled_time": "12:00",
            "consent_accepted": True, "discount_code": "WILLKOMMEN10",
        }
        r = session.post(f"{API}/bookings", json=payload)
        bid = r.json()["id"]
        pre = session.get(f"{API}/admin/stats", headers=admin_headers).json()["revenue"]
        pay = {"card_number": "4242 4242 4242 4242", "card_holder": "TEST", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{bid}/pay", json=pay, headers={"X-Device-Id": did})
        assert r.status_code == 200
        post = session.get(f"{API}/admin/stats", headers=admin_headers).json()["revenue"]
        assert abs((post - pre) - 108.0) < 0.01


# ---------- P3 Rate limit — RUN LAST (locks the IP for 60s) ----------
class TestZZRateLimit:
    """Send 6 bad-password logins in quick succession; the 6th must return 429."""

    def test_login_rate_limit_429(self, session):
        # Wait for previous 60s window to reset — otherwise prior successful logins consume the quota.
        time.sleep(61)
        results = []
        for i in range(6):
            r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrongpassX"})
            results.append(r.status_code)
        # First 5 should be 401, 6th should be 429
        assert results.count(429) >= 1, f"Expected at least one 429, got: {results}"
        # Find first 429 and assert German message
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        # After threshold, even correct password gets 429
        assert r.status_code == 429
        assert "Zu viele Anmeldeversuche" in r.json().get("detail", "")
