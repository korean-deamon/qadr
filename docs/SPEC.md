# QADR — Technical Specification v3.1

**Product:** Qadr — neighborhood borrowing and item-sharing marketplace
**Market:** Uzbekistan · **Languages:** Uzbek (Latin, default), Russian, English
**MVP payments:** none (free borrowing) · **Target:** working MVP fast, then hardening

---

## 1. Product vision

Qadr helps people find, lend, and borrow useful everyday items nearby instead
of buying things they rarely use: tools, books, sports and camping gear,
kitchen appliances, photo equipment.

Principles:
- Useful things accessible without everyone owning everything.
- Trust through clear profiles, transparent requests, ratings, return tracking.
- Nearby discovery and a simple borrowing flow.
- A premium, distinctive visual identity — never a generic marketplace or AI template.
- Ship a working MVP without unnecessary infrastructure.
- Architecture ready for future paid rentals, without payments in the MVP.

Roles: **Borrower**, **Owner**, **Administrator**. A user can be borrower and owner.

---

## 2. Brand identity

**Name:** Qadr (Uzbek: value, worth, appreciation).
**Tagline (uz):** "Har narsaning qadri bor." · **English:** Good things are worth sharing.
**Personality:** premium, trustworthy, modern, community-oriented, distinctly Uzbek.
**Logo:** use the provided logo at `client/public/icons/logo.svg` everywhere
(header, footer, favicon, auth pages, loading states).

### Colors (design tokens only, no hardcoded hex in components)

| Token | Hex | Usage |
|---|---|---|
| forest | `#214E3D` | Primary brand, primary buttons, active states |
| ivory | `#F7F5EF` | Page background |
| charcoal | `#252822` | Main text, dark surfaces |
| sage | `#E6E9DF` | Secondary backgrounds, filters |
| ochre | `#D8A45B` | Small highlights only, never a second primary |
| white | `#FFFFFF` | Cards, modals, forms |
| muted | `#72766F` | Secondary text (only where WCAG AA passes) |
| border | `#D8DDD3` | Borders, separators |

All text must meet WCAG AA contrast.

### Typography

- Headings: a distinctive editorial display font (NOT Manrope, NOT a default
  SaaS font). Must support Latin, Cyrillic, and the Uzbek ʻ (U+02BB) used in
  oʻ and gʻ. Verify glyphs before choosing.
- Interface text: Inter or an equally readable font with the same glyph support.
- Clear type scale: display, page title, section, body, caption, metadata.

---

## 3. Design direction (highest priority)

The site must feel like a premium editorial lifestyle brand with a subtle,
modern Uzbek soul. It must not look like a generic SaaS dashboard, a classifieds
clone, or an AI-generated template.

### Visual concept
- Editorial layouts, generous whitespace, deliberate alignment.
- Large authentic item photography; asymmetric layouts used selectively.
- Geometric motifs inspired by girih and ganch patterns; arch shapes inspired
  by Registan portals; warm accents inspired by suzani colors.
  Subtle and contemporary — never folkloric or kitsch.
- Rounded cards with consistent radii, fine borders, restrained shadows.
- Decorative shapes as lightweight CSS/SVG: in hero, promo sections, empty
  states, occasional category headers. Never on every card. Never covering
  text, controls, or mobile navigation.

### Motion
- Smooth scrolling (Lenis) and scroll-reveal animations (Motion).
- Subtle parallax on hero imagery, refined hover states, smooth page transitions.
- 60fps, no layout shift, respect `prefers-reduced-motion`.

### Components
- Foundation: Tailwind CSS + customized shadcn/ui.
- Use the 21st.dev MCP to find hero sections, navigation, search, item cards,
  galleries, filters, empty states. Review dependencies, then restyle fully
  to Qadr tokens. Never ship default component styling.
- Result must be one coherent design system, not a collection of unrelated parts.

### Mobile
- Below the `md` breakpoint: fixed app-style bottom navigation
  (Home, Explore, Add, Messages, Profile) with unread badges and safe-area
  insets. It never scrolls away and content never hides behind it.

### Design verification
- Check every page with Playwright screenshots at 1440px and 390px.
- Acceptance: home, explore, item detail, messages, and dashboard feel like
  parts of one intentional premium brand.

---

## 4. Multilingual

Locales: `uz` (default), `ru`, `en`. Routes: `/uz`, `/uz/explore`, `/ru/items/[id]`, etc.

- `next-intl` with typed dictionaries split by domain: common, navigation,
  home, explore, listings, borrowing, messages, dashboard, auth,
  notifications, validation, errors.
