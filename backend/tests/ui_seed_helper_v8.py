# Helper (not a pytest): confirm a quote via admin API and create a pending hourly booking for UI checks
import os, sys, requests
from datetime import date, timedelta
API = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"
dev, quote_id = sys.argv[1], sys.argv[2]
tok = requests.post(f"{API}/admin/login", json={"email": "admin@limpia.com", "password": "Kwtklaz52URXLj8zHaIhaQ"}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}
r = requests.patch(f"{API}/admin/bookings/{quote_id}/status", json={"status": "confirmed"}, headers=H)
print("confirm", r.status_code, r.json().get("status"))
svcs = requests.get(f"{API}/services").json()
sid = next(s["id"] for s in svcs if s["name"] == "Grundreinigung")
b = requests.post(f"{API}/bookings", json={"device_id": dev, "customer_name": "TEST UI Kunde", "customer_phone": "+43 664 7654321",
    "service_id": sid, "address": "Teststraße 5, 4600 Wels", "scheduled_date": (date.today() + timedelta(days=2)).isoformat(),
    "scheduled_time": "09:00", "consent_accepted": True, "hours": 3}).json()
print("pending", b["id"], b["final_price"])
r = requests.get(f"{API}/bookings/{quote_id}/invoice", headers={"X-Device-Id": dev})
print("quote invoice", r.status_code, r.text[:80])
st = requests.get(f"{API}/admin/stats", headers=H).json()
print("stats", st)
