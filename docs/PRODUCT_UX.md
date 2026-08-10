# CiviTrack AI — Product & UX Architecture (role-based platform)

> This document describes the **product/UX/application layer** built on top of the
> completed ML milestones **M0–M3**. It does **not** change or restate the ML work
> (see `PROJECT_CONTEXT.md`, `M1_DESIGN.md`, `M3_DESIGN.md`, `M3_REPORT.md`). It is
> **not** M4 — no new ML, no resolution-time prediction.
>
> CiviTrack AI is now a **two-sided civic platform** with two fundamentally
> different users — **citizens** (people reporting problems) and **admins /
> municipal officials** (an operations team) — plus a public marketing landing and
> a developer showcase.

---

## 1. Role model & authentication

- **Roles:** `citizen` and `admin`, persisted in PostgreSQL (`app.users.role`) and
  enforced **server-side** on every protected endpoint. The frontend never sets or
  is trusted for a role.
- **Passwords:** hashed with **argon2** (`argon2-cffi`). Plaintext is never stored
  or logged.
- **Sessions:** **JWT** access + refresh tokens delivered as **httpOnly cookies**
  (`ct_access`, `ct_refresh`) — JavaScript cannot read them (XSS token-theft
  mitigation). Signed with `JWT_SECRET` (HS256).
- **Admin provisioning:** registration always creates a `citizen` unless a correct
  `ADMIN_SIGNUP_CODE` invite code is supplied (constant-time compared). Self-service
  admin signup is disabled when the code is empty.
- **Authorization is layered:**
  - **Authority — the gateway.** `core/deps.py::get_current_user` resolves the user
    from the access cookie; `require_admin` gates admin routes; complaint reads are
    ownership-scoped (a citizen only ever receives their own complaints; cross-user
    reads return **404**, admin-only mutations return **403**).
  - **Convenience — the frontend.** `frontend/proxy.ts` (Next.js 16's renamed
    "middleware") decodes the cookie to redirect the browser sensibly (logged-out →
    `/login?next=…`; wrong role → its own home). It does **not** verify the
    signature — it is UX only; the gateway is the real guard.

**Auth endpoints:** `POST /api/v1/auth/register|login|refresh|logout`, `GET /api/v1/auth/me`.

---

## 2. Information architecture

| Audience | Routes | Language |
|---|---|---|
| **Public** | `/` (landing), `/architecture` (developer showcase), `/login`, `/register` | Civic + (on /architecture only) engineering |
| **Citizen** | `/citizen` (home), `/citizen/report`, `/citizen/reports`, `/citizen/reports/[id]`, `/citizen/nearby` | Friendly, human |
| **Admin** | `/admin` (overview), `/admin/issues`, `/admin/issues/[id]`, `/admin/map`, `/admin/analytics` | Operational |

- The navbar and ⌘K command palette are **role-aware** (citizens never see admin
  navigation and vice-versa).
- **Retired routes** (old mock pages) now redirect: `/report → /citizen/report`,
  `/issues → /`, `/dashboard → /`.
- **Engineering language** (Next.js / FastAPI / DistilBERT / pgvector / PostGIS…)
  appears **only** on `/architecture`. Citizen and admin surfaces never show model
  names, infrastructure, or DB concepts.

---

## 3. Database changes (app schema)

New tables live in a dedicated **`app`** schema, kept separate from `silver` (NYC
311 ML corpus) and `semantic` (M3 embeddings). Added via numbered reversible SQL
migrations `0004`–`0007` (run by `db/migrate.py`; **no Alembic**):

- `app.users` — id, email (case-insensitive unique), `password_hash` (argon2),
  `full_name`, `role`, timestamps.
- `app.complaints` — `public_ref` (CT-000001…), `reporter_id`, title, description,
  `category` + `category_confidence` + `category_overridden`, `status`
  (new/triaged/in_progress/resolved/rejected), `priority`, `department_id`,
  `assignee_id`, lat/lng, **`geom` (PostGIS Point)**, `address_text`, **`source`**
  (`web` | `seed_delhi_demo`), **`is_demo`**, timestamps, `closed_at`.
- `app.complaint_updates` — activity timeline; `type`, `old_status`/`new_status`,
  `note`, **`visibility`** (`public` | `internal`). Internal rows are never returned
  to citizen requests.
- `app.departments` — municipal departments (seeded), FK'd from complaints.

Complaint identity (`reporter_id`) is always derived from the session — the client
cannot spoof it.

---

## 4. Delhi demo data vs. NYC 311 (data integrity)

**The single most important honesty rule.** The ML models are trained and evaluated
on **real NYC 311 open data** (`silver.complaints_311`). The product experience is
Delhi-based, so the complaints shown in the app are a **clearly-labeled seeded demo
dataset** — never NYC records relabeled as Delhi.

- Seed: `db/seed_delhi_demo.py` inserts ~46 Delhi complaints across 15 neighbourhoods
  with `source='seed_delhi_demo'`, `is_demo=true`, natural citizen-phrased text,
  varied status/priority/timestamps, and clustered coordinates. It is **idempotent**.
