# QADR — Technical Specification v3.2

> **v3.2 changes:** access control and route protection (§11.1–11.3), resolved
> borrowing decisions (§10.1), Telegram bot (§22), administration and
> moderation (§23), current implementation status (§24), performance targets
> (§3), schema/API/env additions. v3.1 text is otherwise unchanged.

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
**Logo:** use the provided logo everywhere (header, footer, favicon, auth
pages, loading states). Until `client/public/icons/logo.svg` is supplied, the
provided raster artwork is used (`logo.png` and crops `logo-mark.png`,
`logo-full.png`); swapping to SVG is a one-component change.

### Colors (design tokens only, no hardcoded hex in components)

| Token | Hex | Usage |
|---|---|---|
| forest | `#214E3D` | Primary brand, primary buttons, active states |
| ivory | `#F7F5EF` | Page background |
| charcoal | `#252822` | Main text, dark surfaces |
| sage | `#E6E9DF` | Secondary backgrounds, filters |
| ochre | `#D8A45B` | Small highlights only, never a second primary |
| white | `#FFFFFF` | Cards, modals, forms |
| muted | `#72766F` | Secondary text on white only (4.63:1); fails AA on ivory/sage |
| muted-ink | `#5F635C` | Secondary text on ivory/sage (5.6:1 / 5.0:1) |
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

### Performance
- Targets: CLS 0, no layout shift from late-streamed content, 60fps
  interactions, Lighthouse accessibility/best-practices/SEO 100.
- Lighthouse **performance 90+ (mobile)** is measured with **PageSpeed
  Insights against the deployed site**. Local lab runs on a shared
  development machine are indicative only (~80 is accepted locally).
- Heavy effects (3D hero, pinned scroll story, cursor, tilt, magnetic
  buttons, smooth scroll) load only on capable desktops; phones get no
  animation library and a static hero image.

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
- Visitors always land on `/uz` (no Accept-Language detection). An explicit
  choice in the language switcher is stored in the `QADR_LOCALE` cookie
  (1 year) and used for unprefixed URLs. After login, `users.preferred_locale`
  wins and is updated when the user switches language.
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

Admin: `/admin`, `/admin/reports`, `/admin/reports/[id]`, `/admin/listings`,
`/admin/users`, `/admin/users/[id]`, `/admin/audit-log` (see §23).

Backend enforces authorization regardless of frontend protection.
Route protection rules are defined in §11.1.

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
  phone_verified_at, telegram_id (unique, nullable), telegram_username,
  telegram_linked_at, telegram_blocked_at, telegram_notifications (bool),
  preferred_locale, email_verified_at, is_active, is_admin,
  restricted_until, restriction_reason, banned_at, ban_reason,
  created_at, updated_at. `phone` is unique among verified phones;
  phone numbers are stored in E.164 (`+998…`).
- **email_otps** (all one-time codes) — id, user_id, code_hash, purpose
  (verify/reset), channel (email/telegram), expires_at, attempts,
  consumed_at, created_at
- **refresh_tokens** — id, user_id, token_hash, family_id, expires_at,
  revoked_at, created_at
- **categories** — id, slug, icon, is_active
- **category_translations** — category_id, locale, name, description; unique (category_id, locale)
- **listings** — id, owner_id, category_id, title, description, condition,
  status (`active`, `hidden_by_owner`, `hidden_by_admin`, `removed`),
  borrowing_terms, max_days (1–30), location_area, latitude, longitude,
  moderation_reason, created_at, updated_at. Latitude/longitude are private;
  public responses expose only the area and a rounded distance.
- **listing_images** — id, listing_id, cloudinary_public_id, url, position, created_at
- **saved_items** — user_id, listing_id, created_at; unique (user_id, listing_id)
- **borrow_requests** — id, listing_id, borrower_id, start_date, end_date,
  message, terms_accepted_at, status, created_at, updated_at
- **loans** — id, request_id, listing_id, borrower_id, owner_id, start_date,
  end_date, picked_up_at, returned_at, status, created_at, updated_at
- **conversations** — id, listing_id, created_at, updated_at; one
  conversation per (listing, borrower) pair
- **conversation_participants** — conversation_id, user_id, last_read_at, deleted_at
- **messages** — id, conversation_id, sender_id, body, created_at
- **ratings** — id, loan_id, rater_id, ratee_id, score (1–5), comment,
  created_at; unique (loan_id, rater_id)
