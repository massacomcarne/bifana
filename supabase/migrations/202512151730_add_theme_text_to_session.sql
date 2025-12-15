alter table public.session_state
  add column if not exists theme_text text;
