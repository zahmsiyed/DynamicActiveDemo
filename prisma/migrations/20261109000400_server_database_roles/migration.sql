-- Non-login group roles separate application access from migration ownership.
-- Operators create password-bearing login roles and grant one group to each.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dynamic_active_web') THEN
    CREATE ROLE dynamic_active_web NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dynamic_active_worker') THEN
    CREATE ROLE dynamic_active_worker NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO dynamic_active_web, dynamic_active_worker;
DO $$ DECLARE row record; BEGIN
  FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO dynamic_active_web, dynamic_active_worker', row.tablename);
    -- These policies apply only to trusted server logins, never Auth API roles.
    EXECUTE format('CREATE POLICY server_access ON public.%I TO dynamic_active_web, dynamic_active_worker USING (true) WITH CHECK (true)', row.tablename);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA pgmq TO dynamic_active_web, dynamic_active_worker;
-- PGMQ versions expose different send overloads; wrapper functions invoke other
-- overloads and the name-formatting helper using the caller's permissions.
DO $$ DECLARE fn record; BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'pgmq' AND p.proname IN ('send', 'format_table_name') LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO dynamic_active_web', fn.signature);
  END LOOP;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO dynamic_active_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgmq TO dynamic_active_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgmq TO dynamic_active_worker;
-- PGMQ send is invoker code; web requires only the outbound queue and its ID sequence.
GRANT SELECT, INSERT ON pgmq.q_evaluations TO dynamic_active_web;
GRANT USAGE, SELECT ON SEQUENCE pgmq.q_evaluations_msg_id_seq TO dynamic_active_web;

-- Replay archives only failed-run messages; it never purges a queue globally.
GRANT EXECUTE ON FUNCTION pgmq.archive(text, bigint) TO dynamic_active_web;
GRANT SELECT, DELETE ON pgmq.q_evaluation_dead_letters TO dynamic_active_web;
GRANT SELECT, INSERT ON pgmq.a_evaluation_dead_letters TO dynamic_active_web;
