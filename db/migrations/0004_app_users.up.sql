-- 0004 — application user accounts (product/UX upgrade, Phase 1)
-- Introduces the `app` schema: user-facing platform tables, kept separate from
-- `silver` (NYC 311 source data) and `semantic` (M3 embeddings) so the ML layers
-- are never touched by application changes.
--
-- Roles are persisted here and enforced server-side (never trust the frontend).
-- Passwords are stored as argon2 hashes produced by the gateway — never plaintext.

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on email (emails are stored lowercased by the app,
-- but the functional unique index is the real guarantee).
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_lower ON app.users (lower(email));