- Translate everything: buttons, forms, validation, statuses, empty states,
  tooltips, aria labels, emails, SEO metadata.
- Locale preserved across navigation and auth; stored on profile when
  logged in, cookie for visitors.
- Locale-aware date/number formatting.
- Never show raw translation keys; detect missing keys in development.
- User-generated content stays in its author's language (no auto-translation).
- API returns stable error codes; frontend maps them to localized messages.
- Category names stored in a `category_translations` table.

---

## 5. Technology stack

**Frontend:** Next.js (App Router), TypeScript strict, Tailwind, shadcn/ui,
next-intl, React Hook Form + Zod, TanStack Query where useful, Lenis, Motion,
Vitest + React Testing Library, Playwright. Server Components by default.

**Backend:** Python, FastAPI, Pydantic v2, SQLAlchemy 2 (async), PostgreSQL,
Alembic, `uv` only, pytest + HTTPX, Argon2id, Celery, Redis, WebSockets.

**Media:** Cloudinary (signed uploads, automatic format/quality, responsive sizes).

**Infra:** Docker + Compose, Postgres with persistent volume, Redis, one
Celery worker, one Celery Beat, HTTPS, structured logs, health checks.
No Kubernetes, Kafka, or microservices. Pin and test dependency versions.

---

## 6. Frontend routes

Public: `/{locale}`, `/explore`, `/items/[id]`, `/categories/[slug]`,
`/users/[id]` (public profile), `/login`, `/register`, `/verify` (OTP),
`/forgot-password`, `/reset-password`.

Authenticated: `/dashboard`, `/my-items`, `/items/new`, `/items/[id]/edit`,
`/requests`, `/borrowings`, `/messages`, `/messages/[conversationId]`,
`/saved`, `/notifications`, `/settings`.

Admin: `/admin/reports`, `/admin/listings`, `/admin/users`.

Backend enforces authorization regardless of frontend protection.

---

## 7. Frontend structure

```text
client/
├── public/ (images/, icons/logo.svg)
├── messages/ (uz.json, ru.json, en.json)
└── src/
    ├── app/[locale]/
    ├── components/ (ui/, layout/, branding/, navigation/, listings/,
    │                borrowing/, messages/, notifications/)
    ├── features/ (auth/, listings/, requests/, loans/, messages/,
    │              saved/, ratings/, profile/)
    ├── lib/ (api/, i18n/, realtime/, validation/, utils/)
    ├── hooks/ · styles/ · types/
```

Reusable components: logo, decorative motifs, locale switcher, listing card,
status badge, image uploader, date selector, request form, chat thread,
notification indicator, toast system, bottom nav.

---

## 8. Backend architecture

Modular monolith (one FastAPI app). Modules: auth, users, categories,
listings, borrowing, loans, messages, saved, ratings, notifications,
moderation. Plus `realtime/` (websocket, event bus) and `tasks/` (Celery).

Each module owns its schemas, models, service logic, and routes.
Keep validation, authorization, business rules, and transactions explicit.

---

## 9. Database

PostgreSQL is the source of truth. UUID keys, timezone-aware timestamps,
foreign keys, constraints, Alembic migrations.

- **users** — id, email, password_hash, display_name, avatar_url, phone,
  preferred_locale, email_verified_at, is_active, is_admin, created_at, updated_at
- **email_otps** — id, user_id, code_hash, purpose (verify/reset), expires_at,
  attempts, consumed_at, created_at
- **refresh_tokens** — id, user_id, token_hash, family_id, expires_at,
  revoked_at, created_at
- **categories** — id, slug, icon, is_active
- **category_translations** — category_id, locale, name, description; unique (category_id, locale)
- **listings** — id, owner_id, category_id, title, description, condition,
  status, borrowing_terms, location_area, latitude, longitude, created_at, updated_at
- **listing_images** — id, listing_id, cloudinary_public_id, url, position, created_at
- **saved_items** — user_id, listing_id, created_at; unique (user_id, listing_id)
- **borrow_requests** — id, listing_id, borrower_id, start_date, end_date,
  message, terms_accepted_at, status, created_at, updated_at
- **loans** — id, request_id, listing_id, borrower_id, owner_id, start_date,
  end_date, picked_up_at, returned_at, status, created_at, updated_at
- **conversations** — id, listing_id, created_at, updated_at
- **conversation_participants** — conversation_id, user_id, last_read_at, deleted_at
- **messages** — id, conversation_id, sender_id, body, created_at
- **ratings** — id, loan_id, rater_id, ratee_id, score (1–5), comment,
  created_at; unique (loan_id, rater_id)
