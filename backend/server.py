from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import logging
from html import escape
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, Literal, List

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr, BeforeValidator

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone
from email_service import send_email, EMAIL_FROM_NAME
from chat_knowledge import SYSTEM_PROMPT

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"
OWNER_EMAIL = os.environ["OWNER_EMAIL"]

app = FastAPI()
api = APIRouter(prefix="/api")

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data


ServiceType = Literal["Wohnung", "Dach", "Garten", "Winterdienst"]
StatusType = Literal["neu", "in_bearbeitung", "erledigt"]


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=3, max_length=40)
    email: EmailStr
    service: ServiceType
    message: str = Field(default="", max_length=4000)
    offer: str = Field(default="", max_length=200)


class Contact(BaseDocument):
    name: str
    phone: str
    email: str
    service: str
    message: str = ""
    offer: str = ""
    status: str = "neu"
    email_sent: bool = False
    created_at: str


class StatusUpdate(BaseModel):
    status: StatusType


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ChatIn(BaseModel):
    session_id: str = Field(min_length=4, max_length=80)
    message: str = Field(min_length=1, max_length=1500)


# ---------- Auth ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=8)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Nicht angemeldet")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sitzung abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiges Token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Ungültiges Token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Nicht berechtigt")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name"), "role": user["role"]}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    fwd = request.headers.get("X-Forwarded-For", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "x")
    ident = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempt["last"]) + timedelta(minutes=15)
        if now < locked_until:
            raise HTTPException(status_code=429, detail="Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.")
        await db.login_attempts.delete_one({"identifier": ident})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one({"identifier": ident},
                                           {"$inc": {"count": 1}, "$set": {"last": now.isoformat()}}, upsert=True)
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch")
    await db.login_attempts.delete_one({"identifier": ident})
    token = create_access_token(str(user["_id"]), email)
    return {"token": token, "user": {"id": str(user["_id"]), "email": email, "name": user.get("name"), "role": user["role"]}}


@api.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return admin


# ---------- Contact ----------
def contact_email_html(c: Contact) -> str:
    rows = [("Name", c.name), ("Telefon", c.phone), ("E-Mail", c.email), ("Leistung", c.service),
            ("Gewähltes Angebot", c.offer or "-"), ("Nachricht", c.message or "-")]
    cells = "".join(
        f'<tr><td style="padding:8px 12px;font-weight:bold;color:#0F5132;vertical-align:top">{escape(k)}</td>'
        f'<td style="padding:8px 12px;color:#0F172A;white-space:pre-wrap">{escape(v)}</td></tr>' for k, v in rows)
    return (f'<table role="presentation" width="100%"><tr><td style="padding:24px;font-family:Arial,sans-serif">'
            f'<h2 style="color:#0F5132;margin:0 0 16px">Neue Anfrage über die Website</h2>'
            f'<table role="presentation" style="border-collapse:collapse;background:#F8FAFC;width:100%">{cells}</table>'
            f'<p style="font-size:12px;color:#888;margin-top:24px">Gesendet von {escape(EMAIL_FROM_NAME)} '
            f'Kontaktformular. Alle Anfragen finden Sie auch im Admin-Bereich.</p></td></tr></table>')


@api.post("/contact")
async def create_contact(body: ContactIn):
    contact = Contact(**body.model_dump(), created_at=datetime.now(timezone.utc).isoformat())
    res = await db.contacts.insert_one(contact.to_mongo())
    contact.id = str(res.inserted_id)
    try:
        await send_email(to=OWNER_EMAIL, subject=f"Neue Anfrage: {contact.service} – {contact.name}",
                         html=contact_email_html(contact), reply_to=contact.email)
        contact.email_sent = True
        await db.contacts.update_one({"_id": res.inserted_id}, {"$set": {"email_sent": True}})
    except Exception as e:
        logger.error(f"Contact email failed: {e}")
    return {"ok": True, "id": contact.id, "email_sent": contact.email_sent}


@api.get("/admin/contacts", response_model=List[Contact], response_model_by_alias=False)
async def list_contacts(admin: dict = Depends(get_current_admin)):
    docs = await db.contacts.find().sort("created_at", -1).to_list(1000)
    return [Contact.from_mongo(d) for d in docs]


@api.patch("/admin/contacts/{cid}", response_model=Contact, response_model_by_alias=False)
async def update_contact(cid: str, body: StatusUpdate, admin: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    doc = await db.contacts.find_one_and_update({"_id": ObjectId(cid)}, {"$set": {"status": body.status}},
                                                return_document=True)
    if not doc:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    return Contact.from_mongo(doc)


@api.delete("/admin/contacts/{cid}")
async def delete_contact(cid: str, admin: dict = Depends(get_current_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    res = await db.contacts.delete_one({"_id": ObjectId(cid)})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Nicht gefunden")
    return {"ok": True}


# ---------- Chat ----------
@api.post("/chat")
async def chat(body: ChatIn):
    history = await db.chat_messages.find({"session_id": body.session_id}).sort("created_at", 1).to_list(40)
    initial = [{"role": "system", "content": SYSTEM_PROMPT}] + [
        {"role": m["role"], "content": m["content"]} for m in history]
    llm = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=body.session_id,
                  system_message=SYSTEM_PROMPT, initial_messages=initial).with_model("anthropic", "claude-sonnet-5-5")
    now = datetime.now(timezone.utc).isoformat()
    await db.chat_messages.insert_one({"session_id": body.session_id, "role": "user", "content": body.message,
                                       "created_at": now})

    async def gen():
        parts = []
        try:
            async for ev in llm.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    parts.append(ev.content)
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.error(f"Chat error: {e}")
            yield f"data: {json.dumps({'error': 'Der Assistent ist gerade nicht erreichbar.'})}\n\n"
        if parts:
            await db.chat_messages.insert_one({"session_id": body.session_id, "role": "assistant",
                                               "content": "".join(parts),
                                               "created_at": datetime.now(timezone.utc).isoformat()})
        yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/")
async def root():
    return {"message": "Cleaning Services API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.chat_messages.create_index("session_id")
    email = os.environ["ADMIN_EMAIL"].lower()
    if not await db.users.find_one({"email": email}):
        await db.users.insert_one({"email": email, "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
                                   "name": "Admin", "role": "admin",
                                   "created_at": datetime.now(timezone.utc).isoformat()})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
