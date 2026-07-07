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
