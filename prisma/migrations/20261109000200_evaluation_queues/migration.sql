-- Queue messages contain only run identifiers. No browser role can consume jobs.
CREATE EXTENSION IF NOT EXISTS pgmq;
SELECT pgmq.create('evaluations');
SELECT pgmq.create('evaluation_dead_letters');
REVOKE ALL ON SCHEMA pgmq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA pgmq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgmq FROM PUBLIC, anon, authenticated;
