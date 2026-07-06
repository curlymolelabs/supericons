-- Phase 0 schema draft for x402 single-icon payments.
-- Apply only when the x402 endpoint is ready to read and write these records.

create table if not exists public.si_x402_icon_payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  delivered_at timestamptz,
  redelivery_expires_at timestamptz,
  pack_slug text not null,
  icon_name text not null,
  resource_path text not null,
  price_amount numeric(12, 2) not null,
  price_currency text not null default 'USDC',
  network text not null,
  status text not null check (
    status in (
      'settlement_pending',
      'settled',
      'redelivered',
      'delivery_failed',
      'verify_failed',
      'duplicate',
      'rate_limited'
    )
  ),
  charged boolean not null default false,
  payer_address text,
  is_test_wallet boolean not null default false,
  payment_identifier text,
  idempotency_key text,
  settlement_reference text,
  transaction_hash text,
  signed_payment_payload_hash text,
  payment_response_header text,
  facilitator_url text,
  facilitator_response jsonb not null default '{}'::jsonb,
  delivery_attempts integer not null default 0,
  last_error_code text,
  last_error_message text,
  request_ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.si_x402_icon_payments is
  'Private audit table for x402 single-icon payment settlement and redelivery.';

alter table public.si_x402_icon_payments enable row level security;
revoke all on table public.si_x402_icon_payments from anon, authenticated;

create unique index if not exists si_x402_icon_payments_signed_payload_uidx
  on public.si_x402_icon_payments (signed_payment_payload_hash)
  where signed_payment_payload_hash is not null
    and status in ('settlement_pending', 'settled', 'delivery_failed', 'redelivered');

create unique index if not exists si_x402_icon_payments_identifier_uidx
  on public.si_x402_icon_payments (payment_identifier)
  where payment_identifier is not null
    and charged = true;

create unique index if not exists si_x402_icon_payments_settlement_uidx
  on public.si_x402_icon_payments (settlement_reference)
  where settlement_reference is not null
    and charged = true;

create index if not exists si_x402_icon_payments_resource_idx
  on public.si_x402_icon_payments (pack_slug, icon_name, created_at desc);

create index if not exists si_x402_icon_payments_status_idx
  on public.si_x402_icon_payments (status, created_at desc);

create table if not exists public.si_x402_rate_limit_counters (
  bucket_key text not null,
  window_start timestamptz not null,
  window_seconds integer not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_start)
);

comment on table public.si_x402_rate_limit_counters is
  'Private counters for x402 endpoint rate limiting before facilitator calls.';

alter table public.si_x402_rate_limit_counters enable row level security;
revoke all on table public.si_x402_rate_limit_counters from anon, authenticated;
