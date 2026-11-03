# Cleaning Service Wels — PRD (v3 Multi-Service)

Expo (React Native) + FastAPI + MongoDB app for Dennisse Nava Porras, Wels (Österreich). UI fully in German; user talks Spanish.

## Navigation
- `/` Onboarding (3 slides, shown once; AsyncStorage `onboarded`) → `/home`
- Bottom tabs `(tabs)`: Home · Services · Buchen · Profil + floating WhatsApp button (+43 664 101 9869, hidden on Buchen)
- Stack screens: `/service/[id]`, `/checkout`, `/success`, `/info`, `/faq`, `/privacy`, `/admin/*`

## Services (seed `wels_multiservice_v3_de`)
- Reinigung (hourly): Unterhaltsreinigung €25/h (min 2), Grundreinigung €30/h (min 3), Fensterreinigung €28/h (min 2)
- Quote only (no online payment, status `quote_requested`): Gartenpflege, Winterdienst & Schneeräumung, Dach- & PV-Reinigung
- Admin can edit category, pricing model, rate, min hours, and materials fee (default €10, `/api/admin/settings`).

## Booking (3 steps: Was → Wann → Wo)
- Hours stepper + materials toggle (customer provides vs. we bring +fee), date (21 days) & time 14–19, contact/address prefilled from profile, discount codes (WILLKOMMEN10, MONAT5, FREUNDIN2H, KUEHL40), DSGVO consent.
- Hourly → MOCK Stripe checkout → success. Quote → success "Anfrage gesendet".

## Profile
- Device-based profile (`/api/profile`, X-Device-Id), materials default toggle, booking history, invoices tab, PDF invoice (`/api/bookings/{id}/invoice?device_id=`) for paid bookings with sequential number RE-YYYY-NNNN and company data (Almgasse 12/6, 4600 Wels, UID 54383/3172, Raiffeisenbank IBAN AT94 3445 0000 0213 9451, BIC RZOAT2L450).

## Home
- Time-based greeting with name, auto-sliding promo banner, big CTAs (Buchen, WhatsApp), 4 category tiles, next booking, local SEO text (Reinigungsservice Wels, Schneeräumung Amberg, Winterdienst Gramastetten).

## Branding
Logo colors: blue #1572C4 (deep #0D4F8C), green #8DC63F. Logo at `assets/images/logo.png`.

## Integrations
- Stripe: MOCK (awaiting user keys; EPS-Überweisung desired later)
- Email notification: SendGrid code path (skips if not configured)

## Backlog
- Real Stripe (cards + EPS)
- VAT note on invoices if required
