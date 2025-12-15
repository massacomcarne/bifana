-- Ensure realtime replication sends full row data for updates
alter table public.entities replica identity full;
alter table public.timers replica identity full;
alter table public.session_state replica identity full;

-- Add core tables to the realtime publication idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'entities'
  ) THEN
    EXECUTE 'alter publication supabase_realtime add table public.entities';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'timers'
  ) THEN
    EXECUTE 'alter publication supabase_realtime add table public.timers';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'session_state'
  ) THEN
    EXECUTE 'alter publication supabase_realtime add table public.session_state';
  END IF;
END $$;
