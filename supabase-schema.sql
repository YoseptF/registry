-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  phone text,
  address text,
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create classes table
create table public.classes (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  instructor text,
  schedule text,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create class_memberships table
create table public.class_memberships (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(class_id, user_id)
);

-- Create temporary_users table
create table public.temporary_users (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  class_id uuid references public.classes(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create check_ins table
create table public.check_ins (
  id uuid default uuid_generate_v4() primary key,
  class_id uuid references public.classes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  checked_in_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_temporary_user boolean default false not null
);

-- Create indexes for better query performance
create index idx_class_memberships_user on public.class_memberships(user_id);
create index idx_class_memberships_class on public.class_memberships(class_id);
create index idx_check_ins_class on public.check_ins(class_id);
create index idx_check_ins_user on public.check_ins(user_id);
create index idx_check_ins_time on public.check_ins(checked_in_at desc);

-- Row Level Security (RLS) Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_memberships enable row level security;
alter table public.check_ins enable row level security;
alter table public.temporary_users enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Classes policies
create policy "Classes are viewable by everyone"
  on public.classes for select
  using (true);

create policy "Admins can create classes"
  on public.classes for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update classes"
  on public.classes for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete classes"
  on public.classes for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Class memberships policies
create policy "Memberships are viewable by enrolled users and admins"
  on public.class_memberships for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can create memberships"
  on public.class_memberships for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete memberships"
  on public.class_memberships for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Check-ins policies
create policy "Check-ins are viewable by user or admin"
  on public.check_ins for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can create check-ins"
  on public.check_ins for insert
  with check (true);

create policy "Admins can delete check-ins"
  on public.check_ins for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Temporary users policies
create policy "Temporary users are viewable by admins"
  on public.temporary_users for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Anyone can create temporary users"
  on public.temporary_users for insert
  with check (true);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to check if user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;
