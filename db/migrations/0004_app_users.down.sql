-- 0004 down — remove application users table.
-- (The empty `app` schema is left in place; dropping it with objects present would
-- error, and an empty schema is harmless.)
DROP TABLE IF EXISTS app.users CASCADE;
