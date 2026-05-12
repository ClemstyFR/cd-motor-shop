-- Run in Supabase SQL editor before deploying the updated Stripe webhook.
alter table public.orders
    add column if not exists stripe_session_id text;

create unique index if not exists orders_stripe_session_id_key
    on public.orders (stripe_session_id)
    where stripe_session_id is not null;
