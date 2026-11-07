-- CrownHacks Shoutouts: run this whole file in the Supabase SQL Editor.

create table posts (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) <= 32),
  message text not null check (char_length(message) <= 140),
  created_at timestamptz default now()
);

-- Turn on Row Level Security. With RLS on and NO policies,
-- the public (anon) key can't read or write anything.
alter table posts enable row level security;

-- Sample rows (the SQL Editor bypasses RLS, so these insert fine)
insert into posts (name, message) values
  ('Jordan', 'Welcome to CrownHacks'),
  ('Timmy', 'Statistics!'),
  ('Nirav', 'Best of luck!');

-- LIVE DEMO: run these to fix the empty list
-- create policy "Public read" on posts for select using (true);
-- create policy "Anyone can post" on posts for insert to anon with check (true);