- **notifications** — id, user_id, type, payload, read_at, created_at
- **reports** — id, reporter_id, target_type, target_id, reason
  (incl. `not_returned`), description, status, created_at, resolved_at
- **task_outbox** — id, event_type, payload, created_at, processed_at, attempts

Future payments stay in separate tables, introduced only when a provider is chosen.
Never store card details.

---

## 10. Borrowing workflow

Request states: `pending`, `approved`, `rejected`, `cancelled`, `expired`.
Loan states: `approved`, `active`, `returned`, `cancelled`.

Rules:
1. Users cannot borrow their own items.
2. Only the owner approves/rejects; borrower can cancel own pending request.
3. Borrower must accept the listing's borrowing terms (checkbox) to submit.
4. Dates must be valid and follow listing rules.
5. No conflicting approved/active bookings.
6. Approval creates the loan atomically; status updates automatically.
7. Pickup and return are authorized and validated.
8. Every meaningful transition creates a persisted notification.
9. Stale requests expire by an explicit policy, never cancelling valid bookings.
10. Invalid or repeated transitions return 409.
11. Items with an active loan are hidden from explore (owner still sees them).
12. Owners can delete a listing unless it has an approved/active loan.
13. After approval, both sides see each other's phone number with a `tel:` button.

**Overlap (inclusive dates):**
`existing.start_date <= requested.end_date AND existing.end_date >= requested.start_date`

Availability check + write in one transaction with row locking
(`SELECT … FOR UPDATE`) and/or a PostgreSQL exclusion constraint.
The database is the final authority.

### Trust and non-return
- After return, both users rate each other (1–5 + optional comment).
- If not returned after end_date, the owner can report `not_returned`;
  it goes to the admin queue with priority.
- Public profiles show: verified email, completed loans, average rating.
- Admins can restrict accounts.

---

## 11. Authentication

- Register with email + password → 6-digit email OTP (10 min expiry,
  max 5 attempts, 60s resend cooldown). Account usable only after verification.
- Wrong OTP → localized "incorrect code, try again".
- Rate-limit login, OTP verify/resend, forgot/reset password → HTTP 429 with
  localized "too many requests, try again in N seconds".
- JWT access token (15 min) + rotating refresh token (30 days), both in
  httpOnly, Secure, SameSite=Lax cookies. Refresh reuse detection revokes
  the whole token family.
- CSRF protection for cookie-authenticated state-changing requests.
- Forgot password uses an email OTP / reset token.
- Phone/SMS OTP is out of MVP scope; model is ready for it.

---

## 12. REST API (`/api/v1`)

**Auth:** POST register, verify-email, resend-otp, login, logout, refresh,
forgot-password, reset-password · GET me
**Users:** GET/PATCH /users/me · GET /users/{id} (public profile + trust signals)
**Categories:** GET /categories
**Listings:** GET/POST /listings · GET/PATCH/DELETE /listings/{id} ·
GET /listings/{id}/availability · POST /listings/{id}/images (Cloudinary
signature) · DELETE /listings/{id}/images/{image_id}
**Saved:** GET /saved · POST/DELETE /listings/{id}/save
**Requests:** POST /listings/{id}/requests · GET /requests/incoming|outgoing ·
GET /requests/{id} · POST /requests/{id}/approve|reject|cancel
**Loans:** GET /loans · GET /loans/{id} · POST /loans/{id}/pickup|return
**Ratings:** POST /loans/{id}/rating
**Messages:** GET/POST /conversations · GET /conversations/{id}/messages ·
POST /conversations/{id}/messages · POST /conversations/{id}/read ·
DELETE /conversations/{id} (hides for the current user only)
**Notifications:** GET /notifications · POST /notifications/{id}/read · POST /notifications/read-all
**Moderation:** POST /reports · admin report, listing, user endpoints
**Ops:** GET /health · GET /ready

Listing search supports pagination, text search, category, location, sorting.
Never expose private pickup addresses publicly.

---

## 13. Real-time

- Authenticated WebSocket at `/api/v1/ws` (validate origin, never trust
  client-sent user IDs).
- Events: new message, new notification, request status change,
  new/deleted listing.
- Persist to PostgreSQL first, then publish via Redis Pub/Sub so multiple
  API instances can deliver.
- Client: toast on new events, instant UI update without refresh,
  reconnect with bounded backoff, fall back to REST polling when disconnected.
