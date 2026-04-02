-- Supericons Store: si_products and si_purchases tables
-- Run this in Supabase SQL Editor after si_profiles migration

-- 1. Products table
create table if not exists si_products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  description     text,
  price_cents     int not null,
  stripe_price_id text,
  pack_type       text not null default 'single',
  icon_count      int not null default 10,
  preview_url     text,
  css_filename    text,
  status          text not null default 'active',
  created_at      timestamptz default now()
);

alter table si_products enable row level security;
create policy "public_read_active" on si_products for select using (status = 'active');

-- 2. Purchases table
create table if not exists si_purchases (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id),
  product_id        uuid not null references si_products(id),
  stripe_session_id text,
  purchased_at      timestamptz default now(),
  unique(user_id, product_id)
);

alter table si_purchases enable row level security;
create policy "users_read_own_purchases" on si_purchases for select using (auth.uid() = user_id);

-- 3. Seed initial packs (update stripe_price_id after creating Stripe products)
insert into si_products (name, slug, description, price_cents, pack_type, icon_count, status) values
  ('Status & Feedback',      'status-feedback',       'App state animations: loading, success, error, notifications',           500, 'single', 10, 'active'),
  ('Security & Auth',        'security-auth',         'Login flows, permissions, and trust signal animations',                  500, 'single', 10, 'draft'),
  ('Navigation & Menus',     'navigation-menus',      'UI chrome animations: hamburger, tabs, sidebar, search',                 500, 'single', 10, 'draft'),
  ('Social & Communication', 'social-communication',  'Reactions, messaging, and sharing animations',                           500, 'single', 10, 'draft'),
  ('Data & Charts',          'data-charts',           'Dashboard loading states and chart animations',                          500, 'single', 10, 'draft'),
  ('E-commerce',             'ecommerce',             'Cart, payment, and shipping feedback animations',                        500, 'single', 10, 'draft'),
  ('Media & Playback',       'media-playback',        'Player controls and recording state animations',                         500, 'single', 10, 'draft'),
  ('AI & Agentic',           'ai-agentic',            'AI-native app states and agent feedback animations',                     500, 'single', 10, 'draft');

-- 4. Seed bundles
insert into si_products (name, slug, description, price_cents, pack_type, icon_count, status) values
  ('SaaS Essentials',        'saas-essentials',       'Status & Feedback + Navigation + Security & Auth (30 icons)',            2500, 'bundle', 30, 'draft'),
  ('Full Stack UI',          'full-stack-ui',         'All 5 core animated packs (50 icons)',                                  3900, 'bundle', 50, 'draft'),
  ('Social App Kit',         'social-app-kit',        'Social + Media + E-commerce (30 icons)',                                2900, 'bundle', 30, 'draft');

-- 5. Index for faster queries
create index if not exists si_products_status_idx on si_products (status);
create index if not exists si_purchases_user_idx on si_purchases (user_id);
