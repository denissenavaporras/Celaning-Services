from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
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
JWT_SECRET = os.environ.get("JWT_SECRET", "limpiahogar-super-secret-key-change-me")
JWT_ALG = "HS256"

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    # Seed admin
    admin_email = "admin@limpia.com"
    existing = await db.admins.find_one({"email": admin_email})
    if not existing:
        await db.admins.insert_one({
            "email": admin_email,
            "password_hash": pwd_context.hash("admin123"),
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Admin seeded: admin@limpia.com / admin123")

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


# ---------- Public endpoints ----------
@api.get("/")
async def root():
    return {"message": "LimpiaHogar API", "status": "ok"}


@api.get("/services", response_model=List[Service])
async def list_services(only_active: bool = True):
    q = {"active": True} if only_active else {}
    docs = await db.services.find(q, {"_id": 0}).sort("price", 1).to_list(200)
    return docs


@api.post("/bookings", response_model=Booking)
async def create_booking(payload: BookingCreate):
    svc = await db.services.find_one({"id": payload.service_id}, {"_id": 0})
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if not payload.consent_accepted:
        raise HTTPException(status_code=400, detail="Datenschutz-Einwilligung ist erforderlich")

    booking = Booking(
        device_id=payload.device_id,
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        service_id=payload.service_id,
        service_name=svc["name"],
        service_price=svc["price"],
        address=payload.address,
        address_notes=payload.address_notes,
        latitude=payload.latitude,
        longitude=payload.longitude,
        scheduled_date=payload.scheduled_date,
        scheduled_time=payload.scheduled_time,
        notes=payload.notes,
        consent_accepted=True,
        consent_at=datetime.now(timezone.utc),
    )
    await db.bookings.insert_one(booking.dict())
    return booking


@api.post("/bookings/{booking_id}/pay", response_model=Booking)
async def pay_booking(booking_id: str, payload: PayRequest):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
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
async def get_booking(booking_id: str):
    doc = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    return clean_doc(doc)


# ---------- Admin ----------
@api.post("/admin/login")
async def admin_login(payload: AdminLogin):
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
        {"$group": {"_id": None, "total": {"$sum": "$service_price"}}},
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
