# LimpiaHogar — Product Requirements Document

## Overview
Mobile app (Expo React Native) for a house cleaning business. Customers schedule and pay online (before service). Owner/staff sees all bookings in an admin panel with route/map integration.

## Users
- **Customer**: no login. Uses device_id (AsyncStorage) to track their own bookings.
- **Admin**: single seeded account (`admin@limpia.com` / `admin123`), JWT-authenticated.

## Core Flows
1. **Customer books**
   - Selects service (horizontal cards)
   - Picks date (next 14 days) & time slot
   - Enters name, phone, full address, optional notes
   - Continues to Checkout
2. **Payment (MOCK)** — simulates Stripe checkout with card form. Validates card, holder, expiry, CVC. Marks booking as `paid`.
3. **Confirmation** — shows booking details + "Ver ruta en mapas" (opens Apple/Google Maps via deep-link with address).
4. **My bookings** — list of the customer's bookings by device_id. Shows status; pending payments can be resumed.
5. **Admin login** — email/password → JWT stored in SecureStore.
6. **Admin agenda** — daily strip + list, or "Ver todas". Stats: today, total, revenue. Each card: name, phone, service, time, address, status. Actions: Ver ruta, Llamar, Confirm → In progress → Complete, Cancel.
7. **Admin services management** — CRUD on services (name, description, price, duration, image, active).

## Data model (MongoDB)
- `services`: id, name, description, price, duration_minutes, image_url, active, created_at
- `bookings`: id, device_id, customer_name, customer_phone, service_id, service_name, service_price, address, scheduled_date, scheduled_time, notes, status (`pending_payment`/`paid`/`confirmed`/`in_progress`/`completed`/`cancelled`), payment_ref, paid_at, created_at
- `admins`: email, password_hash (bcrypt), created_at

## API (all under `/api`)
Public: `GET /services`, `POST /bookings`, `POST /bookings/{id}/pay`, `GET /bookings/{id}`, `GET /bookings/customer/{device_id}`
Admin (Bearer JWT): `POST /admin/login`, `GET /admin/bookings?date=&status=`, `GET /admin/stats`, `PATCH /admin/bookings/{id}/status`, `GET/POST /admin/services`, `PATCH/DELETE /admin/services/{id}`

## Integrations
- **Stripe**: MOCKED for demo (no real Stripe SDK / native module). Card form validates locally; backend accepts and marks booking as paid. To go live: swap `/bookings/{id}/pay` to Stripe PaymentIntent + Stripe Elements/PaymentSheet.
- **Maps**: `Linking` deep link — iOS Apple Maps (`maps.apple.com`), Android `geo:`, web fallback Google Maps search.
- **Auth**: JWT (pyjwt) with bcrypt passwords for admin only.

## Design
Based on `/app/design_guidelines.json` — "iOS-Native Clean" personality, Sage/Moss green palette, generous spacing, sticky bottom CTAs, glass-free surfaces, Ionicons.

## Non-goals (MVP)
- Push notifications
- Real payment integration
- Google-Maps embedded map (uses deep-linking instead)
- Multi-language (Spanish only)
