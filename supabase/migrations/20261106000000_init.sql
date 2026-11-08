create table public.reservations (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null check (char_length(full_name) between 2 and 120),
  email             text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Online orders stop at 2 covers; the admin can enter a group of any size.
  covers            int  not null check (covers >= 1 and (source = 'manual' or covers <= 2)),
  vg                int  not null default 0 check (vg >= 0 and vg <= covers),
  amount_cents      int  not null,
  status            text not null default 'held'
                    check (status in ('held', 'paid', 'failed', 'expired', 'cancelled')),
  hold_expires_at   timestamptz not null,
  sumup_checkout_id text unique,
  ticket_no         int unique,
  needs_refund      boolean not null default false,
  source            text not null default 'online' check (source in ('online', 'manual')),
  payment_method    text default 'sumup'
                    check (payment_method in ('sumup', 'liquide', 'tpe', 'offert')),
  email_sent_at     timestamptz,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  cancelled_at      timestamptz,
  check (source = 'manual' or email is not null)
);
alter table public.reservations enable row level security;
create index on public.reservations (lower(email));
create index on public.reservations (status, hold_expires_at);

create table public.settings (
  id       int primary key default 1 check (id = 1),
  capacity int not null check (capacity >= 0)
);
alter table public.settings enable row level security;

-- Initial value mirrors EVENT.initialCapacity in src/event.ts; the admin changes it afterwards.
insert into public.settings (capacity) values (20);

-- A reservation holds seats while it is paid (and not flagged for refund)
-- or held with a live hold. Expired holds stop counting by time alone, so
-- correctness never depends on expire_holds() having run.
create function public.seats_taken()
returns int language sql volatile security definer set search_path = public as $$
  select coalesce(sum(covers), 0)::int from reservations
  where (status = 'paid' and not needs_refund)
     or (status = 'held' and hold_expires_at > clock_timestamp());
$$;

-- Every function that changes seat counts or ticket numbers takes the same
-- transaction-scoped advisory lock, so they run one at a time. Times are read
-- with clock_timestamp(): now() is frozen at the transaction start, before the
-- wait for the lock, so a hold could look live after it has expired.
create function public.hold_seats(
  p_name text, p_email text, p_covers int, p_vg int,
  p_price_cents int, p_max_per_email int, p_hold_minutes int
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(p_email));
  v_capacity int;
  v_mine int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));

  -- A new hold replaces this email's unpaid ones (a retry after coming back
  -- from SumUp). A late payment of a replaced hold goes through
  -- confirm_payment's late-payment branch. An exception below rolls this back.
  update reservations set status = 'expired'
  where lower(email) = v_email and status = 'held';

  select capacity into v_capacity from settings;
  if seats_taken() + p_covers > v_capacity then
    raise exception 'SOLD_OUT';
  end if;

  select coalesce(sum(covers), 0) into v_mine from reservations
  where lower(email) = v_email
    and status = 'paid' and not needs_refund;
  if v_mine + p_covers > p_max_per_email then
    raise exception 'MAX_PER_EMAIL';
  end if;

  insert into reservations (full_name, email, covers, vg, amount_cents, hold_expires_at)
  values (p_name, v_email, p_covers, p_vg, p_covers * p_price_cents,
          clock_timestamp() + make_interval(mins => p_hold_minutes))
  returning id into v_id;
  return v_id;
end $$;

create function public.attach_checkout(p_id uuid, p_checkout_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));
  update reservations set sumup_checkout_id = p_checkout_id where id = p_id;
end $$;

-- Ticket numbers are max + 1 over every row, cancelled ones included, so a
-- number is never handed out twice.
create function public.confirm_payment(p_id uuid)
returns table (ticket_no int, needs_refund boolean, newly_paid boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  r reservations;
  v_capacity int;
  v_ticket_no int;
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));

  select * into r from reservations where id = p_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if r.status = 'paid' or (r.status = 'cancelled' and r.paid_at is not null) then
    return query select r.ticket_no, r.needs_refund, false;
    return;
  end if;

  -- Cancelled by the admin before the payment landed: keep it cancelled
  -- (so it holds no seat) and flag the money for refund.
  if r.status = 'cancelled' then
    update reservations
    set needs_refund = true, paid_at = clock_timestamp()
    where id = p_id;
    return query select null::int, true, true;
    return;
  end if;

  -- A live hold already counts in seats_taken(); anything else must fit in what is left.
  if not (r.status = 'held' and r.hold_expires_at > clock_timestamp()) then
    select capacity into v_capacity from settings;
    if seats_taken() + r.covers > v_capacity then
      update reservations
      set status = 'paid', needs_refund = true, paid_at = clock_timestamp()
      where id = p_id;
      return query select null::int, true, true;
      return;
    end if;
  end if;

  select coalesce(max(ticket_no), 0) + 1 into v_ticket_no from reservations;
  update reservations
  set status = 'paid', ticket_no = v_ticket_no, paid_at = clock_timestamp()
  where id = p_id;
  return query select v_ticket_no, false, true;
end $$;

create function public.mark_failed(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('failed', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));
  update reservations set status = p_status where id = p_id and status = 'held';
end $$;

create function public.admin_add(
  p_name text, p_email text, p_covers int, p_vg int,
  p_payment_method text, p_price_cents int
)
returns table (id uuid, ticket_no int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_capacity int;
  v_ticket_no int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));

  select capacity into v_capacity from settings;
  if seats_taken() + p_covers > v_capacity then
    raise exception 'SOLD_OUT';
  end if;

  select coalesce(max(ticket_no), 0) + 1 into v_ticket_no from reservations;
  insert into reservations (
    full_name, email, covers, vg, amount_cents, status, hold_expires_at,
    ticket_no, source, payment_method, paid_at
  )
  values (
    p_name, nullif(lower(trim(p_email)), ''), p_covers, p_vg,
    case when p_payment_method = 'offert' then 0 else p_covers * p_price_cents end,
    'paid', clock_timestamp(), v_ticket_no, 'manual', p_payment_method, clock_timestamp()
  )
  returning reservations.id into v_id;
  return query select v_id, v_ticket_no;
end $$;

-- Cancels only if the status is still the one the organiser saw: a row paid
-- in the meantime needs a refund reminder the stale screen could not show.
create function public.admin_cancel(p_id uuid, p_expected_status text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));
  update reservations
  set status = 'cancelled', cancelled_at = clock_timestamp()
  where id = p_id and status = p_expected_status and status <> 'cancelled';
  return found;
end $$;

create function public.set_capacity(p_capacity int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));
  if p_capacity < seats_taken() then
    raise exception 'CAPACITY_BELOW_TAKEN';
  end if;
  update settings set capacity = p_capacity;
end $$;

create function public.expire_holds()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtext('snack-snack-seats'));
  update reservations set status = 'expired'
  where status = 'held' and hold_expires_at <= clock_timestamp();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

revoke all on function public.seats_taken() from public, anon, authenticated;
revoke all on function public.hold_seats(text, text, int, int, int, int, int) from public, anon, authenticated;
revoke all on function public.attach_checkout(uuid, text) from public, anon, authenticated;
revoke all on function public.confirm_payment(uuid) from public, anon, authenticated;
revoke all on function public.mark_failed(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_add(text, text, int, int, text, int) from public, anon, authenticated;
revoke all on function public.admin_cancel(uuid, text) from public, anon, authenticated;
revoke all on function public.set_capacity(int) from public, anon, authenticated;
revoke all on function public.expire_holds() from public, anon, authenticated;
