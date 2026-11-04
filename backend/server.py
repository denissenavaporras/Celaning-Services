from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
import html
import secrets
import time
from urllib.parse import quote as urlquote
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field
import jwt
from passlib.context import CryptContext

from emails import (
    send_admin_new_booking,
    send_customer_booking_confirmation,
    send_customer_quote_received,
)
import emails as emails_mod
from customers import make_router, apply_loyalty_and_referral, resolve_discount, mark_coupon_used
from scheduler import start_scheduler

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
    price: float  # hourly rate for pricing=hourly, 0 for quote
    duration_minutes: int = 120
    image_url: Optional[str] = None
    active: bool = True
    category: str = "Reinigung"  # Reinigung | Garten | Winterdienst | Dach & PV
    pricing: str = "hourly"  # hourly | quote
    min_hours: int = 2
    icon: str = "sparkles"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceCreate(BaseModel):
    name: str
    description: str
    price: float
    duration_minutes: int = 120
    image_url: Optional[str] = None
    active: bool = True
    category: str = "Reinigung"
    pricing: str = "hourly"
    min_hours: int = 2
    icon: str = "sparkles"


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None
    category: Optional[str] = None
    pricing: Optional[str] = None
    min_hours: Optional[int] = None
    icon: Optional[str] = None


class Profile(BaseModel):
    name: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    materials_by_us: bool = False


class SettingsUpdate(BaseModel):
    materials_fee: float


DEFAULT_MATERIALS_FEE = 10.0
PAID_STATUSES = ["paid", "confirmed", "in_progress", "completed"]


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
    hours: Optional[int] = None
    materials_by_us: bool = False


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
    service_category: Optional[str] = None
    pricing: str = "hourly"
    hours: Optional[int] = None
    hourly_rate: Optional[float] = None
    materials_by_us: bool = False
    materials_fee: float = 0.0
    customer_id: Optional[str] = None
    feedback_token: Optional[str] = None
    feedback_done: bool = False
    reminder_sent: bool = False
    feedback_request_sent: bool = False
    quote_note: Optional[str] = None
    duration_minutes: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


DISCOUNT_CODES: dict = {
    "WILLKOMMEN10": {"type": "percent", "value": 10, "description": "10 % Rabatt für Neukunden"},
    "MONAT5": {"type": "percent", "value": 5, "description": "5 % Rabatt bei Vorauszahlung"},
    "FREUNDIN2H": {"type": "fixed", "value": 50, "description": "Empfehlungsbonus – 50 € geschenkt"},
    "KUEHL40": {"type": "fixed", "value": 40, "description": "Kühlschrankreinigung gratis (40 €)"},
}


VALID_CATEGORIES = {"Reinigung", "Garten", "Winterdienst", "Dach & PV"}
BOOKING_SLOTS = {"14:00", "15:00", "16:00", "17:00", "18:00", "19:00"}
VALID_PRICING = {"hourly", "quote"}


