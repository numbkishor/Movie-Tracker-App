-- Reelist — RLS verification
--
-- docs/security.md and docs/review.md both require every policy to be proven
-- against a *second* logged-in user, not assumed correct. Two real browser
-- sessions are still the honest end-to-end check; this script is the fast,
-- repeatable version you can re-run after every policy change.
--
-- Run it in the Supabase SQL editor after applying all migrations. It creates
-- three throwaway auth users, asserts what each can and cannot see, and rolls
-- everything back — nothing is left behind, pass or fail.
--
-- A raised exception means a policy is wrong. Silence means all assertions passed.
--
-- The cast is:
--   alice  — owns the entries
--   bob    — alice's accepted friend
--   mallory— a stranger, then someone alice blocks

begin;

do $$
declare
  alice   uuid := gen_random_uuid();
  bob     uuid := gen_random_uuid();
  mallory uuid := gen_random_uuid();
  public_entry  uuid;
  private_entry uuid;
  friendship    uuid;
  visible_count integer;
  affected      integer;
begin
  -- Created the way sign-up creates them, so the profile trigger runs.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  values
    (alice, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'alice-rlstest@example.com', '', now(), now(), now()),
    (bob, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'bob-rlstest@example.com', '', now(), now(), now()),
    (mallory, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'mallory-rlstest@example.com', '', now(), now(), now());

  insert into public.movies (tmdb_id, media_type, title, release_date)
  values (999999901, 'movie', 'RLS Test Film', date '2001-01-01'),
         (999999901, 'tv', 'RLS Test Series', date '2002-01-01')
  on conflict (tmdb_id, media_type) do nothing;

  -- =========================================================================
  -- Phase 1 guarantees: an owner's private data stays private
  -- =========================================================================

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);

  insert into public.watched_entries (user_id, movie_id, media_type, rating, review, watched_on, is_public)
  values (alice, 999999901, 'movie', 4.5, 'Alice private review', current_date, false)
  returning id into private_entry;

  insert into public.watched_entries (user_id, movie_id, media_type, rating, watched_on, is_public)
  values (alice, 999999901, 'tv', 4.0, current_date, true)
  returning id into public_entry;

  select count(*) into visible_count from public.watched_entries;
  if visible_count <> 2 then
    raise exception 'FAIL: owner should see their 2 entries, saw %', visible_count;
  end if;

  -- A user must not be able to write a row attributed to someone else.
  begin
    insert into public.watched_entries (user_id, movie_id, media_type, watched_on)
    values (bob, 999999901, 'movie', current_date);
    raise exception 'FAIL: Alice was able to insert an entry owned by Bob';
  exception
    when insufficient_privilege then null;
  end;

  -- =========================================================================
  -- A stranger sees nothing at all — not even the entry Alice marked public.
  -- This is the assertion that would have caught a public-read policy shipped
  -- before friendships existed to gate it.
  -- =========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', mallory, 'role', 'authenticated')::text, true);

  select count(*) into visible_count from public.watched_entries;
  if visible_count <> 0 then
    raise exception 'FAIL: a stranger can read % of Alice''s entries', visible_count;
  end if;

  -- The common RLS mistake: SELECT is right, UPDATE/DELETE were forgotten.
  update public.watched_entries set review = 'tampered' where user_id = alice;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: a stranger updated % of Alice''s rows', affected;
  end if;

  delete from public.watched_entries where user_id = alice;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: a stranger deleted % of Alice''s rows', affected;
  end if;

  -- =========================================================================
  -- Phase 2: a *pending* request grants nothing. Only acceptance does.
  -- =========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', bob, 'role', 'authenticated')::text, true);

  insert into public.friendships (requester_id, addressee_id, status)
  values (bob, alice, 'pending')
  returning id into friendship;

  select count(*) into visible_count from public.watched_entries;
  if visible_count <> 0 then
    raise exception 'FAIL: a pending request exposed % of Alice''s entries', visible_count;
  end if;

  -- The requester must not be able to accept their own request. Two policies
  -- can match this row for UPDATE (the addressee's respond policy, and the
  -- either-party block policy), so a rejection can surface either as zero rows
  -- matched or as a WITH CHECK violation. Both are correct outcomes; only a
  -- successful update is a failure.
  begin
    update public.friendships set status = 'accepted' where id = friendship;
    get diagnostics affected = row_count;
    if affected <> 0 then
      raise exception 'FAIL: Bob accepted his own friend request';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  -- Alice accepts.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  update public.friendships set status = 'accepted' where id = friendship;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'FAIL: the addressee could not accept the request';
  end if;

  -- =========================================================================
  -- An accepted friend sees exactly the shared rows — no more.
  -- =========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', bob, 'role', 'authenticated')::text, true);

  select count(*) into visible_count from public.watched_entries where user_id = alice;
  if visible_count <> 1 then
    raise exception 'FAIL: friend should see exactly 1 shared entry, saw %', visible_count;
  end if;

  if exists (select 1 from public.watched_entries where id = private_entry) then
    raise exception 'FAIL: a friend can read Alice''s PRIVATE entry';
  end if;

  -- Visible does not mean writable.
  update public.watched_entries set review = 'tampered' where id = public_entry;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: a friend updated Alice''s shared entry';
  end if;

  delete from public.watched_entries where id = public_entry;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: a friend deleted Alice''s shared entry';
  end if;

  -- A friendship with Alice must not leak Alice's *other* friends' data, and a
  -- third party must not see the friendship row at all.
  perform set_config('request.jwt.claims',
                     json_build_object('sub', mallory, 'role', 'authenticated')::text, true);
  select count(*) into visible_count from public.friendships;
  if visible_count <> 0 then
    raise exception 'FAIL: an uninvolved user can read % friendship rows', visible_count;
  end if;

  -- =========================================================================
  -- Phase 3: season progress inherits the parent entry's visibility
  -- =========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  insert into public.watched_seasons (entry_id, season_number) values (public_entry, 1);
  insert into public.watched_seasons (entry_id, season_number) values (private_entry, 1);

  perform set_config('request.jwt.claims',
                     json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into visible_count from public.watched_seasons;
  if visible_count <> 1 then
    raise exception 'FAIL: friend should see seasons of the 1 shared entry only, saw %', visible_count;
  end if;

  -- A friend cannot mark seasons on someone else's entry.
  begin
    insert into public.watched_seasons (entry_id, season_number) values (public_entry, 2);
    raise exception 'FAIL: a friend wrote season progress onto Alice''s entry';
  exception
    when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims',
                     json_build_object('sub', mallory, 'role', 'authenticated')::text, true);
  select count(*) into visible_count from public.watched_seasons;
  if visible_count <> 0 then
    raise exception 'FAIL: a stranger can read % season rows', visible_count;
  end if;

  -- =========================================================================
  -- Blocking revokes visibility, and the blocked party cannot undo it
  -- =========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);
  update public.friendships set status = 'blocked', blocked_by = alice where id = friendship;

  perform set_config('request.jwt.claims',
                     json_build_object('sub', bob, 'role', 'authenticated')::text, true);
  select count(*) into visible_count from public.watched_entries where user_id = alice;
  if visible_count <> 0 then
    raise exception 'FAIL: a blocked user still reads % of Alice''s entries', visible_count;
  end if;

  delete from public.friendships where id = friendship;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL: the blocked party deleted the block';
  end if;

  begin
    update public.friendships set status = 'accepted', blocked_by = null where id = friendship;
    get diagnostics affected = row_count;
    if affected <> 0 then
      raise exception 'FAIL: the blocked party un-blocked themselves';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  -- =========================================================================
  -- Server-side value validation, independent of the UI
  -- =========================================================================

  perform set_config('request.jwt.claims',
                     json_build_object('sub', alice, 'role', 'authenticated')::text, true);

  begin
    insert into public.watched_entries (user_id, movie_id, media_type, rating, watched_on)
    values (alice, 999999901, 'movie', 4.3, current_date);
    raise exception 'FAIL: an off-half-step rating was accepted';
  exception
    when check_violation then null;
    when unique_violation then
      raise exception 'FAIL: rating validation was not reached (duplicate row first)';
  end;

  begin
    insert into public.watched_seasons (entry_id, season_number, watched_on)
    values (public_entry, 9, current_date + 1);
    raise exception 'FAIL: a future season watch date was accepted';
  exception
    when check_violation then null;
  end;

  -- Films and series with the same TMDB id must stay distinct titles.
  if (select count(*) from public.movies where tmdb_id = 999999901) <> 2 then
    raise exception 'FAIL: the composite title key collapsed a film and a series';
  end if;

  -- =========================================================================
  -- Signed-out visitors see nothing anywhere
  -- =========================================================================

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

  select count(*) into visible_count from public.friendships;
  if visible_count <> 0 then
    raise exception 'FAIL: anon can read % friendships', visible_count;
  end if;

  select count(*) into visible_count from public.watched_seasons;
  if visible_count <> 0 then
    raise exception 'FAIL: anon can read % season rows', visible_count;
  end if;

  perform set_config('role', 'postgres', true);
  raise notice 'PASS: all RLS assertions held.';
end;
$$;

rollback;
