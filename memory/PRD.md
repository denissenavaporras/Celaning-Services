# Cleaning Service Wels — PRD

Mobile + Web app (Expo React Native) for Dennisse Nava Porras — Reinigungs- + Kinderbetreuungsservice in Wels, Österreich.

## Users
- **Customer**: no login (device_id via AsyncStorage). Language: German.
- **Admin (Dennisse)**: single account `admin@limpia.com / admin123`, JWT-authenticated.

## Availability
- Mo–So · 14:00–19:00 Uhr (letzte Buchung 19:00). Reflected on Home hero, /book banner + time slots (`["14:00","15:00","16:00","17:00","18:00","19:00"]`), /info badge + Verfügbarkeit section.

## Services (seeded in EUR, German)
- Basis-Paket €66 (3 Std.)
- Familien-Paket €112,50 (4–5 Std.)
- Premium-Paket €120 (5 Std./Tag)
- VIP-Monatspaket €2.000 (20 Std./Woche)

## Flows
1. Customer: Home → Book (pack, day, time, name/phone/address) → Checkout (MOCK Stripe card form) → Success + Route (Apple/Google Maps deep-link) → My-Bookings.
2. Admin: /admin/login → Terminkalender (stats Heute/Gesamt/Umsatz, day strip, list) → Booking modal (Route in Maps, Bestätigen → Starten → Abschließen, Stornieren) → Services CRUD (/admin/services).
3. Landing/Info (/info): Über mich, Angebot (Reinigung + Kinderbetreuung), Verfügbarkeit, 4 Pakete, 4 Angebote mit Codes (**WILLKOMMEN10, KUEHL40, FREUNDIN2H, MONAT5**), Zahlungsmethoden, Servicegebiet (Wels + Gemeinden), Kundenbewertungen, Vertrauen & Sicherheit, Kontakt (WhatsApp +43 664 101 9869, denissenavaporras@gmail.com).

## Backend
- FastAPI + MongoDB. All routes under `/api`. JWT (pyjwt) + bcrypt for admin.
- Endpoints: services (public GET, admin CRUD), bookings (public create/get/list-by-device, MOCK pay), admin (login, bookings query, stats, status update).

## Integrations
- Stripe: **MOCKED** — accepts `4242…` (success) / `4000…0002` (declined). Real Stripe swap: replace `POST /api/bookings/{id}/pay` with PaymentIntent + Stripe Elements/PaymentSheet.
- Maps: `Linking` deep-link (Apple Maps / geo: / Google Maps fallback).
- Auth: JWT admin only. Customer uses AsyncStorage device_id.

## Design
`/app/design_guidelines.json` — iOS-Native Clean, Sage/Moss green palette. Generous spacing, sticky bottom CTAs, Ionicons.

## Localization
Full German UI (screens, seeded data, dates `toLocaleDateString("de-DE", …)`).

## Non-goals (MVP)
- Push notifications
- Real Stripe integration
- Discount code redemption logic (codes are displayed as marketing badges only)
- Google-Maps embedded map (uses deep-link)