- **notifications** — id, user_id, type, payload, read_at, created_at
- **reports** — id, reporter_id, target_type (`user`/`listing`/`message`),
  target_id, listing_id, loan_id (nullable), reason (incl. `not_returned`),
  description, status (`open`, `in_review`, `resolved`, `dismissed`),
  priority (`high` for `not_returned`, else `normal`), assigned_admin_id,
  resolution, resolution_reason, created_at, resolved_at
- **report_notes** — id, report_id, admin_id, body, created_at (internal only)
- **user_warnings** — id, user_id, admin_id, report_id, reason, created_at
- **admin_audit_log** — id, admin_id, action, target_type, target_id,
  report_id, reason, metadata (JSON), ip, user_agent, created_at.
  Append-only: no UPDATE/DELETE grants for the application role.
- **telegram_link_tokens** — id, user_id, token_hash, expires_at,
  consumed_at, created_at
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

### 10.1 Resolved decisions (v3.2)
- **Pending requests may overlap.** Only approved/active loans block dates.
  Approving a request atomically rejects every overlapping pending request
  for that listing (each borrower is notified).
- **Conflict enforcement:** `SELECT … FOR UPDATE` on the listing row plus a
  PostgreSQL exclusion constraint (`btree_gist`) on
  `(listing_id, daterange(start_date, end_date, '[]'))` for loans with
  status `approved` or `active`. A violated constraint returns 409.
- **Listing rules:** `max_days` per listing; `start_date` ≥ today
  (Asia/Tashkent); `end_date` ≥ `start_date`; dates no more than 90 days ahead.
- **Expiry policy:** a pending request expires 48 h after creation or at the
  start of its `start_date`, whichever is first. Expiry never touches loans.
- **Pickup:** the owner marks the item handed over (`approved → active`),
  allowed from `start_date − 1 day`. **Return:** the owner marks it returned
  (`active → returned`). The borrower may also confirm the return; the owner's
  confirmation is final.
- **Overdue** is derived (active and `end_date` < today), not a stored state.
  The owner can report `not_returned` from the day after `end_date`.
- **Cancelling an approved loan** (either side, before pickup) sets
  `cancelled`, frees the dates and notifies the other side.
- **Distance:** shown only when the user has granted browser location. The
  browser's position (rounded to ~1 km) is sent to the API as query
  parameters, used for the request and never stored. Without permission,
  cards and pages show only the area name, with no distance.
- **Phone reveal:** shown only for an approved/active loan between the two
  users, only verified phones, and never in public responses.

### Trust and non-return
- After return, both users rate each other (1–5 + optional comment).
- If not returned after end_date, the owner can report `not_returned`;
  it goes to the admin queue with priority.
- Public profiles show: verified email, completed loans, average rating.
- Admins can warn, restrict or ban accounts (see §23).
- Ratings are allowed only after `returned`, once per side, within 14 days.

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
- **Code delivery channel:** the registration code is always emailed (no
  Telegram link exists yet). Every later one-time code (forgot/reset password,
  future re-verification) goes to the Telegram bot if the account has a linked,
  non-blocked Telegram; otherwise to email. The UI says where the code was sent.
- **Rate limits** (Redis, sliding window, keyed by IP and by account/email):
  login 5/15 min per email + 20/15 min per IP; OTP verify 5 attempts per code;
  OTP resend 1/60 s and 5/hour; forgot-password 3/hour per email; reset
  5/hour; reports 10/day per user; messages 30/min per user; Telegram link
  tokens 5/hour per user. Exceeding returns 429 with `retry_after`.

### 11.1 Access control and route protection
- **Route families** (locale-less paths):
  - *Public:* home, explore, items, categories, public profiles.
  - *Guest-only:* `/login`, `/register`, `/forgot-password`, `/reset-password`.
  - *Verification:* `/verify` (signed-in, unverified account).
  - *Authenticated:* `/dashboard`, `/my-items`, `/items/new`,
    `/items/[id]/edit`, `/requests`, `/borrowings`, `/messages/**`, `/saved`,
    `/notifications`, `/settings`.
  - *Admin:* `/admin/**`.
