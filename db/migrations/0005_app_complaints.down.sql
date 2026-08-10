-- 0005 down — remove application complaints table and its ref sequence.
DROP TABLE IF EXISTS app.complaints CASCADE;
DROP SEQUENCE IF EXISTS app.complaint_ref_seq;
