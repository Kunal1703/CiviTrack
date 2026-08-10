-- 0007 down — drop the departments FK and table.
ALTER TABLE app.complaints DROP CONSTRAINT IF EXISTS fk_complaints_department;
DROP TABLE IF EXISTS app.departments CASCADE;
