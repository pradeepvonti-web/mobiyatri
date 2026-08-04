-- MobiYatri partner portal (travel agents & tour operators)
-- Run once in Supabase → SQL Editor.

create extension if not exists "pgcrypto";

-- 1) agencies -------------------------------------------------------------
create table if not exists partners (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,
  agency_name    text not null,
  contact_name   text,
  contact_phone  text,
  gstin          text,
  city           text,
  commission_pct numeric not null default 15,      -- agent discount off retail
  wallet_paise   bigint  not null default 0,       -- prepaid balance
  status         text    not null default 'active',
  created_at     timestamptz default now(),
  unique (owner_id)
);

-- 2) wallet ledger --------------------------------------------------------
create table if not exists partner_ledger (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partners(id) on delete cascade,
  delta_paise bigint not null,                     -- +topup / -purchase
  kind        text not null,                       -- topup | purchase | adjustment
  note        text,
  ref         text,                                -- razorpay payment id / batch id
  created_at  timestamptz default now()
);

-- 3) batches (one group departure) ---------------------------------------
create table if not exists partner_batches (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references partners(id) on delete cascade,
  tour_name      text,
  country_name   text,
  package_label  text,
  bundle_id      text,
  qty            int  not null,
  unit_price_inr int  not null,                    -- agent price per eSIM
  total_inr      int  not null,
  created_at     timestamptz default now()
);

-- 4) assignments (one eSIM -> one passenger) ------------------------------
create table if not exists partner_assignments (
  id              uuid primary key default gen_random_uuid(),
  batch_id        uuid not null references partner_batches(id) on delete cascade,
  partner_id      uuid not null references partners(id) on delete cascade,
  iccid           text,
  lpa_string      text,
  smdp_address    text,
  matching_id     text,
  passenger_name  text,
  passenger_phone text,
  passenger_email text,
  delivered_at    timestamptz,
  created_at      timestamptz default now()
);

create index if not exists idx_ledger_partner   on partner_ledger(partner_id);
create index if not exists idx_batches_partner  on partner_batches(partner_id);
create index if not exists idx_assign_batch     on partner_assignments(batch_id);

-- 5) RLS: an agency owner sees only their own rows ------------------------
alter table partners            enable row level security;
alter table partner_ledger      enable row level security;
alter table partner_batches     enable row level security;
alter table partner_assignments enable row level security;

drop policy if exists partners_own on partners;
create policy partners_own on partners
  for select using (owner_id = auth.uid());

drop policy if exists ledger_own on partner_ledger;
create policy ledger_own on partner_ledger
  for select using (partner_id in (select id from partners where owner_id = auth.uid()));

drop policy if exists batches_own on partner_batches;
create policy batches_own on partner_batches
  for select using (partner_id in (select id from partners where owner_id = auth.uid()));

drop policy if exists assign_own on partner_assignments;
create policy assign_own on partner_assignments
  for select using (partner_id in (select id from partners where owner_id = auth.uid()));

-- writes go through the server (service role), which bypasses RLS.
