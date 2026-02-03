-- Create enum for content types
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'library_content_type') then
    create type library_content_type as enum ('video', 'image', 'pdf', 'document', 'text', 'link');
  end if;
end $$;

-- Create library items table
create table if not exists library_items (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text not null unique,
  description text,
  type library_content_type not null,
  content_url text,
  content_text text,
  metadata jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users(id)
);

-- Enable RLS
alter table library_items enable row level security;

-- Policies

-- Everyone can read active items
drop policy if exists "Library items are viewable by everyone" on library_items;
create policy "Library items are viewable by everyone" on library_items
  for select using (is_active = true);

-- Admins can insert
drop policy if exists "Admins can insert library items" on library_items;
create policy "Admins can insert library items" on library_items
  for insert with check (
    auth.jwt() ->> 'role' = 'service_role' or 
    exists (
      select 1 from users_unified 
      where id = auth.uid() 
      and role in ('ADMIN', 'MANAGER')
    )
  );

-- Admins can update
drop policy if exists "Admins can update library items" on library_items;
create policy "Admins can update library items" on library_items
  for update using (
    auth.jwt() ->> 'role' = 'service_role' or 
    exists (
      select 1 from users_unified 
      where id = auth.uid() 
      and role in ('ADMIN', 'MANAGER')
    )
  );

-- Admins can delete
drop policy if exists "Admins can delete library items" on library_items;
create policy "Admins can delete library items" on library_items
  for delete using (
    auth.jwt() ->> 'role' = 'service_role' or 
    exists (
      select 1 from users_unified 
      where id = auth.uid() 
      and role in ('ADMIN', 'MANAGER')
    )
  );

-- Storage Bucket for Library
insert into storage.buckets (id, name, public)
values ('library-assets', 'library-assets', true)
on conflict (id) do nothing;

-- Storage Policies
drop policy if exists "Library assets are public" on storage.objects;
create policy "Library assets are public" on storage.objects
  for select using ( bucket_id = 'library-assets' );

drop policy if exists "Admins can upload library assets" on storage.objects;
create policy "Admins can upload library assets" on storage.objects
  for insert with check (
    bucket_id = 'library-assets' and (
      auth.jwt() ->> 'role' = 'service_role' or 
      exists (
        select 1 from users_unified 
        where id = auth.uid() 
        and role in ('ADMIN', 'MANAGER')
      )
    )
  );

drop policy if exists "Admins can update library assets" on storage.objects;
create policy "Admins can update library assets" on storage.objects
  for update using (
    bucket_id = 'library-assets' and (
      auth.jwt() ->> 'role' = 'service_role' or 
      exists (
        select 1 from users_unified 
        where id = auth.uid() 
        and role in ('ADMIN', 'MANAGER')
      )
    )
  );

drop policy if exists "Admins can delete library assets" on storage.objects;
create policy "Admins can delete library assets" on storage.objects
  for delete using (
    bucket_id = 'library-assets' and (
      auth.jwt() ->> 'role' = 'service_role' or 
      exists (
        select 1 from users_unified 
        where id = auth.uid() 
        and role in ('ADMIN', 'MANAGER')
      )
    )
  );

-- Seed Data (Insert default items only if they don't exist)
INSERT INTO library_items (title, slug, description, type, content_url, metadata, is_active)
SELECT 'Manual do Colaborador', 'manual-colaborador', 'Guia completo com normas, cultura e benefícios da empresa.', 'link', '/manual', '{"icon": "book", "backgroundColor": "#eff6ff", "textColor": "#1e3a8a"}', true
WHERE NOT EXISTS (SELECT 1 FROM library_items WHERE slug = 'manual-colaborador');

INSERT INTO library_items (title, slug, description, type, content_url, metadata, is_active)
SELECT 'Políticas Internas', 'politicas-internas', 'Políticas de compliance, segurança e diretrizes corporativas.', 'link', '/politicas', '{"icon": "shield", "backgroundColor": "#f0fdf4", "textColor": "#14532d"}', true
WHERE NOT EXISTS (SELECT 1 FROM library_items WHERE slug = 'politicas-internas');

INSERT INTO library_items (title, slug, description, type, content_url, metadata, is_active)
SELECT 'Procedimentos Operacionais', 'procedimentos', 'Guias passo-a-passo para rotinas e processos de trabalho.', 'link', '/procedimentos', '{"icon": "list", "backgroundColor": "#fff7ed", "textColor": "#7c2d12"}', true
WHERE NOT EXISTS (SELECT 1 FROM library_items WHERE slug = 'procedimentos');

INSERT INTO library_items (title, slug, description, type, content_url, metadata, is_active)
SELECT 'Guia Offshore', 'guia-offshore', 'Informações essenciais para embarque e vida a bordo.', 'link', '/guia-offshore', '{"icon": "anchor", "backgroundColor": "#f0f9ff", "textColor": "#0c4a6e"}', true
WHERE NOT EXISTS (SELECT 1 FROM library_items WHERE slug = 'guia-offshore');