- **Layer 1, `proxy.ts` (fast redirect):** reads only cookie presence and the
  access token's `exp` (no trust decisions). If an authenticated/admin route
  has no session, it redirects to `/{locale}/login?next=<original path+query>`.
  If the access token is expired but a refresh cookie exists, the proxy calls
  `POST /api/v1/auth/refresh` server-to-server, forwards the rotated cookies
  to the browser and continues. A guest-only route with a valid session
  redirects to the `next` target or `/dashboard`.
- **Layer 2, server layouts (authoritative for the UI):** the `(app)` and
  `(admin)` layouts call `GET /api/v1/auth/me` with the user's cookies (no
  caching). 401 → redirect to login with `next`; unverified → `/verify`;
  banned → logged out with a localized message.
- **Layer 3, backend (authoritative):** every protected endpoint depends on
  `current_user` (valid access token, active, verified, not banned);
  restricted users get 403 `ACCOUNT_RESTRICTED` on write actions; every object
  is checked for ownership/participation. Admin routers depend on
  `require_admin` and return 403 for non-admins.
- **`next` parameter:** accepted only if it is a relative, locale-prefixed path
  (`/uz/...`); `//`, absolute URLs and backslashes are rejected and replaced
  by `/dashboard`. Login, register → verify, and Telegram linking all preserve it.
- **Admin UI:** non-admins hitting `/admin/**` get a 404 (no hint that it
  exists); admin links render only for admins. The backend check is still
  what protects the data.
- **Client fetch wrapper:** on 401, a single shared refresh is attempted, the
  request retried once, and on failure the user is sent to login with `next`.
  Logout revokes the refresh family and clears cookies.

### 11.2 Cookies and CSRF
- Frontend and API are served from **one origin** behind the reverse proxy
  (`/api/*` → FastAPI, `/api/v1/ws` → WebSocket, `/tg/*` → bot webhook).
- `qadr_access` (httpOnly, Secure, SameSite=Lax, path `/`, 15 min) and
  `qadr_refresh` (httpOnly, Secure, SameSite=Lax, path `/`, 30 days,
  rotating with family reuse detection).
- CSRF: double-submit token (`qadr_csrf` readable cookie + `X-CSRF-Token`
  header) required on every state-changing cookie-authenticated request;
  `Origin`/`Referer` must match `FRONTEND_URL`.

### 11.3 Telegram phone linking
After login, users without a verified phone see a dismissible prompt
(dashboard + settings) to link Telegram. Full flow in §22.

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
**Telegram:** POST /telegram/link-token (returns deep link, rate-limited) ·
GET /telegram/status · DELETE /telegram/link (unlink) ·
POST /telegram/webhook (bot service only, secret-token protected)
**Moderation:** POST /reports
**Admin** (`require_admin`, all writes audited): GET /admin/reports (filters:
status, reason, target_type, priority, assignee, date) · GET /admin/reports/{id}
· POST /admin/reports/{id}/notes · POST /admin/reports/{id}/assign ·
POST /admin/reports/{id}/resolve|dismiss (reason required) ·
GET /admin/reports/{id}/conversation (audited view) ·
POST /admin/reports/{id}/contact (in-app + Telegram message to one/both parties) ·
POST /admin/users/{id}/warn|restrict|unrestrict|ban|unban ·
POST /admin/listings/{id}/hide|unhide|remove · GET /admin/users, /admin/users/{id},
/admin/listings · GET /admin/audit-log
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
- Auth: the access cookie is sent with the same-origin upgrade; the server
  validates it and the `Origin` header, re-checks the user on reconnect, and
  closes the socket when the token expires (client refreshes, then reconnects).
- Backoff: 1 s, 2 s, 4 s … capped at 30 s with jitter; REST polling every
  30 s while disconnected; resync unread counts on reconnect.

---

## 14. Celery and Redis

Worker tasks: emails (OTP, notifications), Telegram deliveries (codes and
notifications via the Bot API), return reminders (day before and on
`end_date`), stale-request expiry, outbox dispatch, cleanup of expired OTPs and
link tokens. One Beat scheduler only.

Tasks are idempotent, retried with bounded exponential backoff, with
timeouts and limits. No duplicate emails or notifications. Booking validity
is decided only in PostgreSQL transactions, never in Celery.

---

## 15. Docker

