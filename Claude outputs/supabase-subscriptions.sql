-- ─────────────────────────────────────────────────────────────────────────────
-- Intelist Pro — subscriptions table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists subscriptions (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  stripe_customer_id      text        unique,
  stripe_subscription_id  text        unique,
  stripe_price_id         text,
  status                  text        not null default 'inactive',
  -- status values: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing' | 'inactive'
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- One subscription row per user
create unique index if not exists subscriptions_user_id_idx on subscriptions (user_id);

-- Row-level security: users can only read their own subscription
alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Service role (webhook) can insert/update — no RLS restriction needed for service role
-- The webhook uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS automatically

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- select * from subscriptions limit 5;
