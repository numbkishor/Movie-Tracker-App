-- Reelist — RLS verification
--
-- docs/security.md and docs/review.md both require every policy to be proven
-- against a *second* logged-in user, not assumed correct. Two real browser
-- sessions are still the honest end-to-end check; this script is the fast,
-- repeatable version you can re-run after every policy change.
--
-- Run it in the Supabase SQL editor after applying 0001_init.sql. It creates
-- two throwaway auth users, asserts what each can and cannot see, and rolls
-- everything back — nothing is left behind, pass or fail.
--
-- A raised exception means a policy is wrong. Silence means all assertions passed.

begin;

do $$
declare
  alice uuid := gen_random_uuid();
  bob   uuid := gen_random_uuid();
  visible_count integer;
  affected      integer;
begin
  -- Two users, created the way sign-up creates them, so the profile trigger runs.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values
    (alice, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'alice-rlstest@example.com', '', now(), now(), now()),
    (bob, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bob-rlstest@example.com', '', now(), now(), now());

  insert into public.movies (tmdb_id, media_type, title, release_date)
  values (999999901, 'movie', 'RLS Test Title', date '2001-01-01')
  on conflict (tmdb_id) do nothing;

  -- Act as Alice.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);

  insert into public.watched_entries (user_id, movie_id, rating, review, watched_on)
  values (alice, 999999901, 4.5, 'Alice private review', current_date);

  select count(*) into visible_count from public.watched_entries;
  if visible_count <> 1 then
    raise exception 'FAIL: owner should see exactly their 1 entry, saw %', visible_count;
  end if;

  -- A user must not be able to write a row attributed to someone else.
  begin
    insert into public.watched_entries (user_id, movie_id, watched_on)
    values (bob, 999999901, current_date);
    raise exception 'FAIL: Alice was able to insert an entry owned by Bob';
  exception
    when insufficient_privilege then null;
  end;

  -- Act as Bob.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', bob, 'role', 'authenticated')::text, true);

  select count(*) into visible_count from public.watched_entries;
  if visible_count <> 0 then
    raise exception 'FAIL: Bob can read % of Alice''s watched entries', visible_count;
  end if;

  -- The common RLS mistake: SELECT is right, UPDATE/DELETE were forgotten.
  update public.watched_entries set review = 'tampered' where user_id = alice;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: Bob updated % of Alice''s rows', affected;
  end if;

  delete from public.watched_entries where user_id = alice;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: Bob deleted % of Alice''s rows', affected;
  end if;

  -- Bob cannot re-point one of his own rows at Alice (WITH CHECK on update).
  insert into public.watched_entries (user_id, movie_id, watched_on)
  values (bob, 999999901, current_date);
  begin
    update public.watched_entries set user_id = alice where user_id = bob;
    raise exception 'FAIL: Bob reassigned his own entry to Alice';
  exception
    when insufficient_privilege then null;
  end;

  -- Same guarantees on the watchlist table, which Phase 3 will eventually use.
  insert into public.watchlist_entries (user_id, movie_id) values (bob, 999999901);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  select count(*) into visible_count from public.watchlist_entries;
  if visible_count <> 0 then
    raise exception 'FAIL: Alice can read % of Bob''s watchlist entries', visible_count;
  end if;

  -- Server-side value validation, independent of the UI.
  begin
    insert into public.watched_entries (user_id, movie_id, rating, watched_on)
    values (alice, 999999901, 4.3, current_date);
    raise exception 'FAIL: an off-half-step rating was accepted';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.watched_entries (user_id, movie_id, watched_on)
    values (alice, 999999901, current_date + 1);
    raise exception 'FAIL: a future watched_on date was accepted';
  exception
    when check_violation then null;
  end;

  -- Signed-out visitors see no user data at all.
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);

  select count(*) into visible_count from public.watched_entries;
  if visible_count <> 0 then
    raise exception 'FAIL: anon can read % watched entries', visible_count;
  end if;

  select count(*) into visible_count from public.profiles;
  if visible_count <> 0 then
    raise exception 'FAIL: anon can read % profiles', visible_count;
  end if;

  perform set_config('role', 'postgres', true);
  raise notice 'PASS: all RLS assertions held.';
end;
$$;

rollback;
