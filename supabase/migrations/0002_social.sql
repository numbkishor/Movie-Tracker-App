-- Reelist — Phase 2, the social layer
--
-- Adds friendships and, with them, the first policy in the app that lets one
-- user read another's rows. docs/security.md calls RLS the highest-risk area
-- here, and this migration is where that risk actually arrives: until now
-- "public" had no viewer at all.
--
-- The rule, from docs/architecture.md: a row is readable if it is yours, OR it
-- is marked public AND the viewer has an accepted friendship with the owner.

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending',
  -- Who blocked, so the other party cannot quietly undo it.
  blocked_by   uuid references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint friendships_status check (status in ('pending', 'accepted', 'blocked')),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_blocked_by_set check (
    (status = 'blocked' and blocked_by is not null)
    or (status <> 'blocked' and blocked_by is null)
  )
);

-- One row per pair in either direction: without this, A→B and B→A could both
-- exist and the two sides would disagree about whether they are friends.
create unique index if not exists friendships_pair_unique
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index if not exists friendships_addressee_status_idx
  on public.friendships (addressee_id, status);

create index if not exists friendships_requester_status_idx
  on public.friendships (requester_id, status);

alter table public.friendships enable row level security;

-- ---------------------------------------------------------------------------
-- Visibility helpers
--
-- These are SECURITY DEFINER because a policy on watched_entries that queried
-- friendships directly would evaluate that subquery under the *viewer's* RLS,
-- which is both fragile and recursive.
--
-- Each one answers only about the caller — they take "the other person" and
-- read auth.uid() themselves. A version taking two arbitrary user ids would let
-- anyone probe whether two strangers are friends.
-- ---------------------------------------------------------------------------

create or replace function public.is_accepted_friend(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = other_user)
        or (f.addressee_id = auth.uid() and f.requester_id = other_user)
      )
  );
$$;

create or replace function public.has_block_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'blocked'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = other_user)
        or (f.addressee_id = auth.uid() and f.requester_id = other_user)
      )
  );
$$;

revoke all on function public.is_accepted_friend(uuid) from public;
revoke all on function public.has_block_with(uuid) from public;
grant execute on function public.is_accepted_friend(uuid) to authenticated;
grant execute on function public.has_block_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- friendships policies
-- ---------------------------------------------------------------------------

-- Only the two people involved ever see the row. A pending request is not
-- public information.
create policy "a user reads friendships they are part of"
  on public.friendships for select
  to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()));

-- You may only ever create a request *from* yourself, and only as pending —
-- inserting a row that is already 'accepted' would be self-friending.
create policy "a user sends their own friend requests"
  on public.friendships for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'pending'
    and blocked_by is null
    and not public.has_block_with(addressee_id)
  );

-- Accepting is the addressee's call alone. USING matches the row as it stands
-- (still pending); WITH CHECK constrains what it may become.
create policy "the addressee responds to a request"
  on public.friendships for update
  to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status in ('accepted', 'blocked'));

-- Either party may block at any point, but only in their own name.
create policy "either party blocks"
  on public.friendships for update
  to authenticated
  using (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
  with check (
    (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
    and status = 'blocked'
    and blocked_by = (select auth.uid())
  );

-- Unfriending, cancelling a request, or lifting your own block. The blocked
-- party deliberately cannot delete the row — that would be self-unblocking.
create policy "a user removes their own friendships"
  on public.friendships for delete
  to authenticated
  using (
    (requester_id = (select auth.uid()) or addressee_id = (select auth.uid()))
    and (status <> 'blocked' or blocked_by = (select auth.uid()))
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists friendships_touch_updated_at on public.friendships;

create trigger friendships_touch_updated_at
  before update on public.friendships
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Entry visibility
--
-- Phase 1 shipped owner-only SELECT policies precisely because there was no
-- friendship table to gate a public-read policy. That table now exists, so the
-- policies are replaced — not supplemented — so there is exactly one SELECT
-- rule per table to reason about.
-- ---------------------------------------------------------------------------

drop policy if exists "a user reads only their own watched entries" on public.watched_entries;

create policy "a user reads their own and their friends' public watched entries"
  on public.watched_entries for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (is_public and public.is_accepted_friend(user_id))
  );

drop policy if exists "a user reads only their own watchlist entries" on public.watchlist_entries;

create policy "a user reads their own and their friends' public watchlist entries"
  on public.watchlist_entries for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (is_public and public.is_accepted_friend(user_id))
  );

-- Writes are untouched: still owner-only, on both USING and WITH CHECK.