- WebSocket messages are notifications, not authoritative state; history
  always loads from REST.

---

## 14. Celery and Redis

Worker tasks: emails (OTP, notifications), return reminders, stale-request
expiry, outbox dispatch, cleanup. One Beat scheduler only.

Tasks are idempotent, retried with bounded exponential backoff, with
timeouts and limits. No duplicate emails or notifications. Booking validity
is decided only in PostgreSQL transactions, never in Celery.

---

## 15. Docker

Services: `frontend`, `api`, `db`, `redis`, `worker`, `beat`.
Named volume for Postgres, health checks for db/redis, env-based config,
separate dev/prod settings, migrations as an explicit one-off step,
production-optimized Dockerfiles with lockfiles and no secrets in images,
WebSocket-compatible proxy config.

---

## 16. Security and privacy

Argon2id · normalized unique emails · httpOnly secure cookies · CSRF ·
explicit CORS origins · rate limiting on auth/OTP/reports/messages ·
object-level permission checks everywhere · validated image uploads via
signed Cloudinary uploads · no private addresses in public data ·
authenticated WebSockets · secrets only in env (never `NEXT_PUBLIC_`) ·
HTTPS · backups with tested restore · admin action log ·
account deletion and data retention rules.

**Cookies:** only essential auth/locale cookies in MVP → no consent banner.
Add a banner only if analytics or tracking cookies are introduced.

---

## 17. Testing

**Backend (pytest + HTTPX, real PostgreSQL):** registration + OTP
(correct, wrong, expired, rate-limited), login/refresh rotation/reuse
detection, permissions, listings + images, search, saved items, request
approve/reject/cancel, overlapping and concurrent bookings, pickup/return,
ratings, messaging permissions and deletion, notifications, WebSocket auth
and delivery, Celery idempotency, admin moderation.

**Frontend (Vitest + RTL):** forms and validation, cards and filters,
locale switching and dictionary parity, statuses, loading/empty/error states,
accessibility.

**E2E (Playwright):** two users — register + OTP, create listing with image,
discover, message owner, request, approve, see loan + phone on both sides,
pickup, return, rate each other, verify notifications/toasts appear live
without refresh, overlapping booking rejected. Repeat key flows in uz/ru/en,
desktop 1440px and mobile 390px.

---

## 18. Environment (`.env.example`)

```dotenv
APP_ENV=development
APP_NAME=Qadr
API_V1_PREFIX=/api/v1
DATABASE_URL=
SECRET_KEY=
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=30
FRONTEND_URL=
CORS_ORIGINS=
REDIS_URL=
CELERY_BROKER_URL=
COOKIE_SECURE=false
COOKIE_DOMAIN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
DEFAULT_LOCALE=uz
SUPPORTED_LOCALES=uz,ru,en
```

Never commit real secrets.

---

## 19. Implementation plan

1. **Foundation + brand:** repo, Docker, Next.js + 3 locales, design tokens,
   fonts, logo, motifs, motion system, 21st.dev components. Homepage first,
   verified with screenshots.
2. **Auth:** email + OTP, JWT access/refresh cookies, rate limiting.
3. **Marketplace:** categories, listings with Cloudinary images, search,
   explore, item detail, saved items, owner management.
4. **Borrowing:** requests with terms, approval, loans, pickup/return,
   phone reveal, dashboards.
5. **Messaging + real-time:** conversations, WebSocket, toasts, bottom nav badges.
6. **Trust:** ratings, not-returned reports, profile trust signals, admin.
7. **Async + production:** Celery, Beat, emails, reminders, logging, deploy.

Commit after every phase with tests, lint, type-check, and build passing.

---

## 20. Definition of done

- Register with email OTP, log in, refresh sessions securely; rate limits work.
- Owners create, edit, delete listings with Cloudinary images.
- Borrowers search, save, message owners, and request items.
- Requests follow the rules; conflicting bookings blocked at the DB level.
- Approved users see each other's phone; pickup, return, and ratings work.
- Borrowed items hidden from explore.
- Messages, notifications, and status changes appear live with toasts.
- Fixed bottom navigation on mobile.
- Everything works in Uzbek, Russian, and English.
- The design is distinctive, premium, smooth, and consistent on desktop and mobile.
- Core journeys pass automated tests; app runs in Docker.
- No payments in MVP; future payments stay architecturally separate.

## 21. Later (not MVP)

"Looking for" requests (users post what they want to borrow) · phone/SMS OTP ·
deposits and payments · in-app voice calls · map view.