Services: `proxy` (Caddy: HTTPS, same-origin routing, WebSocket),
`frontend`, `api`, `bot` (aiogram), `db`, `redis`, `worker`, `beat`.
`migrate` is a one-off job.
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
account deletion and data retention rules · Telegram bot token and
webhook secret only in env; webhook requests rejected without the
`X-Telegram-Bot-Api-Secret-Token` header · link tokens hashed, single-use,
10 min expiry · admin audit log append-only · admins see conversations only
through a report, read-only, and every view is logged.

**Cookies:** only essential auth/locale cookies in MVP → no consent banner.
Add a banner only if analytics or tracking cookies are introduced.

---

## 17. Testing

**Backend (pytest + HTTPX, real PostgreSQL):** registration + OTP
(correct, wrong, expired, rate-limited), login/refresh rotation/reuse
detection, permissions, listings + images, search, saved items, request
approve/reject/cancel, overlapping and concurrent bookings, pickup/return,
ratings, messaging permissions and deletion, notifications, WebSocket auth
and delivery, Celery idempotency, admin moderation, route protection
(401/403 for every protected endpoint, non-admin on admin endpoints, banned and
restricted users), Telegram linking (expired/reused token, contact.user_id ≠
from.id, phone already linked elsewhere, blocked bot → email fallback),
code delivery channel selection, audit log written for every admin action and
conversation view, overlapping pending requests auto-rejected on approval.

**Route protection E2E:** guest → `/dashboard` redirects to login and back
after login; signed-in user → `/login` redirects to `/dashboard`; non-admin →
`/admin` gets 404; `next` open-redirect attempts are rejected.

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
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_MODE=polling            # polling (dev) | webhook (prod)
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_LINK_TOKEN_TTL_MINUTES=10
NEXT_PUBLIC_SITE_URL=            # public origin for canonical/hreflang (not a secret)
```

Never commit real secrets.

---

## 19. Implementation plan

1. **Foundation + brand:** repo, Next.js + 3 locales, design tokens, fonts,
   logo, motifs, motion system, all main pages designed with mock data,
   verified with screenshots. *(done, pending design approval)*
2. **Backend + docker-compose + auth:** FastAPI app, Postgres, Redis, Alembic,
   compose (proxy, frontend, api, bot, db, redis, worker, beat), email + OTP,
   JWT access/refresh cookies, CSRF, rate limiting, route protection (§11.1),
   Telegram bot linking and code delivery (§22).
3. **User side on real data:** categories, listings with Cloudinary images,
   search, explore, item detail, saved items, owner management; borrowing
   (requests, approval, loans, pickup/return, phone reveal, dashboards);
   messaging + real-time (WebSocket, toasts, badges); ratings, reports,
   profile trust signals; Telegram notifications.
4. **Admin side:** moderation console and audit log (§23).
5. **Async + production:** Celery/Beat hardening, reminders, structured
   logging, backups, deploy, PageSpeed Insights verification.

Commit after every phase with tests, lint, type-check, and build passing.
The phases above replace the original 7-step order (same scope, regrouped).

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
- Protected routes redirect to login and back; guests-only routes redirect
  signed-in users; `/admin` is admin-only in the UI and the API.
- Users can link Telegram via the bot; codes and key notifications arrive
  in Telegram, with email fallback.
- Admins work reports end to end, and every admin action and conversation
  view appears in the audit log.
- Everything works in Uzbek, Russian, and English.
- The design is distinctive, premium, smooth, and consistent on desktop and mobile.
- Core journeys pass automated tests; app runs in Docker.
- No payments in MVP; future payments stay architecturally separate.

## 21. Later (not MVP)

"Looking for" requests (users post what they want to borrow) · phone/SMS OTP ·
deposits and payments · in-app voice calls · map view.

---

## 22. Telegram bot

**Purpose:** verified phone numbers, code delivery and key notifications.
**Stack:** aiogram 3, its own `bot` service in docker-compose, sharing the
server codebase (same models and services, different entrypoint).
Webhook in production (`TELEGRAM_MODE=webhook`), long polling in development.

### Linking flow
1. A signed-in user without a verified phone sees a prompt (dashboard and
   settings, dismissible, shown again after 7 days) to link Telegram.
2. `POST /telegram/link-token` creates a random 32-byte token (stored hashed,
   10 min expiry, single use, max 5 per hour) and returns
   `https://t.me/<TELEGRAM_BOT_USERNAME>?start=<token>`.
