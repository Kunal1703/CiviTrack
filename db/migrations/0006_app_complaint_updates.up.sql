-- 0006 — complaint activity timeline (status changes, assignments, notes).
-- Every meaningful change to a complaint appends a row here, giving citizens a
-- public status timeline and admins a full internal audit trail.
--
-- visibility distinguishes what a citizen may see ('public') from internal ops
-- notes ('internal'); the gateway filters by role — internal rows are never
-- returned to citizen requests.

CREATE TABLE IF NOT EXISTS app.complaint_updates (
    id           BIGSERIAL PRIMARY KEY,
    complaint_id BIGINT NOT NULL REFERENCES app.complaints(id) ON DELETE CASCADE,
    author_id    BIGINT REFERENCES app.users(id) ON DELETE SET NULL,
    type         TEXT NOT NULL
                     CHECK (type IN ('created', 'status_change', 'assignment', 'note', 'category_override')),
    old_status   TEXT,
    new_status   TEXT,
    note         TEXT,
    visibility   TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_updates_complaint ON app.complaint_updates (complaint_id, created_at);
