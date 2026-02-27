-- 0. Wipe existing tables to ensure clean slate (since UUID type conflicts exist from previous attempts)
drop table if exists public.issue_reports;
drop table if exists public.users cascade;

-- 1. Users Table (Using TEXT for ID to support Firebase UIDs)
create table public.users (
  id text not null primary key,
  name text,
  email text,
  role text check (role in ('admin', 'citizen', 'worker')) default 'citizen',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable strict RLS and allow anon key to perform operations based on explicit user_id passing
alter table public.users disable row level security;

-- 2. Issue Reports Table
create table public.issue_reports (
  id uuid default gen_random_uuid() primary key,
  user_id text references public.users(id) not null,
  assigned_worker_id text references public.users(id),
  category text not null,
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  image_url text,
  notes text,
  status text default 'Pending' check (status in ('Pending', 'Assigned', 'In Progress', 'Resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Configure RLS for reports
alter table public.issue_reports disable row level security;

-- 3. Bin Locations Table
create table if not exists public.bin_locations (
  id uuid default gen_random_uuid() primary key,
  latitude double precision not null,
  longitude double precision not null,
  area_name text not null
);
alter table public.bin_locations disable row level security;

-- 4. Storage Bucket for Images (Check if it exists first)
insert into storage.buckets (id, name, public) 
values ('report-images', 'report-images', true)
on conflict (id) do nothing;

-- Update Storage Bucket Policies for anon uploads since Firebase users aren't authenticated in Supabase
drop policy if exists "Anyone can upload images" on storage.objects;
create policy "Anyone can upload images" on storage.objects for insert with check ( bucket_id = 'report-images' );
drop policy if exists "Anyone can view images" on storage.objects;
create policy "Anyone can view images" on storage.objects for select using ( bucket_id = 'report-images' );
