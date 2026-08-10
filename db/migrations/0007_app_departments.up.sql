-- 0007 — municipal departments (for admin routing/assignment) + FK from complaints.
-- Assignment of a complaint is modelled as columns on app.complaints
-- (department_id, assignee_id) rather than a separate assignments table — a
-- complaint has at most one owning department/assignee at a time, so extra join
-- tables would be over-engineering at this scale.

CREATE TABLE IF NOT EXISTS app.departments (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    slug       TEXT NOT NULL UNIQUE,
    contact    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Wire the complaints.department_id column (created in 0005) to departments.
ALTER TABLE app.complaints
    ADD CONSTRAINT fk_complaints_department
    FOREIGN KEY (department_id) REFERENCES app.departments(id) ON DELETE SET NULL;

-- Seed a small, city-agnostic set of municipal departments so the admin queue has
-- something to route to out of the box. Names are generic (work for a Delhi demo
-- and any city); a real deployment can edit these.
INSERT INTO app.departments (name, slug, contact) VALUES
    ('Public Works Department',        'pwd',         NULL),
    ('Municipal Sanitation',           'sanitation',  NULL),
    ('Water Board',                    'water-board', NULL),
    ('Electricity & Street Lighting',  'electricity', NULL),
    ('Traffic & Parking',              'traffic',     NULL),
    ('Parks & Horticulture',           'parks',       NULL),
    ('General / Unassigned',           'general',     NULL)
ON CONFLICT (slug) DO NOTHING;
