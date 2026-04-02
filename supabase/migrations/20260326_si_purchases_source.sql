-- Add source column to si_purchases for license tier determination
-- Values: 'purchase' (a-la-carte), 'launch_edition' (bundle), 'credit' (credit redemption)

alter table si_purchases add column if not exists source text not null default 'purchase';
