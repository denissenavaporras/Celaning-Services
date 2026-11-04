"""Background scheduler for reminders and feedback-request emails.

Rule for reminder emails:
  - If service starts <= 10:00 local, send at 21:00 of the previous calendar day.
  - Otherwise send ~4h before the scheduled start.

Rule for feedback requests:
  - Send ~2h after the scheduled end (start + duration_minutes). Requires the booking
    to be paid/confirmed/in_progress/completed and a feedback_token must exist.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger("limpiahogar.scheduler")

VIENNA = ZoneInfo("Europe/Vienna")
PAID = ("paid", "confirmed", "in_progress", "completed")


def _parse(date_s: str, time_s: str) -> datetime | None:
    try:
        return datetime.strptime(f"{date_s} {time_s}", "%Y-%m-%d %H:%M").replace(tzinfo=VIENNA)
    except ValueError:
        return None


def _reminder_due_at(start_local: datetime) -> datetime:
    if start_local.time().hour < 12:
        prev = (start_local - timedelta(days=1)).replace(hour=21, minute=0, second=0, microsecond=0)
        return prev
    return start_local - timedelta(hours=4)


async def _run_cycle(db, emails):
    now_v = datetime.now(VIENNA)
    # Reminders — find bookings in the near future that haven't been reminded
    ahead = now_v + timedelta(days=2)
    candidates = db.bookings.find({
        "status": {"$in": list(PAID)},
        "reminder_sent": {"$ne": True},
        "customer_email": {"$ne": None},
        "scheduled_date": {
            "$gte": (now_v - timedelta(days=1)).strftime("%Y-%m-%d"),
            "$lte": ahead.strftime("%Y-%m-%d"),
        },
    }, {"_id": 0})
    async for b in candidates:
        start = _parse(b["scheduled_date"], b["scheduled_time"])
        if not start:
            continue
        due = _reminder_due_at(start)
        if due <= now_v <= start:
            try:
                emails.send_reminder(b)
                await db.bookings.update_one({"id": b["id"]}, {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.utcnow()}})
                logger.info("Reminder sent for booking %s", b["id"])
            except Exception:  # noqa: BLE001
                logger.exception("Reminder send failed")

    # Feedback requests — ~2h after scheduled end
    past = now_v - timedelta(days=7)
    done_candidates = db.bookings.find({
        "status": {"$in": list(PAID)},
        "feedback_request_sent": {"$ne": True},
        "customer_email": {"$ne": None},
        "scheduled_date": {
            "$gte": past.strftime("%Y-%m-%d"),
            "$lte": now_v.strftime("%Y-%m-%d"),
        },
    }, {"_id": 0})
    async for b in done_candidates:
        start = _parse(b["scheduled_date"], b["scheduled_time"])
        if not start:
            continue
        duration = int(b.get("duration_minutes") or b.get("hours", 2) * 60 or 120)
        end = start + timedelta(minutes=duration)
        if end + timedelta(hours=2) <= now_v <= end + timedelta(days=7):
            token = b.get("feedback_token") or secrets.token_urlsafe(24)
            await db.bookings.update_one({"id": b["id"]}, {"$set": {"feedback_token": token}})
            b["feedback_token"] = token
            try:
                emails.send_feedback_request(b)
                await db.bookings.update_one({"id": b["id"]}, {"$set": {"feedback_request_sent": True, "feedback_request_sent_at": datetime.utcnow()}})
                logger.info("Feedback request sent for booking %s", b["id"])
            except Exception:  # noqa: BLE001
                logger.exception("Feedback send failed")


def start_scheduler(db, emails) -> AsyncIOScheduler:
    sched = AsyncIOScheduler(timezone=VIENNA)
    sched.add_job(lambda: _run_cycle(db, emails), "interval", minutes=5, next_run_time=datetime.now(VIENNA) + timedelta(seconds=30), id="reminders", max_instances=1, coalesce=True)
    sched.start()
    logger.info("Scheduler started")
    return sched
