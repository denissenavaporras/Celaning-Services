# PRD – Cleaning Services (Oberösterreich)

## Original Problem Statement
Read /app/memory/product/requirements.md and build it. (German-language website for cleaning, house & garden services; Home, Leistungen, Über uns/Kontakt, footer w/ socials, Impressum/Datenschutz, AI price chatbot, contact form emailed to owner + saved in admin panel.)

## User Choices
- Admin: simple email + password (JWT) login
- Chatbot: Claude Sonnet 5.5 (Emergent universal key), answers in German
- Email: Resend (Emergent-managed) → denissenavaporras@gmail.com
- Impressum/Datenschutz: placeholders

## Architecture
- Backend FastAPI (`server.py`, `email_service.py`, `chat_knowledge.py`), MongoDB collections: users, contacts, chat_messages, login_attempts
- Frontend React: pages Home, Leistungen, Kontakt (Über uns + Form), Impressum, Datenschutz, AdminLogin, AdminDashboard; ChatWidget (SSE streaming)

## Implemented (2026-09)
- All pages with verbatim German content, generated imagery, white/green/blue design
- Contact form → saved in DB + email to owner (verified 202)
- AI chatbot w/ persistent session history, price knowledge base
- Admin panel: login, list, status (Neu/In Bearbeitung/Erledigt), filter, delete; brute-force lockout (X-Forwarded-For)

## Backlog
- P1: Real Instagram/Facebook URLs, real Impressum/Datenschutz data
- P2: Admin password change, cookie consent banner, SEO meta tags, multi-language (ES/EN)