3. `/start <token>`: the bot validates the token (exists, unexpired, unused)
   and asks the user to share their contact with a one-tap
   `request_contact` keyboard. Invalid or expired tokens get a localized
   message with a link back to settings.
4. On a contact message the bot checks **`contact.user_id == from.id`** (the
   sender shares their own number). If it doesn't match, it refuses.
5. It normalizes the phone to E.164 and refuses if the phone or `telegram_id`
   is already linked to another account. Otherwise it saves `phone`,
   `phone_verified_at`, `telegram_id`, `telegram_username`,
   `telegram_linked_at`, consumes the token and confirms in the user's language.
6. The web app updates live (WebSocket event + toast); settings shows the
   linked number with an **Unlink** action.

### Delivery
- **Codes:** after linking, forgot/reset (and future) one-time codes are sent
  by the bot; email is the fallback when no Telegram link exists or the bot
  is blocked. Registration codes are always emailed.
- **Notifications:** request received, request approved, return due (day
  before and on the day), item not returned report updates, and moderation
  messages (§23). Users can mute them (`/stop`, settings) without unlinking.
- Sent from Celery via the outbox (idempotent, retried with backoff,
  respecting Telegram rate limits). A 403 from Telegram sets
  `telegram_blocked_at`, and delivery falls back to email until the user
  sends `/start` again.
- Messages use the user's `preferred_locale` (uz/ru/en), with no personal data
  beyond what the message needs (never the counterparty's phone).

### Security
- Bot token and webhook secret only in env; the webhook verifies
  `X-Telegram-Bot-Api-Secret-Token`.
- Bot commands are rate-limited per `telegram_id`; link tokens never appear
  in logs.

---

## 23. Administration and moderation

### Reports list (`/admin/reports`)
- Filters: status, reason (incl. `not_returned`), target type, priority,
  assignee, date range; text search by user email/name or listing title.
- Default sort: `not_returned` (high priority) first, then oldest open.
- Columns: priority, reason, target, reporter, age, status, assignee.

### Report detail (`/admin/reports/[id]`)
- Reporter and target (user and/or listing) with **trust signals for both
  parties**: verified email/phone, completed loans, average rating, account
  age, warnings, restrictions, and **past reports** (as reporter and as target).
- The related **request and loan history** between the two users for this
  listing (dates, status transitions, pickup/return timestamps).
- **Conversation viewer:** only the conversation tied to the reported
  listing between the involved users, read-only. Opening it requires a
  reason and writes an audit-log entry (`view_conversation`).
- **Internal notes** (visible to admins only).
- **Contact parties:** a moderation message to the reporter, the target or
  both, delivered as an in-app notification and via the Telegram bot when linked.

### Actions
Warn user · hide / unhide listing · remove listing · restrict user (until a
date: no new listings, requests or messages) · ban user (sessions revoked,
login blocked, listings hidden) · unrestrict / unban · resolve or dismiss
the report (reason required). Affected users get a localized notification
with the reason.

### Audit log (`/admin/audit-log`)
- Every admin action and every conversation view is recorded: admin, action,
  target, related report, reason, metadata, IP, user agent, time.
- Append-only, filterable by admin, action, target and date. The application
  database role cannot update or delete entries.

### Access
`/admin/**` requires `is_admin` in the UI (404 otherwise) and `require_admin`
on every admin endpoint (403). Admin sessions use the same cookies; admin
actions additionally require a fresh login within the last 12 hours.

---

## 24. Current implementation status (v3.2)

- **Backend:** not started. No API, database, Docker, Celery or bot yet.
- **Frontend:** design pass complete with **static mock data**
  (`client/src/lib/mock`). Every page below is mock-only:
  home, explore (search/filter over mock listings), item detail (calendar,
  request panel), messages list and thread, dashboard, login, register,
  verify, forgot-password, reset-password. Forms validate and simulate
  success; nothing is persisted.
- **Not built yet:** `/items/new`, `/items/[id]/edit`, `/my-items`,
  `/requests`, `/borrowings`, `/saved`, `/notifications`, `/settings`,
  `/categories/[slug]` (category links currently open explore with a filter),
  `/users/[id]`, all `/admin/**` pages, Telegram linking UI.
- **Route protection:** not active yet; mock "signed-in" pages are publicly
  reachable until Phase 2.
