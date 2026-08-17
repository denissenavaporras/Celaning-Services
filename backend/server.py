from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
import html
import time
from urllib.parse import quote as urlquote
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from pydantic import BaseModel, Field
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "").strip()
JWT_ALG = "HS256"
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set to a strong random value (>=32 chars).")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI(title="LimpiaHogar API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("limpiahogar")


# ---------- Models ----------
class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    duration_minutes: int = 120
    image_url: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceCreate(BaseModel):
    name: str
    description: str
    price: float
    duration_minutes: int = 120
    image_url: Optional[str] = None
    active: bool = True


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None


class BookingCreate(BaseModel):
    device_id: str
    customer_name: str
    customer_phone: str
    service_id: str
    address: str
    address_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
    notes: Optional[str] = None
    customer_email: Optional[str] = None
    consent_accepted: bool = False
    discount_code: Optional[str] = None


class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    service_id: str
    service_name: str
    service_price: float
    address: str
    address_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    scheduled_date: str
    scheduled_time: str
    notes: Optional[str] = None
    status: str = "pending_payment"  # pending_payment | paid | confirmed | in_progress | completed | cancelled
    payment_method: Optional[str] = None
    payment_ref: Optional[str] = None
    paid_at: Optional[datetime] = None
    consent_accepted: bool = False
    consent_at: Optional[datetime] = None
    discount_code: Optional[str] = None
    discount_amount: float = 0.0
    final_price: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


DISCOUNT_CODES: dict = {
    "WILLKOMMEN10": {"type": "percent", "value": 10, "description": "10 % Rabatt für Neukunden"},
    "MONAT5": {"type": "percent", "value": 5, "description": "5 % Rabatt bei Vorauszahlung"},
    "FREUNDIN2H": {"type": "fixed", "value": 50, "description": "Empfehlungsbonus – 50 € geschenkt"},
    "KUEHL40": {"type": "fixed", "value": 40, "description": "Kühlschrankreinigung gratis (40 €)"},
}


def apply_discount(code: Optional[str], price: float) -> tuple[str, float, float]:
    """Return (normalized_code_or_empty, discount_amount, final_price)."""
    if not code:
        return "", 0.0, price
    normalized = code.strip().upper()
    rule = DISCOUNT_CODES.get(normalized)
    if not rule:
        raise HTTPException(status_code=400, detail="Ungültiger Rabattcode")
    if rule["type"] == "percent":
        amount = round(price * rule["value"] / 100.0, 2)
    else:
        amount = float(rule["value"])
    amount = min(amount, price)
    final = round(price - amount, 2)
    return normalized, amount, final


class PayRequest(BaseModel):
    card_number: str
    card_holder: str
    exp: str
    cvc: str


class AdminLogin(BaseModel):
    email: str
    password: str


class StatusUpdate(BaseModel):
    status: str


# ---------- Helpers ----------
def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def verify_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="No autorizado")
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


def clean_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


