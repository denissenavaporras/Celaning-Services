"""Backend API tests for Cleaning Service Wels."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("EXPO_BACKEND_URL", os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://cleanroute-app-2.preview.emergentagent.com")).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@limpia.com"
ADMIN_PASSWORD = "admin123"


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
        assert isinstance(data, list)
        names = {s["name"] for s in data}
        expected = {"Basis-Paket", "Familien-Paket", "Premium-Paket", "VIP-Monatspaket"}
        assert expected.issubset(names), f"Missing packs. Got: {names}"
        prices = {s["name"]: s["price"] for s in data}
        assert prices["Basis-Paket"] == 66.0
        assert prices["Familien-Paket"] == 112.5
        assert prices["Premium-Paket"] == 120.0
        assert prices["VIP-Monatspaket"] == 2000.0
        # Ensure German descriptions (no Spanish)
        for s in data:
            desc = s.get("description", "")
            spanish_markers = ["Limpieza", "Cuidado", "niños", "Ideal para", "hijos"]
            for m in spanish_markers:
                assert m not in desc, f"Spanish marker '{m}' found in {s['name']} description"


# ---------- Bookings + Payment ----------
class TestBookingsAndPayment:
    device_id = f"TEST_device_{uuid.uuid4().hex[:8]}"
    created_ids = []

    @pytest.fixture(scope="class")
    def service_id(self, session):
        r = session.get(f"{API}/services")
        return r.json()[0]["id"]

    def _make_booking_payload(self, service_id):
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        return {
            "device_id": self.device_id,
            "customer_name": "TEST User",
            "customer_phone": "+43 660 1234567",
            "service_id": service_id,
            "address": "Wels, Austria, Test Str 1",
            "scheduled_date": tomorrow,
            "scheduled_time": "10:00",
            "notes": "TEST booking",
            "consent_accepted": True,
        }

    def test_create_booking_requires_consent(self, session, service_id):
        # Iteration 4: consent_accepted=False should return 400
        payload = self._make_booking_payload(service_id)
        payload["consent_accepted"] = False
        r = session.post(f"{API}/bookings", json=payload)
        assert r.status_code == 400, r.text
        assert "Datenschutz-Einwilligung ist erforderlich" in r.json().get("detail", "")

    def test_create_booking_pending_payment(self, session, service_id):
        payload = self._make_booking_payload(service_id)
        r = session.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pending_payment"
        assert data["service_id"] == service_id
        assert data["customer_name"] == "TEST User"
        assert data["consent_accepted"] is True
        assert data.get("consent_at") is not None
        assert "id" in data
        TestBookingsAndPayment.created_ids.append(data["id"])

    def test_get_booking_by_id(self, session):
        booking_id = TestBookingsAndPayment.created_ids[0]
        r = session.get(f"{API}/bookings/{booking_id}")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == booking_id
        assert body["consent_accepted"] is True

    def test_get_customer_bookings(self, session):
        r = session.get(f"{API}/bookings/customer/{self.device_id}")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        assert any(b["id"] == TestBookingsAndPayment.created_ids[0] for b in data)

    def test_pay_declined_card(self, session, service_id):
        # create a new booking to test decline
        payload = self._make_booking_payload(service_id)
        r = session.post(f"{API}/bookings", json=payload)
        booking_id = r.json()["id"]
        TestBookingsAndPayment.created_ids.append(booking_id)

        pay = {
            "card_number": "4000 0000 0000 0002",
            "card_holder": "TEST User",
            "exp": "12/28",
            "cvc": "123",
        }
        r = session.post(f"{API}/bookings/{booking_id}/pay", json=pay)
        assert r.status_code == 402, f"Expected 402, got {r.status_code}: {r.text}"

    def test_pay_success_card(self, session):
        booking_id = TestBookingsAndPayment.created_ids[0]
        pay = {
            "card_number": "4242 4242 4242 4242",
            "card_holder": "TEST User",
            "exp": "12/28",
            "cvc": "123",
        }
        r = session.post(f"{API}/bookings/{booking_id}/pay", json=pay)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "paid"
        assert data["payment_ref"].startswith("MOCK-")

    def test_pay_already_paid_returns_400(self, session):
        booking_id = TestBookingsAndPayment.created_ids[0]
        pay = {"card_number": "4242 4242 4242 4242", "card_holder": "T", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{booking_id}/pay", json=pay)
        assert r.status_code == 400

    def test_get_booking_not_found(self, session):
        r = session.get(f"{API}/bookings/nonexistent-id")
        assert r.status_code == 404


# ---------- Admin auth ----------
class TestAdminAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["token_type"] == "bearer"
        assert "access_token" in data

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_admin_bookings_no_token(self, session):
        r = session.get(f"{API}/admin/bookings")
        assert r.status_code == 401

    def test_admin_bookings_with_token(self, session, admin_headers):
        r = session.get(f"{API}/admin/bookings", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_stats(self, session, admin_headers):
        r = session.get(f"{API}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        for key in ("total_bookings", "today_bookings", "paid_bookings", "revenue"):
            assert key in data


# ---------- Admin status updates & services CRUD ----------
class TestAdminOperations:
    created_service_id = None

    def test_update_booking_status(self, session, admin_headers):
        # Use an existing booking - fetch first one
        r = session.get(f"{API}/admin/bookings", headers=admin_headers)
        bookings = r.json()
        # Prefer one in paid status
        paid_bookings = [b for b in bookings if b["status"] == "paid"]
        assert paid_bookings, "No paid bookings to update"
        booking_id = paid_bookings[0]["id"]

        r = session.patch(
            f"{API}/admin/bookings/{booking_id}/status",
            json={"status": "confirmed"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

        # verify persistence via GET
        r = session.get(f"{API}/bookings/{booking_id}")
        assert r.json()["status"] == "confirmed"

    def test_update_status_invalid(self, session, admin_headers):
        r = session.get(f"{API}/admin/bookings", headers=admin_headers)
        booking_id = r.json()[0]["id"]
        r = session.patch(
            f"{API}/admin/bookings/{booking_id}/status",
            json={"status": "bogus"},
            headers=admin_headers,
        )
        assert r.status_code == 400

    def test_create_service(self, session, admin_headers):
        payload = {
            "name": "TEST_Extra Pack",
            "description": "TEST temporary service",
            "price": 49.99,
            "duration_minutes": 90,
            "active": True,
        }
        r = session.post(f"{API}/admin/services", json=payload, headers=admin_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Extra Pack"
        assert data["price"] == 49.99
        TestAdminOperations.created_service_id = data["id"]

    def test_update_service(self, session, admin_headers):
        sid = TestAdminOperations.created_service_id
        assert sid
        r = session.patch(
            f"{API}/admin/services/{sid}",
            json={"price": 59.99, "name": "TEST_Updated Pack"},
            headers=admin_headers,
        )
        assert r.status_code == 200
        data = r.json()
        assert data["price"] == 59.99
        assert data["name"] == "TEST_Updated Pack"

    def test_delete_service(self, session, admin_headers):
        sid = TestAdminOperations.created_service_id
        r = session.delete(f"{API}/admin/services/{sid}", headers=admin_headers)
        assert r.status_code == 200
        # verify deleted
        r = session.delete(f"{API}/admin/services/{sid}", headers=admin_headers)
        assert r.status_code == 404


# ---------- Iteration 5: Discount codes + booking discount + revenue uses final_price ----------
class TestDiscountValidation:
    """POST /api/discount/validate — 4 valid codes + invalid + empty."""

    def test_willkommen10_percent(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "WILLKOMMEN10", "price": 120})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"] == "WILLKOMMEN10"
        assert d["type"] == "percent"
        assert d["value"] == 10
        assert d["discount_amount"] == 12
        assert d["final_price"] == 108

    def test_freundin2h_fixed(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "FREUNDIN2H", "price": 120})
        assert r.status_code == 200
        d = r.json()
        assert d["type"] == "fixed"
        assert d["discount_amount"] == 50
        assert d["final_price"] == 70

    def test_monat5_percent(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "MONAT5", "price": 100})
        assert r.status_code == 200
        d = r.json()
        assert d["discount_amount"] == 5
        assert d["final_price"] == 95

    def test_kuehl40_fixed(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "KUEHL40", "price": 120})
        assert r.status_code == 200
        d = r.json()
        assert d["discount_amount"] == 40
        assert d["final_price"] == 80

    def test_invalid_code(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "INVALID", "price": 120})
        assert r.status_code == 400
        assert "Ungültiger Rabattcode" in r.json().get("detail", "")

    def test_empty_code(self, session):
        r = session.post(f"{API}/discount/validate", json={"code": "", "price": 120})
        assert r.status_code == 400
        assert "Kein Code angegeben" in r.json().get("detail", "")

    def test_lowercase_code_auto_uppercased(self, session):
        # apply_discount normalizes to uppercase
        r = session.post(f"{API}/discount/validate", json={"code": "willkommen10", "price": 120})
        assert r.status_code == 200
        assert r.json()["code"] == "WILLKOMMEN10"


class TestBookingWithDiscount:
    device_id = f"TEST_disc_{uuid.uuid4().hex[:8]}"
    created_ids = []

    @pytest.fixture(scope="class")
    def premium_service(self, session):
        r = session.get(f"{API}/services")
        # Premium-Paket 120€ — deterministic math
        for s in r.json():
            if s["name"] == "Premium-Paket":
                return s
        return r.json()[0]

    def _payload(self, service_id, discount_code=None):
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
        if discount_code is not None:
            p["discount_code"] = discount_code
        return p

    def test_booking_with_willkommen10(self, session, premium_service):
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"], "WILLKOMMEN10"))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["discount_code"] == "WILLKOMMEN10"
        assert d["service_price"] == 120.0
        assert d["discount_amount"] == 12.0
        assert d["final_price"] == 108.0
        TestBookingWithDiscount.created_ids.append(d["id"])

        # Verify persistence via GET
        r2 = session.get(f"{API}/bookings/{d['id']}")
        assert r2.status_code == 200
        got = r2.json()
        assert got["discount_code"] == "WILLKOMMEN10"
        assert got["final_price"] == 108.0

    def test_booking_with_invalid_discount_rejected(self, session, premium_service):
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"], "BOGUS"))
        assert r.status_code == 400
        assert "Ungültiger Rabattcode" in r.json().get("detail", "")

    def test_booking_without_discount_defaults(self, session, premium_service):
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"]))
        assert r.status_code == 200
        d = r.json()
        # discount_code None; discount_amount 0; final_price == service_price
        assert d.get("discount_code") in (None, "")
        assert d["discount_amount"] == 0
        assert d["final_price"] == d["service_price"]
        TestBookingWithDiscount.created_ids.append(d["id"])

    def test_booking_with_fixed_kuehl40(self, session, premium_service):
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"], "KUEHL40"))
        assert r.status_code == 200
        d = r.json()
        assert d["discount_code"] == "KUEHL40"
        assert d["discount_amount"] == 40.0
        assert d["final_price"] == 80.0
        TestBookingWithDiscount.created_ids.append(d["id"])

    def test_sendgrid_skip_no_exception(self, session, premium_service):
        """SENDGRID_API_KEY is unset — booking must still succeed (fire-and-forget skips silently)."""
        r = session.post(f"{API}/bookings", json=self._payload(premium_service["id"], "MONAT5"))
        assert r.status_code == 200
        assert r.json()["discount_code"] == "MONAT5"


class TestRevenueUsesFinalPrice:
    def test_stats_revenue_reflects_final_price(self, session, admin_headers):
        # Create booking with discount then pay it — revenue should include the discounted final_price
        r = session.get(f"{API}/services")
        premium = next((s for s in r.json() if s["name"] == "Premium-Paket"), r.json()[0])

        tomorrow = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {
            "device_id": f"TEST_rev_{uuid.uuid4().hex[:6]}",
            "customer_name": "TEST Revenue",
            "customer_phone": "+43 660 0000000",
            "service_id": premium["id"],
            "address": "Wels, Rev 1",
            "scheduled_date": tomorrow,
            "scheduled_time": "12:00",
            "consent_accepted": True,
            "discount_code": "WILLKOMMEN10",
        }
        r = session.post(f"{API}/bookings", json=payload)
        assert r.status_code == 200
        bid = r.json()["id"]
        assert r.json()["final_price"] == 108.0

        # snapshot revenue before payment
        pre = session.get(f"{API}/admin/stats", headers=admin_headers).json()["revenue"]

        pay = {"card_number": "4242 4242 4242 4242", "card_holder": "TEST Revenue", "exp": "12/28", "cvc": "123"}
        r = session.post(f"{API}/bookings/{bid}/pay", json=pay)
        assert r.status_code == 200
        assert r.json()["status"] == "paid"

        post = session.get(f"{API}/admin/stats", headers=admin_headers).json()["revenue"]
        # Revenue should have increased by exactly the final_price (108), not the service_price (120)
        delta = round(post - pre, 2)
        assert abs(delta - 108.0) < 0.01, f"Expected revenue delta 108.0 (final_price), got {delta}"