- The UI labels this data **"Demo Delhi data"** wherever it appears.
- **Swap seam:** a real Delhi open dataset can later be loaded into `app.complaints`
  (with its own `source`) and embedded via the same pipeline — no code changes.

### Semantic dataset boundary (M3 reuse, not rebuild)

The M3 engine serves two corpora, selected by a `dataset` parameter and kept
strictly separate inside the **same** `semantic.complaint_embeddings` table:

| Corpus | `embedding_version` | `data_version` | Joined to |
|---|---|---|---|
| NYC (research) | `v1` | `b6d58293…` | `silver.complaints_311` |
| Delhi (product) | `delhi-v1` | `delhi_demo` | `app.complaints` |

Because the NYC path filters on `v1`, it never sees Delhi rows, and vice-versa —
verified in both directions. Citizen duplicate/related checks always pass
`dataset='delhi'`; the NYC research path is untouched. New citizen submissions are
embedded into the Delhi index on write (best-effort, off the response path).
`ml_service` gained `POST /semantic/embed` (internal utility) for seeding /
embed-on-create; the public duplicate-check softens the hard spatial gate for the
Delhi product path (ranks by similarity, shows distance) while NYC keeps M3's exact
evaluated behaviour.

---

## 5. Map & hotspot logic

- **Delhi is the map home** — center `[28.6139, 77.209]` (never Bangalore).
- **Category-aware markers:** each complaint renders a coloured pin with a
  recognizable glyph per category (💡 street light, 🗑️ sanitation, 💧 water, 🛣️
  road, …), coloured from the shared `lib/categories.ts` system.
- **Data-driven hotspots:** complaint coordinates are aggregated into ~1.1 km grid
  cells; each cell is coloured by count — **1–2 yellow, 3–4 orange, 5+ red**. This
  is computed from the data, not hard-coded around named landmarks.
- The community map endpoint (`GET /api/v1/complaints/map`) returns **non-PII**
  points only (no reporter identity) — it is a shared community view, distinct from
  a citizen's private "my reports".

---

## 6. APIs added (application layer)

- **Auth:** `/api/v1/auth/register|login|refresh|logout|me`
- **Complaints:** `POST/GET /api/v1/complaints`, `GET/PATCH /api/v1/complaints/{id}`,
  `GET/POST /api/v1/complaints/{id}/updates`, `GET /api/v1/complaints/map`,
  `GET /api/v1/departments`
- **Admin (require_admin):** `GET /api/v1/admin/stats` (distributions, open /
  high-priority / today counts, avg resolution hours, a PostGIS potential-duplicate
  heuristic, 30-day volume), `GET /api/v1/admin/assignees`
- **Semantic:** existing `/api/v1/semantic/{search,related,duplicate-check}` gained
  an optional `dataset` field (default `nyc`, backward-compatible)

All admin analytics are **descriptive from real data** — no ML predictions.

---

## 7. UI/UX & animation strategy

- **Design system reuse:** builds on the M2 kit (glassmorphism, gradients, premium
  shadows, `ui-kit.tsx`, `lib/motion.ts`, Framer Motion, next-themes). Citizen
  surfaces are friendly and visual; admin surfaces are dense and operational; both
  stay one coherent system.
- **Scrollytelling:** the public landing tells a six-part story (report → AI
  understands → routed → cities see patterns → actionable) via viewport-triggered
  reveals, a self-cycling pipeline demo, and staggered content. Motion communicates
  hierarchy/state, not decoration.
- **2D canvas (not WebGL):** `CivicCanvas` is a lightweight 2D "civic network" hero
  (glowing nodes, connections, hotspot pulses, cursor parallax). It pauses when
  offscreen (IntersectionObserver), caps DPR/node count, and renders a single static
  frame under reduced motion. A deliberate choice over heavy three.js/WebGL.
- **Microinteractions (restrained):** spring nav pill, hover-lift cards, animated
  status timeline, similarity bars, one magnetic hero CTA. All gated by
  `prefers-reduced-motion` (global `MotionConfig reducedMotion="user"` + explicit
  `useReducedMotion`/`matchMedia` guards).
- **Accessibility:** skip-to-content link + `<main>` landmark, focus-visible rings
  on custom controls, keyboard-navigable admin queue rows, ARIA-labelled map and
  toggles, semantic headings, reduced-motion honoured.
- **Performance:** Next.js route-based code-splitting; Leaflet is runtime-imported
  and maps render fixed-height placeholders (no layout shift); Recharts is
  dynamically imported on the analytics route; the canvas is capped and
  offscreen-paused. No unnecessary dependencies (no three.js, no react-query — the
  existing stack is reused).

---

## 8. What this layer deliberately does NOT do

- No resolution-time **prediction** anywhere (that is a planned M4; not claimed).
- No fabricated statistics, no fake ML metrics, no NYC data relabeled as Delhi.
- No internal admin notes exposed to citizens; no PII in the community map, URLs,
  or logs; no secrets/JWTs/hashes exposed to the frontend.