# ---------- Seed ----------
async def seed_data():
    # Seed admin from env (never hard-code)
    admin_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD") or ""
    if not admin_email or len(admin_password) < 12:
        raise RuntimeError("ADMIN_EMAIL and ADMIN_PASSWORD (>=12 chars) must be set in env.")

    existing = await db.admins.find_one({"email": admin_email})
    hashed = pwd_context.hash(admin_password)
    if not existing:
        await db.admins.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Admin seeded from env for email=%s", admin_email)
    else:
        # Rotate the password if it doesn't match the env value.
        if not pwd_context.verify(admin_password, existing["password_hash"]):
            await db.admins.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hashed, "rotated_at": datetime.now(timezone.utc)}},
            )
            logger.info("Admin password rotated from env for email=%s", admin_email)

    # Seed services (Cleaning Service Wels packs in EUR - German)
    SEED_VERSION = "wels_packs_v2_de"
    marker = await db.settings.find_one({"key": "seed_version"})
    current = marker["value"] if marker else None
    if current != SEED_VERSION:
        await db.services.delete_many({})
        samples = [
            Service(
                name="Basis-Paket",
                description="Wöchentliche Pflege (3 Std.): leichte Reinigung + allgemeine Ordnung. Perfekt für Haushalte, die alles makellos halten möchten.",
                price=66.0,
                duration_minutes=180,
                image_url="https://images.pexels.com/photos/5998138/pexels-photo-5998138.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            ),
            Service(
                name="Familien-Paket",
                description="Kinderbetreuung + leichte Reinigung (4-5 Std.). Abholung von der Schule, Jause, Hausaufgabenhilfe und Reinigung der Gemeinschaftsbereiche. Ideal für Nachmittage.",
                price=112.5,
                duration_minutes=270,
                image_url="https://images.unsplash.com/photo-1647381518264-97ff1835026f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwxfHxob3VzZWtlZXBpbmd8ZW58MHx8fHwxNzgzMTY3Mjc5fDA&ixlib=rb-4.1.0&q=85",
            ),
            Service(
                name="Premium-Paket",
                description="Favorit berufstätiger Familien (5 Std./Tag): Tiefenreinigung mit Dampf, Organisation eines Bereichs, Kinderbetreuung mit Aktivitäten auf Englisch und Zubereitung des Abendessens.",
                price=120.0,
                duration_minutes=300,
                image_url="https://images.pexels.com/photos/10557898/pexels-photo-10557898.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            ),
            Service(
                name="VIP-Monatspaket",
                description="20 Wochenstunden nach Ihren Wünschen, mit Prioritätszeiten, detailliertem täglichem Bericht und Notdienst mit 24-Stunden-Vorlauf.",
                price=2000.0,
                duration_minutes=1200,
                image_url="https://images.unsplash.com/photo-1724582586529-62622e50c0b3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzV8MHwxfHNlYXJjaHwzfHxjbGVhbiUyMG1vZGVybiUyMGxpdmluZyUyMHJvb218ZW58MHx8fHwxNzgzMTY3Mjc4fDA&ixlib=rb-4.1.0&q=85",
            ),
        ]
        await db.services.insert_many([s.dict() for s in samples])
        await db.settings.update_one(
            {"key": "seed_version"},
            {"$set": {"key": "seed_version", "value": SEED_VERSION}},
            upsert=True,
        )
        logger.info("Reseeded %d Cleaning Service Wels packs", len(samples))


@app.on_event("startup")
async def _startup():
    asyncio.create_task(seed_data())


@app.on_event("shutdown")
async def _shutdown():
    client.close()


# ---------- Rate limiting (in-memory) ----------
_LOGIN_ATTEMPTS: dict = {}  # ip -> (window_start_ts, count)
_LOGIN_WINDOW_S = 60
_LOGIN_MAX = 5


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_login_rate(ip: str):
    now = time.time()
    win_start, count = _LOGIN_ATTEMPTS.get(ip, (now, 0))
    if now - win_start > _LOGIN_WINDOW_S:
        _LOGIN_ATTEMPTS[ip] = (now, 1)
        return
    if count >= _LOGIN_MAX:
        raise HTTPException(status_code=429, detail="Zu viele Anmeldeversuche. Bitte warten Sie eine Minute.")
    _LOGIN_ATTEMPTS[ip] = (win_start, count + 1)


# ---------- Public endpoints ----------
@api.get("/")
async def root():
    return {"message": "LimpiaHogar API", "status": "ok"}


@api.get("/services", response_model=List[Service])
async def list_services(only_active: bool = True):
    q = {"active": True} if only_active else {}
    docs = await db.services.find(q, {"_id": 0}).sort("price", 1).to_list(200)
    return docs


@api.post("/discount/validate")
async def validate_discount(payload: dict):
    code = (payload or {}).get("code") or ""
    price = float((payload or {}).get("price") or 0)
    if not code.strip():
        raise HTTPException(status_code=400, detail="Kein Code angegeben")
    normalized, amount, final = apply_discount(code, price)
    rule = DISCOUNT_CODES[normalized]
    return {
        "code": normalized,
        "type": rule["type"],
        "value": rule["value"],
        "description": rule["description"],
        "discount_amount": amount,
        "final_price": final,
    }


async def send_booking_notification(booking: dict):
    """Fire-and-forget: notify Dennisse of new booking via SendGrid. Silently skips if not configured."""
    api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "").strip()
    to_email = "denissenavaporras@gmail.com"
    if not api_key or not sender:
        logger.info("SendGrid not configured — skipping email notification")
        return
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        maps_url = f"https://www.google.com/maps/search/?api=1&query={urlquote(booking['address'])}"
        esc = html.escape
        name = esc(str(booking.get('customer_name', '')))
        phone_raw = str(booking.get('customer_phone', ''))
        phone_display = esc(phone_raw)
        phone_href_num = "".join(c for c in phone_raw if c.isdigit() or c == "+")
        phone_href = urlquote(phone_href_num, safe="+")
        service = esc(str(booking.get('service_name', '')))
        address = esc(str(booking.get('address', '')))
        notes = esc(str(booking.get('notes') or '—'))
        status_txt = esc(str(booking.get('status', '')))
        booking_id_s = esc(str(booking.get('id', '')))
        date_s = esc(str(booking.get('scheduled_date', '')))
        time_s = esc(str(booking.get('scheduled_time', '')))
        discount_line = ""
        if booking.get("discount_code"):
            discount_line = (
                f"<p><b>Rabatt:</b> {esc(str(booking['discount_code']))} "
                f"(–€{booking.get('discount_amount', 0):.2f})</p>"
            )

        html_body = f"""
        <div style="font-family: -apple-system, sans-serif; max-width: 560px;">
          <h2 style="color:#5D7B1E;">Neue Buchung — Cleaning Service Wels</h2>
          <p><b>Kunde:</b> {name}<br/>
             <b>Telefon:</b> <a href="tel:{phone_href}">{phone_display}</a></p>
          <p><b>Service:</b> {service}<br/>
             <b>Datum:</b> {date_s} um {time_s} Uhr</p>
          <p><b>Adresse:</b> {address}<br/>
             <a href="{maps_url}">Route in Google Maps öffnen</a></p>
          {discount_line}
          <p><b>Endpreis:</b> €{booking.get('final_price', booking['service_price']):.2f}</p>
          <p><b>Status:</b> {status_txt}</p>
          <p><b>Notizen:</b> {notes}</p>
          <hr/>
          <p style="color:#636366; font-size:12px;">Buchungs-ID: {booking_id_s}</p>
        </div>
        """

        message = Mail(
            from_email=sender,
            to_emails=to_email,
            subject=f"Neue Buchung: {name} – {date_s} {time_s}",
            html_content=html_body,
        )
        sg = SendGridAPIClient(api_key)
        resp = sg.send(message)
        logger.info("SendGrid notification sent, status=%s", resp.status_code)
    except Exception as e:
        logger.exception("Email notification failed: %s", e)


@api.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    svc = await db.services.find_one({"id": payload.service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if not payload.consent_accepted:
        raise HTTPException(status_code=400, detail="Datenschutz-Einwilligung ist erforderlich")

    price = float(svc["price"])
    code, discount_amount, final_price = apply_discount(payload.discount_code, price)

    booking = Booking(
        device_id=payload.device_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        service_id=payload.service_id,
        service_name=svc["name"],
        service_price=price,
        address=payload.address,
        address_notes=payload.address_notes,
        latitude=payload.latitude,
        longitude=payload.longitude,
        scheduled_date=payload.scheduled_date,
        scheduled_time=payload.scheduled_time,
        notes=payload.notes,
        consent_accepted=True,
        consent_at=datetime.now(timezone.utc),
        discount_code=code or None,
        discount_amount=discount_amount,
        final_price=final_price,
    )
    await db.bookings.insert_one(booking.dict())

    # Fire-and-forget: notify Dennisse
    asyncio.create_task(send_booking_notification(booking.dict()))

    return booking


@api.post("/bookings/{booking_id}/pay", response_model=Booking)
async def pay_booking(booking_id: str, payload: PayRequest, x_device_id: Optional[str] = Header(default=None)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if not x_device_id or booking.get("device_id") != x_device_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    if booking["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Esta cita ya está pagada")

    # Basic validation of card fields (MOCK payment - simulates Stripe)
    digits = "".join(c for c in payload.card_number if c.isdigit())
    if len(digits) < 12:
        raise HTTPException(status_code=400, detail="Número de tarjeta inválido")
    if len(payload.cvc) < 3:
        raise HTTPException(status_code=400, detail="CVC inválido")
    if not payload.card_holder.strip():
        raise HTTPException(status_code=400, detail="Nombre del titular requerido")

    # Simulate declined test card
    if digits.startswith("4000000000000002"):
        raise HTTPException(status_code=402, detail="Tarjeta rechazada. Intenta con otra.")

    now = datetime.now(timezone.utc)
    ref = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "paid",
            "payment_method": "mock_card",
            "payment_ref": ref,
            "paid_at": now,
        }},
    )
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return clean_doc(updated)


@api.get("/bookings/customer/{device_id}", response_model=List[Booking])
async def customer_bookings(device_id: str):
    docs = await db.bookings.find({"device_id": device_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [clean_doc(d) for d in docs]


@api.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, x_device_id: Optional[str] = Header(default=None), authorization: Optional[str] = Header(default=None)):
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    # Allow if admin JWT is valid OR if the request comes from the booking's device
    is_admin = False
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
            is_admin = payload.get("role") == "admin"
        except Exception:
            pass
    if not is_admin and (not x_device_id or doc.get("device_id") != x_device_id):
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    return clean_doc(doc)


# ---------- Admin ----------
@api.post("/admin/login")
async def admin_login(payload: AdminLogin, request: Request):
    _check_login_rate(_client_ip(request))
    admin = await db.admins.find_one({"email": payload.email.lower().strip()})
    if not admin or not pwd_context.verify(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = create_token(admin["email"])
    return {"access_token": token, "token_type": "bearer", "email": admin["email"]}


@api.get("/admin/bookings", response_model=List[Booking])
async def admin_bookings(
    _: str = Depends(verify_admin),
    date: Optional[str] = None,
    status: Optional[str] = None,
):
    q = {}
    if date:
        q["scheduled_date"] = date
    if status:
        q["status"] = status
    docs = await db.bookings.find(q, {"_id": 0}).sort([("scheduled_date", 1), ("scheduled_time", 1)]).to_list(500)
    return [clean_doc(d) for d in docs]


@api.get("/admin/stats")
async def admin_stats(_: str = Depends(verify_admin)):
    today = datetime.now(timezone.utc).date().isoformat()
    total = await db.bookings.count_documents({})
    today_count = await db.bookings.count_documents({"scheduled_date": today})
    paid_count = await db.bookings.count_documents({"status": "paid"})
    revenue_agg = await db.bookings.aggregate([
        {"$match": {"status": {"$in": ["paid", "confirmed", "in_progress", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$final_price", "$service_price"]}}}},
    ]).to_list(1)
    revenue = revenue_agg[0]["total"] if revenue_agg else 0
    return {
        "total_bookings": total,
        "today_bookings": today_count,
        "paid_bookings": paid_count,
        "revenue": revenue,
    }


@api.patch("/admin/bookings/{booking_id}/status", response_model=Booking)
async def update_status(booking_id: str, payload: StatusUpdate, _: str = Depends(verify_admin)):
    allowed = {"pending_payment", "paid", "confirmed", "in_progress", "completed", "cancelled"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Estado inválido")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": payload.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return clean_doc(doc)


@api.post("/admin/services", response_model=Service)
async def create_service(payload: ServiceCreate, _: str = Depends(verify_admin)):
    svc = Service(**payload.dict())
    await db.services.insert_one(svc.dict())
    return svc


@api.get("/admin/services", response_model=List[Service])
async def admin_list_services(_: str = Depends(verify_admin)):
    docs = await db.services.find({}, {"_id": 0}).sort("price", 1).to_list(200)
    return docs


@api.patch("/admin/services/{service_id}", response_model=Service)
async def update_service(service_id: str, payload: ServiceUpdate, _: str = Depends(verify_admin)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if updates:
        result = await db.services.update_one({"id": service_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
    doc = await db.services.find_one({"id": service_id}, {"_id": 0})
    return clean_doc(doc)


@api.delete("/admin/services/{service_id}")
async def delete_service(service_id: str, _: str = Depends(verify_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return {"ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