def validate_booking_input(p: "BookingCreate"):
    if len(p.device_id.strip()) < 8:
        raise HTTPException(status_code=400, detail="Ungültige Geräte-ID")
    if len(p.customer_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Bitte geben Sie Ihren Namen an")
    if len("".join(c for c in p.customer_phone if c.isdigit())) < 6:
        raise HTTPException(status_code=400, detail="Bitte geben Sie eine gültige Telefonnummer an")
    if len(p.address.strip()) < 5:
        raise HTTPException(status_code=400, detail="Bitte geben Sie eine vollständige Adresse an")
    try:
        d = datetime.strptime(p.scheduled_date, "%Y-%m-%d").date()
        datetime.strptime(p.scheduled_time, "%H:%M")
    except ValueError:
        raise HTTPException(status_code=400, detail="Ungültiges Datum oder Uhrzeit")
    if p.scheduled_time not in BOOKING_SLOTS:
        raise HTTPException(status_code=400, detail="Bitte wählen Sie eine Uhrzeit zwischen 14:00 und 19:00 Uhr")
    if d < datetime.now(ZoneInfo("Europe/Vienna")).date():
        raise HTTPException(status_code=400, detail="Das Datum liegt in der Vergangenheit")


def validate_service_fields(data: dict):
    if "pricing" in data and data["pricing"] not in VALID_PRICING:
        raise HTTPException(status_code=400, detail="Ungültiges Preismodell")
    if "category" in data and data["category"] not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail="Ungültige Kategorie")
    if "price" in data and data["price"] < 0:
        raise HTTPException(status_code=400, detail="Preis darf nicht negativ sein")
    if "min_hours" in data and not (0 <= data["min_hours"] <= 12):
        raise HTTPException(status_code=400, detail="Mindeststunden müssen zwischen 0 und 12 liegen")


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
        raise HTTPException(status_code=401, detail="Nicht autorisiert")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Nicht autorisiert")
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sitzung abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiges Token")


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
    SEED_VERSION = "wels_multiservice_v3_de"
    marker = await db.settings.find_one({"key": "seed_version"})
    current = marker["value"] if marker else None
    if current != SEED_VERSION:
        await db.services.delete_many({})
        samples = [
            Service(
                name="Unterhaltsreinigung",
                description="Regelmäßige Haushaltsreinigung in Wels und Umgebung: Böden, Küche, Bad, Staubwischen und allgemeine Ordnung. Ideal wöchentlich oder alle zwei Wochen.",
                price=25.0, min_hours=2, duration_minutes=120,
                category="Reinigung", pricing="hourly", icon="sparkles",
                image_url="https://images.pexels.com/photos/5998138/pexels-photo-5998138.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            ),
            Service(
                name="Grundreinigung",
                description="Gründliche Tiefenreinigung für Wohnung oder Haus – perfekt beim Ein- oder Auszug, nach Renovierungen oder als Frühjahrsputz. Inklusive Dampfreinigung.",
                price=30.0, min_hours=3, duration_minutes=180,
                category="Reinigung", pricing="hourly", icon="water",
                image_url="https://images.pexels.com/photos/10557898/pexels-photo-10557898.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            ),
            Service(
                name="Fensterreinigung",
                description="Streifenfreie Reinigung von Fenstern, Rahmen, Fensterbänken und Glastüren – innen und außen.",
                price=28.0, min_hours=2, duration_minutes=120,
                category="Reinigung", pricing="hourly", icon="grid",
                image_url="https://images.unsplash.com/photo-1724582586529-62622e50c0b3?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
            ),
            Service(
                name="Gartenpflege",
                description="Rasenmähen, Heckenschnitt, Unkraut jäten, Laub entfernen und saisonale Gartenarbeiten. Preis nach Besichtigung bzw. Angebot.",
                price=0.0, min_hours=0, duration_minutes=180,
                category="Garten", pricing="quote", icon="leaf",
                image_url="https://images.pexels.com/photos/1301856/pexels-photo-1301856.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            ),
            Service(
                name="Winterdienst & Schneeräumung",
                description="Zuverlässige Schneeräumung und Streudienst für Gehwege, Einfahrten und Parkplätze – in Wels, Amberg, Gramastetten und Umgebung. Preis auf Anfrage.",
                price=0.0, min_hours=0, duration_minutes=60,
                category="Winterdienst", pricing="quote", icon="snow",
                image_url="https://images.pexels.com/photos/688660/pexels-photo-688660.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            ),
            Service(
                name="Dach- & PV-Reinigung",
                description="Schonende Reinigung von Dachflächen, Dachrinnen und Photovoltaikanlagen für mehr Leistung und längere Lebensdauer. Preis nach Angebot.",
                price=0.0, min_hours=0, duration_minutes=240,
                category="Dach & PV", pricing="quote", icon="sunny",
                image_url="https://images.pexels.com/photos/9875441/pexels-photo-9875441.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
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
    try:
        await db.customers.create_index("email", unique=True)
        await db.customers.create_index("referral_code", unique=True, sparse=True)
        await db.coupons.create_index("code", unique=True)
        await db.coupons.create_index([("customer_id", 1), ("used", 1)])
        await db.bookings.create_index([("customer_id", 1), ("created_at", -1)])
        await db.bookings.create_index("feedback_token", sparse=True)
    except Exception:  # noqa: BLE001
        logger.exception("index creation")
    try:
        start_scheduler(db, emails_mod)
    except Exception:  # noqa: BLE001
        logger.exception("scheduler start failed")


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
    docs = await db.services.find(q, {"_id": 0}).sort("created_at", 1).to_list(200)
    return docs


@api.post("/discount/validate")
async def validate_discount(payload: dict, authorization: Optional[str] = Header(default=None)):
    code = (payload or {}).get("code") or ""
    price = float((payload or {}).get("price") or 0)
    if not code.strip():
        raise HTTPException(status_code=400, detail="Kein Code angegeben")
    # Try customer coupon first
    customer_id = None
    if authorization and authorization.lower().startswith("bearer "):
        try:
            p = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG])
            if p.get("type") == "customer":
                customer_id = p.get("sub")
        except Exception:
            pass
    coupon = await resolve_discount(db, code, price, customer_id)
    if coupon:
        amount = round(price * coupon["value"] / 100.0, 2) if coupon["type"] == "percent" else float(coupon["value"])
        amount = min(amount, price)
        return {
            "code": coupon["coupon_code"] if coupon.get("kind") == "coupon" else code.strip().upper(),
            "type": coupon["type"],
            "value": coupon["value"],
            "description": coupon["description"],
            "discount_amount": amount,
            "final_price": round(price - amount, 2),
        }
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
    """Kept for backwards compat — delegate to emails module."""
    try:
        send_admin_new_booking(booking)
    except Exception as e:  # noqa: BLE001
        logger.exception("Email notification failed: %s", e)


@api.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate, authorization: Optional[str] = Header(default=None)):
    svc = await db.services.find_one({"id": payload.service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Service nicht gefunden")
    if not payload.consent_accepted:
        raise HTTPException(status_code=400, detail="Datenschutz-Einwilligung ist erforderlich")
    validate_booking_input(payload)

    # Optional logged-in customer
    customer_id = None
    customer_email_final = payload.customer_email
    if authorization and authorization.lower().startswith("bearer "):
        try:
            p = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALG])
            if p.get("type") == "customer":
                cust = await db.customers.find_one({"id": p.get("sub")}, {"_id": 0})
                if cust:
                    customer_id = cust["id"]
                    customer_email_final = payload.customer_email or cust.get("email")
        except Exception:
            pass

    pricing = svc.get("pricing", "hourly")
    materials_fee = 0.0
    hours = None
    rate = None
    code_used = ""
    if pricing == "quote":
        price, discount_amount, final_price = 0.0, 0.0, 0.0
        status = "quote_requested"
    else:
        min_h = int(svc.get("min_hours") or 1)
        hours = int(payload.hours or min_h)
        if hours < min_h or hours > 12:
            raise HTTPException(status_code=400, detail=f"Bitte zwischen {min_h} und 12 Stunden wählen")
        rate = float(svc["price"])
        if payload.materials_by_us:
            materials_fee = await get_materials_fee()
        price = round(rate * hours + materials_fee, 2)
        # Dynamic (customer) coupon first, then static
        if payload.discount_code:
            dyn = await resolve_discount(db, payload.discount_code, price, customer_id)
            if dyn:
                amt = round(price * dyn["value"] / 100.0, 2) if dyn["type"] == "percent" else float(dyn["value"])
                amt = min(amt, price)
                code_used = dyn["coupon_code"]
                discount_amount = amt
                final_price = round(price - amt, 2)
            else:
                code_used, discount_amount, final_price = apply_discount(payload.discount_code, price)
        else:
            code_used, discount_amount, final_price = "", 0.0, price
        status = "pending_payment"

    duration = int(svc.get("duration_minutes") or 120)
    if hours:
        duration = hours * 60

    booking = Booking(
        status=status,
        service_category=svc.get("category"),
        pricing=pricing,
        hours=hours,
        hourly_rate=rate,
        materials_by_us=payload.materials_by_us,
        materials_fee=materials_fee,
        duration_minutes=duration,
        device_id=payload.device_id,
        customer_id=customer_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=customer_email_final,
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
        discount_code=code_used or None,
        discount_amount=discount_amount,
        final_price=final_price,
    )
    await db.bookings.insert_one(booking.dict())

    asyncio.create_task(asyncio.to_thread(send_admin_new_booking, booking.dict()))
    if pricing == "quote":
        asyncio.create_task(asyncio.to_thread(send_customer_quote_received, booking.dict()))

    return booking


@api.post("/bookings/{booking_id}/pay", response_model=Booking)
async def pay_booking(booking_id: str, payload: PayRequest, x_device_id: Optional[str] = Header(default=None)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    if not x_device_id or booking.get("device_id") != x_device_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    if booking["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Termin ist bereits bezahlt oder nicht zahlbar")

    # Basic validation of card fields (MOCK payment - simulates Stripe)
    digits = "".join(c for c in payload.card_number if c.isdigit())
    if len(digits) < 12:
        raise HTTPException(status_code=400, detail="Ungültige Kartennummer")
    if len(payload.cvc) < 3:
        raise HTTPException(status_code=400, detail="Ungültiger CVC")
    if not payload.card_holder.strip():
        raise HTTPException(status_code=400, detail="Karteninhaber erforderlich")

    # Simulate declined test card
    if digits.startswith("4000000000000002"):
        raise HTTPException(status_code=402, detail="Karte abgelehnt. Bitte andere Karte versuchen.")

    now = datetime.now(timezone.utc)
    ref = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
    feedback_token = secrets.token_urlsafe(24)
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "paid",
            "payment_method": "mock_card",
            "payment_ref": ref,
            "paid_at": now,
            "feedback_token": feedback_token,
        }},
    )
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    # Mark coupon used if applicable
    if updated.get("discount_code"):
        try:
            await mark_coupon_used(db, updated["discount_code"])
        except Exception:  # noqa: BLE001
            pass
    # Loyalty / referral rewards
    try:
        await apply_loyalty_and_referral(db, emails_mod, updated)
    except Exception:  # noqa: BLE001
        logger.exception("loyalty/referral failed")
    # Customer confirmation email
    asyncio.create_task(asyncio.to_thread(send_customer_booking_confirmation, updated))
    return clean_doc(updated)


async def get_materials_fee() -> float:
    doc = await db.settings.find_one({"key": "materials_fee"})
    return float(doc["value"]) if doc else DEFAULT_MATERIALS_FEE


@api.get("/settings")
async def public_settings():
    return {"materials_fee": await get_materials_fee()}


@api.get("/profile", response_model=Profile)
async def get_profile(x_device_id: Optional[str] = Header(default=None)):
    if not x_device_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    doc = await db.profiles.find_one({"device_id": x_device_id}, {"_id": 0, "device_id": 0})
    return doc or Profile().dict()


@api.put("/profile", response_model=Profile)
async def save_profile(payload: Profile, x_device_id: Optional[str] = Header(default=None)):
    if not x_device_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    data = {k: (v.strip() if isinstance(v, str) else v) for k, v in payload.dict().items()}
    await db.profiles.update_one({"device_id": x_device_id}, {"$set": {**data, "device_id": x_device_id}}, upsert=True)
    return data


COMPANY = {
    "name": "Dennisse Nava Porras",
    "brand": "Cleaning Service Wels",
    "address": ["Almgasse 12, Tür 6", "4600 Wels, Österreich"],
    "uid": "54383/3172",
    "bank": "Raiffeisenbank",
    "bic": "RZOAT2L450",
    "iban": "AT94 3445 0000 0213 9451",
    "email": "denissenavaporras@gmail.com",
    "phone": "+43 664 101 9869",
}


def is_invoiceable(b: dict) -> bool:
    return (
        b.get("status") in PAID_STATUSES
        and b.get("pricing") != "quote"
        and bool(b.get("payment_ref"))
        and float(b.get("final_price") or 0) > 0
    )


def build_invoice_pdf(b: dict) -> bytes:
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors as rl
    from reportlab.pdfgen import canvas

    blue = rl.HexColor("#1572C4")
    green = rl.HexColor("#8DC63F")
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    left = 20 * mm
    right = w - 20 * mm

    c.setFillColor(blue)
    c.rect(0, h - 8 * mm, w, 8 * mm, fill=1, stroke=0)
    c.setFillColor(green)
    c.rect(0, h - 10 * mm, w, 2 * mm, fill=1, stroke=0)

    y = h - 28 * mm
    c.setFillColor(blue)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(left, y, COMPANY["brand"])
    c.setFont("Helvetica", 9)
    c.setFillColor(rl.HexColor("#333333"))
    lines = [COMPANY["name"], *COMPANY["address"], f"UID: {COMPANY['uid']}", COMPANY["phone"], COMPANY["email"]]
    yy = y
    for ln in lines:
        c.drawRightString(right, yy, ln)
        yy -= 4.5 * mm

    y = h - 70 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left, y, "Rechnung an:")
    c.setFont("Helvetica", 10)
    for i, ln in enumerate([b.get("customer_name", ""), *str(b.get("address", "")).split("\n"), b.get("customer_phone", "")]):
        c.drawString(left, y - (i + 1) * 5 * mm, ln[:80])

    paid_at = b.get("paid_at") or b.get("created_at")
    if isinstance(paid_at, str):
        try:
            paid_at = datetime.fromisoformat(paid_at)
        except ValueError:
            paid_at = None
    inv_date = (paid_at or datetime.now(timezone.utc)).strftime("%d.%m.%Y")
    sched = b.get("scheduled_date", "")
    try:
        sched = datetime.strptime(sched, "%Y-%m-%d").strftime("%d.%m.%Y")
    except ValueError:
        pass

    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(blue)
    c.drawString(left, y - 30 * mm, "RECHNUNG")
    c.setFillColor(rl.HexColor("#333333"))
    c.setFont("Helvetica", 10)
    meta = [
        ("Rechnungsnummer:", b.get("invoice_number", "")),
        ("Rechnungsdatum:", inv_date),
        ("Leistungsdatum:", f"{sched} um {b.get('scheduled_time', '')} Uhr"),
        ("Zahlungsreferenz:", b.get("payment_ref") or "—"),
    ]
    my = y - 38 * mm
    for k, v in meta:
        c.drawString(left, my, k)
        c.drawString(left + 40 * mm, my, str(v))
        my -= 5 * mm

    # table
    ty = my - 8 * mm
    c.setFillColor(rl.HexColor("#EAF3FB"))
    c.rect(left, ty - 2 * mm, right - left, 8 * mm, fill=1, stroke=0)
    c.setFillColor(rl.HexColor("#0E2A44"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(left + 2 * mm, ty, "Leistung")
    c.drawRightString(right - 50 * mm, ty, "Menge")
    c.drawRightString(right - 25 * mm, ty, "Einzelpreis")
    c.drawRightString(right - 2 * mm, ty, "Betrag")
    c.setFont("Helvetica", 10)
    rows = []
    hours = b.get("hours")
    rate = b.get("hourly_rate")
    if hours and rate:
        rows.append((b.get("service_name", ""), f"{hours} Std.", rate, hours * rate))
    else:
        rows.append((b.get("service_name", ""), "1", b.get("service_price", 0), b.get("service_price", 0)))
    if b.get("materials_fee"):
        rows.append(("Reinigungsmaterial (von uns mitgebracht)", "1", b["materials_fee"], b["materials_fee"]))
    if b.get("discount_amount"):
        rows.append((f"Rabatt ({b.get('discount_code', '')})", "", None, -b["discount_amount"]))
    ry = ty - 9 * mm
    for name, qty, unit, amt in rows:
        c.drawString(left + 2 * mm, ry, str(name)[:60])
        c.drawRightString(right - 50 * mm, ry, qty)
        c.drawRightString(right - 25 * mm, ry, f"€ {unit:.2f}" if unit is not None else "")
        c.drawRightString(right - 2 * mm, ry, f"€ {amt:.2f}")
        ry -= 7 * mm
    c.setStrokeColor(rl.HexColor("#B9C7D6"))
    c.line(left, ry + 3 * mm, right, ry + 3 * mm)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(right - 70 * mm, ry - 4 * mm, "Gesamtbetrag:")
    c.setFillColor(blue)
    c.drawRightString(right - 2 * mm, ry - 4 * mm, f"€ {float(b.get('final_price') or 0):.2f}")
    c.setFillColor(rl.HexColor("#333333"))
    c.setFont("Helvetica", 9)
    c.drawString(left, ry - 14 * mm, "Der Betrag wurde online beglichen. Vielen Dank für Ihr Vertrauen!")

    # footer
    c.setStrokeColor(green)
    c.setLineWidth(1.5)
    c.line(left, 30 * mm, right, 30 * mm)
    c.setFont("Helvetica", 8)
    c.drawString(left, 24 * mm, f"{COMPANY['name']} · {COMPANY['address'][0]}, {COMPANY['address'][1]} · UID: {COMPANY['uid']}")
    c.drawString(left, 19 * mm, f"Bankverbindung: {COMPANY['bank']} · IBAN: {COMPANY['iban']} · BIC: {COMPANY['bic']}")
    c.showPage()
    c.save()
    return buf.getvalue()


@api.get("/bookings/{booking_id}/invoice")
async def booking_invoice(booking_id: str, device_id: Optional[str] = None, x_device_id: Optional[str] = Header(default=None)):
    from fastapi.responses import Response
    dev = x_device_id or device_id
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    if not dev or doc.get("device_id") != dev:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    if not is_invoiceable(doc):
        raise HTTPException(status_code=400, detail="Rechnung erst nach Zahlung verfügbar")
    if not doc.get("invoice_number"):
        counter = await db.settings.find_one_and_update(
            {"key": "invoice_counter"}, {"$inc": {"value": 1}}, upsert=True, return_document=True,
        )
        paid_at = doc.get("paid_at")
        year = paid_at.year if isinstance(paid_at, datetime) else datetime.now(timezone.utc).year
        number = f"RE-{year}-{int(counter['value']):04d}"
        await db.bookings.update_one({"id": booking_id, "invoice_number": None}, {"$set": {"invoice_number": number}})
        doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    pdf = build_invoice_pdf(doc)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="Rechnung-{doc["invoice_number"]}.pdf"'},
    )


@api.get("/bookings/customer/{device_id}", response_model=List[Booking])
async def customer_bookings(device_id: str, x_device_id: Optional[str] = Header(default=None)):
    if x_device_id != device_id:
        raise HTTPException(status_code=403, detail="Zugriff verweigert")
    docs = await db.bookings.find({"device_id": device_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [clean_doc(d) for d in docs]


@api.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, x_device_id: Optional[str] = Header(default=None), authorization: Optional[str] = Header(default=None)):
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
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
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
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
    allowed = {"quote_requested", "pending_payment", "paid", "confirmed", "in_progress", "completed", "cancelled"}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Ungültiger Status")
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": payload.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return clean_doc(doc)


@api.put("/admin/settings")
async def update_settings(payload: SettingsUpdate, _: str = Depends(verify_admin)):
    if payload.materials_fee < 0 or payload.materials_fee > 500:
        raise HTTPException(status_code=400, detail="Ungültiger Betrag")
    await db.settings.update_one(
        {"key": "materials_fee"}, {"$set": {"key": "materials_fee", "value": float(payload.materials_fee)}}, upsert=True,
    )
    return {"materials_fee": float(payload.materials_fee)}


@api.post("/admin/services", response_model=Service)
async def create_service(payload: ServiceCreate, _: str = Depends(verify_admin)):
    validate_service_fields(payload.dict())
    svc = Service(**payload.dict())
    await db.services.insert_one(svc.dict())
    return svc


@api.get("/admin/services", response_model=List[Service])
async def admin_list_services(_: str = Depends(verify_admin)):
    docs = await db.services.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return docs


@api.patch("/admin/services/{service_id}", response_model=Service)
async def update_service(service_id: str, payload: ServiceUpdate, _: str = Depends(verify_admin)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    validate_service_fields(updates)
    if updates:
        result = await db.services.update_one({"id": service_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Service nicht gefunden")
    doc = await db.services.find_one({"id": service_id}, {"_id": 0})
    return clean_doc(doc)


@api.delete("/admin/services/{service_id}")
async def delete_service(service_id: str, _: str = Depends(verify_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service nicht gefunden")
    return {"ok": True}


app.include_router(api)

# Customer auth & rewards router
_customers_router, _current_customer, _optional_customer = make_router(db, JWT_SECRET, JWT_ALG, verify_admin, emails_mod)
app.include_router(_customers_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
