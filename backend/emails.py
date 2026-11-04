"""Email helpers for Cleaning Service Wels.

Fire-and-forget SendGrid senders. Silently skipped when SendGrid is not configured
(e.g. local dev without keys) so request latency and behaviour stay the same.
"""
from __future__ import annotations

import html
import logging
import os
from datetime import datetime
from typing import Optional
from urllib.parse import quote as urlquote

logger = logging.getLogger("limpiahogar.email")

BRAND_BLUE = "#1572C4"
BRAND_GREEN = "#8DC63F"
ADMIN_TO = os.environ.get("ADMIN_EMAIL", "denissenavaporras@gmail.com")


def _public_base() -> str:
    return (os.environ.get("PUBLIC_APP_URL") or "").rstrip("/") or "https://cleanroute-app-2.preview.emergentagent.com"


def _wrap(title: str, body_html: str, cta: Optional[tuple[str, str]] = None, footer_note: str = "") -> str:
    cta_html = ""
    if cta:
        label, url = cta
        cta_html = (
            f'<p style="margin:28px 0 0;text-align:center;">'
            f'<a href="{url}" style="background:{BRAND_BLUE};color:#fff;text-decoration:none;'
            f'padding:14px 28px;border-radius:999px;font-weight:700;display:inline-block;">{html.escape(label)}</a>'
            f"</p>"
        )
    foot = html.escape(footer_note) if footer_note else ""
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:auto;background:#fff;color:#1c1c1e;">
      <div style="background:{BRAND_BLUE};padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">Cleaning Service Wels</div>
        <div style="height:4px;background:{BRAND_GREEN};margin-top:12px;border-radius:2px;"></div>
      </div>
      <div style="padding:28px 24px;border:1px solid #EDF2F7;border-top:none;border-radius:0 0 12px 12px;">
        <h2 style="color:{BRAND_BLUE};margin:0 0 12px;">{html.escape(title)}</h2>
        {body_html}
        {cta_html}
        <p style="color:#8e8e93;font-size:12px;margin-top:28px;">
          Cleaning Service Wels &middot; Almgasse 12/6, 4600 Wels &middot; +43 664 101 9869
        </p>
        {f'<p style="color:#8e8e93;font-size:11px;margin-top:4px;">{foot}</p>' if foot else ''}
      </div>
    </div>
    """


def _send(to: str, subject: str, html_body: str) -> bool:
    api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "").strip()
    if not api_key or not sender or not to:
        logger.info("Email skipped (not configured) to=%s subject=%s", to, subject)
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        msg = Mail(from_email=sender, to_emails=to, subject=subject, html_content=html_body)
        SendGridAPIClient(api_key).send(msg)
        return True
    except Exception as e:  # noqa: BLE001
        logger.exception("Email send failed to=%s: %s", to, e)
        return False


def _fmt_date(d: str) -> str:
    try:
        return datetime.strptime(d, "%Y-%m-%d").strftime("%d.%m.%Y")
    except ValueError:
        return d


def send_admin_new_booking(booking: dict) -> None:
    esc = html.escape
    maps = f"https://www.google.com/maps/search/?api=1&query={urlquote(booking.get('address', ''))}"
    discount_line = ""
    if booking.get("discount_code"):
        discount_line = (
            f"<p><b>Rabatt:</b> {esc(str(booking['discount_code']))} "
            f"(–€{booking.get('discount_amount', 0):.2f})</p>"
        )
    pricing = booking.get("pricing", "hourly")
    price_line = (
        "<p><b>Preis:</b> Auf Anfrage (Angebot erstellen)</p>"
        if pricing == "quote"
        else f"<p><b>Endpreis:</b> €{float(booking.get('final_price') or booking.get('service_price', 0)):.2f}</p>"
    )
    body = f"""
    <p><b>Kunde:</b> {esc(str(booking.get('customer_name', '')))}<br/>
       <b>Telefon:</b> {esc(str(booking.get('customer_phone', '')))}<br/>
       <b>E-Mail:</b> {esc(str(booking.get('customer_email') or '—'))}</p>
    <p><b>Service:</b> {esc(str(booking.get('service_name', '')))}<br/>
       <b>Datum:</b> {_fmt_date(str(booking.get('scheduled_date', '')))} um {esc(str(booking.get('scheduled_time', '')))} Uhr</p>
    <p><b>Adresse:</b> {esc(str(booking.get('address', '')))}<br/>
       <a href="{maps}">Route in Google Maps öffnen</a></p>
    {discount_line}
    {price_line}
    <p><b>Status:</b> {esc(str(booking.get('status', '')))}</p>
    <p><b>Notizen:</b> {esc(str(booking.get('notes') or '—'))}</p>
    """
    subject = (
        f"Neue Angebotsanfrage: {booking.get('service_name', '')}"
        if pricing == "quote"
        else f"Neue Buchung: {booking.get('customer_name', '')} – {_fmt_date(str(booking.get('scheduled_date', '')))}"
    )
    _send(ADMIN_TO, subject, _wrap("Neue Buchung" if pricing != "quote" else "Neue Angebotsanfrage", body))


def send_customer_booking_confirmation(booking: dict) -> None:
    if not booking.get("customer_email"):
        return
    esc = html.escape
    body = f"""
    <p>Hallo {esc(booking.get('customer_name', ''))},</p>
    <p>vielen Dank für Ihre Buchung bei Cleaning Service Wels. Wir freuen uns auf Ihren Termin!</p>
    <table style="margin-top:12px;border-collapse:collapse;">
      <tr><td style="padding:6px 12px;color:#636366;">Service</td><td style="padding:6px 12px;font-weight:600;">{esc(booking.get('service_name', ''))}</td></tr>
      <tr><td style="padding:6px 12px;color:#636366;">Datum</td><td style="padding:6px 12px;font-weight:600;">{_fmt_date(str(booking.get('scheduled_date', '')))} um {esc(str(booking.get('scheduled_time', '')))} Uhr</td></tr>
      <tr><td style="padding:6px 12px;color:#636366;">Adresse</td><td style="padding:6px 12px;font-weight:600;">{esc(booking.get('address', ''))}</td></tr>
      <tr><td style="padding:6px 12px;color:#636366;">Betrag</td><td style="padding:6px 12px;font-weight:600;">€{float(booking.get('final_price') or 0):.2f} (bezahlt)</td></tr>
    </table>
    <p>Sie erhalten {('am Vorabend gegen 21:00 Uhr' if booking.get('scheduled_time', '14:00') < '12:00' else 'rund 4 Stunden vor dem Termin')} eine Erinnerung.</p>
    <p>Mit freundlichen Grüßen,<br/>Dennisse &amp; Team</p>
    """
    _send(booking["customer_email"], "Ihre Buchung ist bestätigt", _wrap("Buchung bestätigt", body))


def send_customer_quote_received(booking: dict) -> None:
    if not booking.get("customer_email"):
        return
    body = f"""
    <p>Hallo {html.escape(booking.get('customer_name', ''))},</p>
    <p>vielen Dank für Ihre Anfrage für <b>{html.escape(booking.get('service_name', ''))}</b>. Wir melden uns schnellstmöglich mit einem unverbindlichen Angebot – meist innerhalb von 24 Stunden.</p>
    <p>Bei Fragen erreichen Sie uns jederzeit per WhatsApp unter +43 664 101 9869.</p>
    """
    _send(booking["customer_email"], "Wir haben Ihre Anfrage erhalten", _wrap("Anfrage eingegangen", body))


def send_customer_quote_ready(booking: dict) -> None:
    if not booking.get("customer_email"):
        return
    url = f"{_public_base()}/checkout?id={booking.get('id', '')}"
    body = f"""
    <p>Hallo {html.escape(booking.get('customer_name', ''))},</p>
    <p>Ihr persönliches Angebot für <b>{html.escape(booking.get('service_name', ''))}</b> ist bereit:</p>
    <p style="font-size:24px;font-weight:800;color:{BRAND_BLUE};">€{float(booking.get('final_price') or 0):.2f}</p>
    <p>Bestätigen Sie Ihren Termin, indem Sie das Angebot in der App bezahlen.</p>
    """
    _send(booking["customer_email"], f"Ihr Angebot: €{float(booking.get('final_price') or 0):.2f}", _wrap("Angebot bereit", body, cta=("Jetzt bezahlen", url)))


def send_reminder(booking: dict) -> None:
    if not booking.get("customer_email"):
        return
    body = f"""
    <p>Hallo {html.escape(booking.get('customer_name', ''))},</p>
    <p>kurze Erinnerung an Ihren Termin:</p>
    <p style="font-size:18px;font-weight:700;">
      {html.escape(booking.get('service_name', ''))}<br/>
      {_fmt_date(str(booking.get('scheduled_date', '')))} um {html.escape(str(booking.get('scheduled_time', '')))} Uhr
    </p>
    <p>Adresse: {html.escape(booking.get('address', ''))}</p>
    <p>Sollten Sie den Termin verschieben müssen, melden Sie sich bitte so bald wie möglich per WhatsApp unter +43 664 101 9869.</p>
    """
    _send(booking["customer_email"], "Erinnerung an Ihren Termin morgen" if booking.get("scheduled_time", "14:00") < "12:00" else "Erinnerung an Ihren Termin heute", _wrap("Terminerinnerung", body))


def send_feedback_request(booking: dict) -> None:
    if not booking.get("customer_email") or not booking.get("feedback_token"):
        return
    url = f"{_public_base()}/feedback?token={booking['feedback_token']}"
    body = f"""
    <p>Hallo {html.escape(booking.get('customer_name', ''))},</p>
    <p>vielen Dank, dass Sie uns heute vertraut haben. Wir hoffen, Sie sind mit unserer Arbeit zufrieden.</p>
    <p>Dürfen wir Sie um kurzes Feedback bitten? Als Dankeschön schenken wir Ihnen danach einen <b>10&nbsp;%-Gutschein</b> für Ihre nächste Buchung.</p>
    """
    _send(booking["customer_email"], "Wie war Ihr Service? (+10 % Gutschein)", _wrap("Ihr Feedback zählt", body, cta=("Feedback geben", url)))


def send_coupon_email(to: str, name: str, code: str, percent: int, reason: str) -> None:
    pretty = {
        "loyalty": f"als Dankeschön nach mehreren Buchungen",
        "referral": "für Ihre Weiterempfehlung",
        "referral_referred": "für Ihre erste Buchung über eine Empfehlung",
        "feedback": "als Dankeschön für Ihr Feedback",
    }.get(reason, "für Sie")
    body = f"""
    <p>Hallo {html.escape(name or 'liebe Kundin, lieber Kunde')},</p>
    <p>wir schenken Ihnen {pretty} einen Gutschein über <b>{percent}&nbsp;%</b> für Ihre nächste Buchung:</p>
    <p style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;background:#F2F4F7;border:2px dashed {BRAND_BLUE};
                   padding:14px 28px;border-radius:12px;font-size:22px;font-weight:800;color:{BRAND_BLUE};
                   letter-spacing:2px;">{html.escape(code)}</span>
    </p>
    <p>Geben Sie den Code einfach beim Buchen im Feld „Rabattcode" ein. Der Gutschein ist 90 Tage gültig.</p>
    """
    _send(to, f"Ihr {percent} % Gutschein: {code}", _wrap("Ihr neuer Gutschein", body))


def send_password_reset(to: str, name: str, link: str, minutes: int) -> None:
    body = f"""
    <p>Hallo {html.escape(name or '')},</p>
    <p>Sie können Ihr Passwort mit folgendem Link zurücksetzen. Der Link ist {minutes} Minuten gültig und nur einmal verwendbar.</p>
    <p>Wenn Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.</p>
    """
    _send(to, "Passwort zurücksetzen", _wrap("Passwort zurücksetzen", body, cta=("Passwort neu setzen", link)))
