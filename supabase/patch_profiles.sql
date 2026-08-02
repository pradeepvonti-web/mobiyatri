-- MobiYatri: add missing columns to the pre-existing profiles table (shared with ai2in.dev).
-- Purely additive — does not touch existing columns or rows' data. Safe to re-run.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists cashback_balance numeric(10,2) not null default 0,
  add column if not exists referral_code text unique default substr(md5(random()::text), 1, 8),
  add column if not exists referred_by uuid references public.profiles(id);

-- give any existing rows a referral code if the add-column default left them null
update public.profiles
  set referral_code = substr(md5(random()::text), 1, 8)
  where referral_code is null;
