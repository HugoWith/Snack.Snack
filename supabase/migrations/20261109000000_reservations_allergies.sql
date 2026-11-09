-- Free-text allergies the customer can add to an online order: shown to the
-- organisers only, never on the ticket or in the emails. Nullable: null means
-- nothing was declared. Additive only, so existing rows stay valid.
alter table public.reservations
  add column allergies text check (char_length(allergies) <= 200);

-- The 8th parameter (p_allergies) cannot be added with create or replace:
-- it would leave the old 7-argument version behind as an orphan overload.
drop function public.hold_seats(text, text, int, int, int, int, int);

create function public.hold_seats(
  p_name text, p_email text, p_covers int, p_vg int,
  p_price_cents int, p_max_per_email int, p_hold_minutes int,
  p_allergies text default null
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

  insert into reservations (full_name, email, covers, vg, amount_cents, hold_expires_at, allergies)
  values (p_name, v_email, p_covers, p_vg, p_covers * p_price_cents,
          clock_timestamp() + make_interval(mins => p_hold_minutes), p_allergies)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.hold_seats(text, text, int, int, int, int, int, text) from public, anon, authenticated;
