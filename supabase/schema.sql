-- MobiYatri — Supabase schema v1
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Design: clients only ever READ their own rows (RLS below).
-- All WRITES happen from Edge Functions using the service-role key, which bypasses RLS.

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  cashback_balance numeric(10,2) not null default 0,
  referral_code text unique default substr(md5(random()::text), 1, 8),
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile row on signup
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ catalogue cache ============
-- Synced from eSIM Go by an Edge Function on a schedule; app reads this, never eSIM Go directly.
create table public.catalogue_cache (
  id bigint generated always as identity primary key,
  iso text,                          -- null for regional/global entries
  name text not null,
  operator text,
  from_inr integer not null,
  popular boolean not null default false,
  packages jsonb not null,           -- {std:[{d,list:[{label,price,bundle}]}], unl:[...]}
  synced_at timestamptz not null default now()
);
alter table public.catalogue_cache enable row level security;
create policy "catalogue is public" on public.catalogue_cache
  for select using (true);

-- ============ orders ============
create type public.order_status as enum ('created','paid','provisioned','failed','refunded');
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  bundle_id text not null,
  country_name text,
  package_label text,
  price_inr integer not null,
  wholesale_usd numeric(10,2),
  status public.order_status not null default 'created',
  razorpay_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "read own orders" on public.orders
  for select using (auth.uid() = user_id);

-- ============ esims ============
create table public.esims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  user_id uuid not null references public.profiles(id),
  iccid text unique,
  smdp_address text,
  matching_id text,
  lpa_string text,                   -- "LPA:1$smdp$matchingId" -> QR + direct install
  status text not null default 'assigned',   -- assigned | installed | active | depleted | expired
  data_total_mb integer,
  data_used_mb integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.esims enable row level security;
create policy "read own esims" on public.esims
  for select using (auth.uid() = user_id);

-- ============ payments ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  razorpay_payment_id text unique,
  amount_inr integer not null,
  method text,                        -- upi | card | netbanking | wallet
  status text not null,               -- authorized | captured | failed | refunded
  signature_valid boolean,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy "read payments for own orders" on public.payments
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ============ cashback / referral ledger ============
create table public.wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  amount_inr numeric(10,2) not null,  -- positive = credit, negative = debit
  reason text not null,               -- referral_bonus | order_discount | refund
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now()
);
alter table public.wallet_transactions enable row level security;
create policy "read own wallet" on public.wallet_transactions
  for select using (auth.uid() = user_id);

-- ============ webhook event log (service-role only: RLS on, no policies = deny all) ============
create table public.webhook_events (
  id bigint generated always as identity primary key,
  source text not null,               -- razorpay | esimgo
  event_id text unique,               -- for idempotency
  payload jsonb not null,
  processed boolean not null default false,
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;

-- helpful indexes
create index orders_user_idx on public.orders(user_id, created_at desc);
create index esims_user_idx on public.esims(user_id, created_at desc);
create index wallet_user_idx on public.wallet_transactions(user_id, created_at desc);
