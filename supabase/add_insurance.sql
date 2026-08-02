-- MobiYatri: travel insurance policies table.
-- Run in Supabase Dashboard -> SQL Editor (MobiYatri project).
-- Policies are DEMO records until a licensed embedded-insurance partner is integrated.

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  policy_number text unique not null,
  destination text,
  premium_inr integer,
  days integer,
  provider text not null default 'mock',   -- mock | riskcovry | zopper | ...
  status text not null default 'active',
  created_at timestamptz not null default now()
);
alter table public.policies enable row level security;
create policy "read own policies" on public.policies
  for select using (auth.uid() = user_id);
create index policies_user_idx on public.policies(user_id, created_at desc);
