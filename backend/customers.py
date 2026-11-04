"""Customer accounts, loyalty, referrals, coupons, and quote/feedback flows.

Mounted from server.py which provides `db`, `JWT_SECRET`, `JWT_ALG`, etc.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

import jwt
from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

logger = logging.getLogger("limpiahogar.customers")
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================= Config =============================
LOYALTY_THRESHOLD = 5  # every Nth paid cleaning booking -> coupon
COUPON_PERCENT_LOYALTY = 10
COUPON_PERCENT_REFERRAL = 10
COUPON_PERCENT_FEEDBACK = 10
COUPON_VALID_DAYS = 90
ACCESS_TOKEN_MIN = 60 * 24 * 14  # 14 days
RESET_TOKEN_MIN = 30
REFERRAL_PREFIX = "WEL"
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# ============================= Models =============================
class CustomerPublic(BaseModel):
    id: str
    email: str
    name: str
    phone: str = ""
    referral_code: str
    loyalty_count: int = 0
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: CustomerPublic


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=120)
    phone: str = ""
    referral_code: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    materials_by_us: Optional[bool] = None


class Coupon(BaseModel):
    code: str
    discount_percent: int
    reason: Literal["loyalty", "referral", "referral_referred", "feedback", "manual"]
    used: bool = False
    expires_at: datetime
    created_at: datetime
    description: str


class QuoteUpdate(BaseModel):
    hourly_rate: Optional[float] = None
    hours: Optional[int] = None
    price: Optional[float] = None  # flat quote amount (alternative to hourly_rate * hours)
    materials_fee: Optional[float] = 0.0
    note: Optional[str] = None


class FeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    clarity: int = Field(ge=1, le=5)
    would_recommend: bool
    comment: Optional[str] = Field(default=None, max_length=1000)


# ============================= Helpers =============================
def _hash_pw(p: str) -> str:
    return _pwd.hash(p)


def _verify_pw(p: str, h: str) -> bool:
    try:
        return _pwd.verify(p, h)
    except Exception:
        return False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _referral_code(name: str) -> str:
    base = re.sub(r"[^A-Z0-9]", "", name.upper())[:4] or "KUND"
    return f"{REFERRAL_PREFIX}-{base}{secrets.token_hex(2).upper()}"


def _coupon_code(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(3).upper()}"


def _token_hash(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()


def _normalize(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    doc.pop("reset_token_hash", None)
    doc.pop("reset_expires_at", None)
    return doc


def public_customer(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "email": doc["email"],
        "name": doc["name"],
        "phone": doc.get("phone", ""),
        "referral_code": doc.get("referral_code", ""),
        "loyalty_count": int(doc.get("loyalty_count", 0)),
        "created_at": doc["created_at"],
    }


def create_access_token(customer_id: str, secret: str, alg: str) -> str:
    return jwt.encode(
        {"sub": customer_id, "type": "customer", "exp": _now() + timedelta(minutes=ACCESS_TOKEN_MIN)},
        secret,
        algorithm=alg,
    )


# ============================= Rate limit (in-memory) =============================
_HITS: dict[str, tuple[float, int]] = {}


def _rate_limit(key: str, window_s: int, limit: int):
    now = time.time()
    start, n = _HITS.get(key, (now, 0))
    if now - start > window_s:
        _HITS[key] = (now, 1)
        return
    if n >= limit:
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte warten Sie einen Moment.")
    _HITS[key] = (start, n + 1)


def _client_ip(r: Request) -> str:
    fwd = r.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return r.client.host if r.client else "unknown"


# ============================= Router factory =============================
def make_router(db, jwt_secret: str, jwt_alg: str, admin_dep, emails):
    router = APIRouter()

    # ---------- Dependencies ----------
    async def current_customer(authorization: Optional[str] = Header(default=None)) -> dict:
        unauth = HTTPException(status_code=401, detail="Nicht angemeldet", headers={"WWW-Authenticate": "Bearer"})
        if not authorization or not authorization.lower().startswith("bearer "):
            raise unauth
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_alg])
            if payload.get("type") != "customer" or not payload.get("sub"):
                raise unauth
            doc = await db.customers.find_one({"id": payload["sub"]}, {"_id": 0})
        except (jwt.PyJWTError, ValueError):
            raise unauth
        if not doc:
            raise unauth
        return doc

    async def optional_customer(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
        if not authorization or not authorization.lower().startswith("bearer "):
            return None
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[jwt_alg])
            if payload.get("type") != "customer":
                return None
            return await db.customers.find_one({"id": payload["sub"]}, {"_id": 0})
        except jwt.PyJWTError:
            return None

    # ---------- Auth ----------
    @router.post("/auth/register", response_model=TokenOut)
    async def register(body: RegisterIn, request: Request):
        _rate_limit(f"reg:{_client_ip(request)}", 60, 10)
        email = body.email.strip().lower()
        exists = await db.customers.find_one({"email": email})
        if exists:
            raise HTTPException(status_code=409, detail="Diese E-Mail ist bereits registriert.")
        referred_by = None
        if body.referral_code:
            ref_doc = await db.customers.find_one({"referral_code": body.referral_code.strip().upper()}, {"id": 1})
            if ref_doc:
                referred_by = ref_doc["id"]
        cid = str(uuid.uuid4())
        doc = {
            "id": cid,
            "email": email,
            "password_hash": _hash_pw(body.password),
            "name": body.name.strip(),
            "phone": (body.phone or "").strip(),
            "referral_code": _referral_code(body.name),
            "referred_by": referred_by,
            "loyalty_count": 0,
            "created_at": _now(),
        }
        await db.customers.insert_one(doc)
        token = create_access_token(cid, jwt_secret, jwt_alg)
        return {"access_token": token, "token_type": "bearer", "customer": public_customer(doc)}

    @router.post("/auth/login", response_model=TokenOut)
    async def login(body: LoginIn, request: Request):
        _rate_limit(f"login:{_client_ip(request)}", 60, 8)
        email = body.email.strip().lower()
        doc = await db.customers.find_one({"email": email})
        ok = _verify_pw(body.password, doc["password_hash"]) if doc else False
        if not ok:
            raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten", headers={"WWW-Authenticate": "Bearer"})
        token = create_access_token(doc["id"], jwt_secret, jwt_alg)
        return {"access_token": token, "token_type": "bearer", "customer": public_customer(doc)}

    @router.get("/auth/me", response_model=CustomerPublic)
    async def me(customer: dict = Depends(current_customer)):
        return public_customer(customer)

    @router.put("/auth/me", response_model=CustomerPublic)
    async def update_me(body: ProfileUpdate, customer: dict = Depends(current_customer)):
        patch = {k: v for k, v in body.dict().items() if v is not None and k != "address" and k != "materials_by_us"}
        if patch:
            await db.customers.update_one({"id": customer["id"]}, {"$set": patch})
        # Also store address/materials_by_us in profiles by customer_id for pre-fill
        prof_patch = {k: v for k, v in body.dict().items() if v is not None and k in {"address", "materials_by_us", "phone", "name"}}
        if prof_patch:
            await db.profiles.update_one(
                {"customer_id": customer["id"]},
                {"$set": {**prof_patch, "customer_id": customer["id"], "email": customer["email"]}},
                upsert=True,
            )
        doc = await db.customers.find_one({"id": customer["id"]}, {"_id": 0})
        return public_customer(doc)

    @router.post("/auth/change-password", status_code=204)
    async def change_password(body: ChangePasswordIn, customer: dict = Depends(current_customer)):
        if not _verify_pw(body.current_password, customer["password_hash"]):
            raise HTTPException(status_code=401, detail="Aktuelles Passwort ist nicht korrekt")
        if body.current_password == body.new_password:
            raise HTTPException(status_code=400, detail="Das neue Passwort muss sich vom alten unterscheiden")
        await db.customers.update_one({"id": customer["id"]}, {"$set": {"password_hash": _hash_pw(body.new_password)}})

    @router.post("/auth/forgot-password", status_code=202)
    async def forgot_password(body: ForgotPasswordIn, request: Request):
        _rate_limit(f"forgot:{_client_ip(request)}", 3600, 5)
        email = body.email.strip().lower()
        doc = await db.customers.find_one({"email": email})
        if doc:
            raw = secrets.token_urlsafe(32)
            await db.customers.update_one(
                {"id": doc["id"]},
                {"$set": {"reset_token_hash": _token_hash(raw), "reset_expires_at": _now() + timedelta(minutes=RESET_TOKEN_MIN)}},
            )
            link = f"{emails._public_base()}/auth/reset?token={raw}"
            emails.send_password_reset(email, doc.get("name", ""), link, RESET_TOKEN_MIN)
        return {"message": "Wenn die E-Mail existiert, wurde ein Link verschickt."}

    @router.post("/auth/reset-password", status_code=204)
    async def reset_password(body: ResetPasswordIn):
        doc = await db.customers.find_one({"reset_token_hash": _token_hash(body.token), "reset_expires_at": {"$gt": _now()}})
        if not doc:
            raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Link")
        await db.customers.update_one(
            {"id": doc["id"], "reset_token_hash": _token_hash(body.token)},
            {"$set": {"password_hash": _hash_pw(body.new_password)}, "$unset": {"reset_token_hash": "", "reset_expires_at": ""}},
        )

    # ---------- Coupons ----------
    @router.get("/coupons/me", response_model=List[Coupon])
    async def my_coupons(customer: dict = Depends(current_customer)):
        docs = await db.coupons.find({"customer_id": customer["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return docs

    # ---------- Bookings (logged-in) ----------
    @router.get("/bookings/me")
    async def my_bookings(customer: dict = Depends(current_customer)):
        docs = await db.bookings.find({"customer_id": customer["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return docs

    # ---------- Feedback (public) ----------
    @router.get("/feedback/{token}")
    async def feedback_info(token: str):
        b = await db.bookings.find_one({"feedback_token": token}, {"_id": 0})
        if not b:
            raise HTTPException(status_code=404, detail="Link ungültig oder bereits verwendet")
        return {
            "service_name": b.get("service_name"),
            "scheduled_date": b.get("scheduled_date"),
            "scheduled_time": b.get("scheduled_time"),
            "feedback_done": bool(b.get("feedback_done")),
        }

    @router.post("/feedback/{token}")
    async def submit_feedback(token: str, body: FeedbackIn):
        b = await db.bookings.find_one({"feedback_token": token}, {"_id": 0})
        if not b:
            raise HTTPException(status_code=404, detail="Link ungültig oder bereits verwendet")
        if b.get("feedback_done"):
            raise HTTPException(status_code=400, detail="Feedback wurde bereits abgegeben")
        await db.bookings.update_one(
            {"id": b["id"]},
            {"$set": {
                "feedback_done": True,
                "feedback_at": _now(),
                "feedback_rating": body.rating,
                "feedback_clarity": body.clarity,
                "feedback_recommend": body.would_recommend,
                "feedback_comment": (body.comment or "").strip() or None,
            }},
        )
        # Issue coupon to the customer (by email or linked customer_id)
        coupon_code = _coupon_code("DANKE")
        coupon = {
            "code": coupon_code,
            "discount_percent": COUPON_PERCENT_FEEDBACK,
            "reason": "feedback",
            "used": False,
            "expires_at": _now() + timedelta(days=COUPON_VALID_DAYS),
            "created_at": _now(),
            "customer_id": b.get("customer_id"),
            "customer_email": b.get("customer_email"),
            "description": f"{COUPON_PERCENT_FEEDBACK} % Gutschein als Dankeschön für Ihr Feedback",
        }
        await db.coupons.insert_one(coupon)
        if b.get("customer_email"):
            emails.send_coupon_email(b["customer_email"], b.get("customer_name", ""), coupon_code, COUPON_PERCENT_FEEDBACK, "feedback")
        return {"ok": True, "coupon_code": coupon_code, "discount_percent": COUPON_PERCENT_FEEDBACK}

    # ---------- Admin quotes ----------
    @router.patch("/admin/bookings/{booking_id}/quote")
    async def send_quote(booking_id: str, body: QuoteUpdate, _: str = Depends(admin_dep)):
        b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if not b:
            raise HTTPException(status_code=404, detail="Termin nicht gefunden")
        if b.get("pricing") != "quote":
            raise HTTPException(status_code=400, detail="Nur Angebots-Buchungen können geprüft werden")
        mat_fee = float(body.materials_fee or 0)
        if body.price is not None and body.price > 0:
            service_price = round(float(body.price) + mat_fee, 2)
            hours = None
            rate = None
        elif body.hourly_rate and body.hours:
            rate = float(body.hourly_rate)
            hours = int(body.hours)
            service_price = round(rate * hours + mat_fee, 2)
        else:
            raise HTTPException(status_code=400, detail="Bitte Pauschalpreis oder Stundensatz + Stunden angeben")
        patch = {
            "status": "pending_payment",
            "service_price": service_price,
            "final_price": service_price,
            "hours": hours,
            "hourly_rate": rate,
            "materials_fee": mat_fee,
            "quote_note": body.note,
            "quoted_at": _now(),
        }
        await db.bookings.update_one({"id": booking_id}, {"$set": patch})
        updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if updated.get("customer_email"):
            try:
                emails.send_customer_quote_ready(updated)
            except Exception:  # noqa: BLE001
                logger.exception("quote email failed")
        updated.pop("_id", None)
        return updated

    return router, current_customer, optional_customer


# ============================= Loyalty / Referral =============================
async def apply_loyalty_and_referral(db, emails, booking: dict) -> None:
    """Call right after a successful payment. Credits loyalty + referral rewards."""
    cid = booking.get("customer_id")
    email = booking.get("customer_email")
    if not cid and not email:
        return
    customer = None
    if cid:
        customer = await db.customers.find_one({"id": cid})
    elif email:
        customer = await db.customers.find_one({"email": email.strip().lower()})
        if customer:
            cid = customer["id"]
            await db.bookings.update_one({"id": booking["id"]}, {"$set": {"customer_id": cid}})
    if not customer:
        return

    # Loyalty counter
    new_count = int(customer.get("loyalty_count", 0)) + 1
    update = {"loyalty_count": new_count}
    issued = []
    if new_count % LOYALTY_THRESHOLD == 0:
        code = _coupon_code("TREUE")
        await db.coupons.insert_one({
            "code": code, "discount_percent": COUPON_PERCENT_LOYALTY, "reason": "loyalty",
            "used": False, "expires_at": _now() + timedelta(days=COUPON_VALID_DAYS),
            "created_at": _now(), "customer_id": customer["id"], "customer_email": customer["email"],
            "description": f"{COUPON_PERCENT_LOYALTY} % Gutschein nach {LOYALTY_THRESHOLD} Buchungen",
        })
        issued.append((code, "loyalty"))

    # Referral: this is the customer's first paid booking AND they have a referred_by
    if not customer.get("referral_credited") and customer.get("referred_by"):
        referrer = await db.customers.find_one({"id": customer["referred_by"]})
        if referrer:
            # Reward both
            for target, reason in ((referrer, "referral"), (customer, "referral_referred")):
                code = _coupon_code("FREUND")
                await db.coupons.insert_one({
                    "code": code, "discount_percent": COUPON_PERCENT_REFERRAL, "reason": reason,
                    "used": False, "expires_at": _now() + timedelta(days=COUPON_VALID_DAYS),
                    "created_at": _now(), "customer_id": target["id"], "customer_email": target["email"],
                    "description": f"{COUPON_PERCENT_REFERRAL} % " + ("Empfehlungsbonus" if reason == "referral" else "Willkommensbonus"),
                })
                if target.get("email"):
                    emails.send_coupon_email(target["email"], target.get("name", ""), code, COUPON_PERCENT_REFERRAL, reason)
        update["referral_credited"] = True

    await db.customers.update_one({"id": customer["id"]}, {"$set": update})

    for code, reason in issued:
        if customer.get("email"):
            emails.send_coupon_email(customer["email"], customer.get("name", ""), code, COUPON_PERCENT_LOYALTY, reason)


async def resolve_discount(db, code: str, price: float, customer_id: Optional[str]) -> Optional[dict]:
    """Return rule dict for a code, or None if invalid. Rule fields: type, value, description, kind."""
    normalized = (code or "").strip().upper()
    if not normalized:
        return None
    coupon = await db.coupons.find_one({"code": normalized, "used": False})
    if coupon:
        if coupon.get("customer_id") and customer_id and coupon["customer_id"] != customer_id:
            return None
        if coupon.get("expires_at") and coupon["expires_at"] < _now():
            return None
        return {
            "type": "percent",
            "value": int(coupon["discount_percent"]),
            "description": coupon.get("description", f"{coupon['discount_percent']} % Gutschein"),
            "kind": "coupon",
            "coupon_code": coupon["code"],
        }
    return None


async def mark_coupon_used(db, code: str) -> None:
    await db.coupons.update_one({"code": code.strip().upper()}, {"$set": {"used": True, "used_at": _now()}})
