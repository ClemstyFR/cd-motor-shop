-- Run in Supabase SQL editor before deploying the updated checkout/webhook code.

-- Orders: prevent duplicate Stripe webhooks from creating duplicate orders.
alter table public.orders
    add column if not exists stripe_session_id text;

create unique index if not exists orders_stripe_session_id_key
    on public.orders (stripe_session_id)
    where stripe_session_id is not null;

-- Orders: keep user access private, but allow admins to manage orders.
-- Admin status is read from Supabase Auth app_metadata.role = 'admin'.
drop policy if exists "users_own_orders" on public.orders;
drop policy if exists "users_select_own_orders" on public.orders;
drop policy if exists "admins_manage_orders" on public.orders;

create policy "users_select_own_orders" on public.orders
    for select
    using (auth.uid() = user_id);

create policy "admins_manage_orders" on public.orders
    for all
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Reviews: public read, users manage their own reviews, admins can moderate.
drop policy if exists "read_all" on public.reviews;
drop policy if exists "write_own" on public.reviews;
drop policy if exists "manage_own" on public.reviews;
drop policy if exists "delete_own" on public.reviews;
drop policy if exists "reviews_read_all" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;
drop policy if exists "admins_manage_reviews" on public.reviews;

create policy "reviews_read_all" on public.reviews
    for select
    using (true);

create policy "reviews_insert_own" on public.reviews
    for insert
    with check (auth.uid() = user_id);

create policy "reviews_update_own" on public.reviews
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "reviews_delete_own" on public.reviews
    for delete
    using (auth.uid() = user_id);

create policy "admins_manage_reviews" on public.reviews
    for all
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Profiles: users manage their own profile, admins can read profiles for the dashboard.
drop policy if exists "own profile" on public.profiles;
drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_insert" on public.profiles;
drop policy if exists "profiles_own_update" on public.profiles;
drop policy if exists "admins_read_profiles" on public.profiles;

create policy "profiles_own_select" on public.profiles
    for select
    using (auth.uid() = id);

create policy "profiles_own_insert" on public.profiles
    for insert
    with check (auth.uid() = id);

create policy "profiles_own_update" on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "admins_read_profiles" on public.profiles
    for select
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
