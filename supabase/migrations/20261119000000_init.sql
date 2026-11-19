-- =====================================================================
-- Insole Assessments - initial schema, seed data, RLS and storage
-- =====================================================================
-- Single shared login (Supabase Auth). Any authenticated user = shop staff.
-- Anonymous visitors may only read the public branding settings (login screen).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- assessors
-- ---------------------------------------------------------------------
create table public.assessors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  active      boolean not null default true,
  pin_hash    text,
  has_pin     boolean generated always as (pin_hash is not null) stored,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- arch_types
-- ---------------------------------------------------------------------
create table public.arch_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  price       numeric(10,2) not null default 0 check (price >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.arch_types (name, price, sort_order) values
  ('Gold', 0, 1),
  ('Silver', 0, 2),
  ('Bronze', 0, 3);

-- ---------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------
create sequence public.assessment_order_seq start 1;

create or replace function public.next_order_number()
returns text language sql volatile as $$
  select 'INS-' || lpad(n::text, greatest(3, length(n::text)), '0')
  from (select nextval('public.assessment_order_seq') as n) s;
$$;

create table public.assessments (
  id                      uuid primary key default gen_random_uuid(),
  order_number            text not null unique default public.next_order_number(),
  first_name              text not null check (length(trim(first_name)) > 0),
  last_name               text not null check (length(trim(last_name)) > 0),
  phone                   text not null check (length(trim(phone)) > 0),
  email                   text,
  shoe_size               text,
  issue                   text,
  notes                   text,
  arch_type_id            uuid references public.arch_types(id) on delete set null,
  arch_type_name          text,           -- snapshot, survives arch type rename/delete
  price                   numeric(10,2) not null default 0 check (price >= 0),
  deposit_amount          numeric(10,2) not null default 0 check (deposit_amount >= 0),
  deposit_payment_method  text,           -- Cash / Card / Bank Transfer (editable list in settings)
  balance_due             numeric(10,2) generated always as (price - deposit_amount) stored,
  assessor_id             uuid references public.assessors(id) on delete set null,
  assessor_name           text,           -- snapshot
  status                  text not null default 'new'
                          check (status in ('draft','new','sent_to_supplier','arrived','picked_up','cancelled')),
  foam_photo_right_url    text,           -- storage path in bucket "foam-photos"
  foam_photo_left_url     text,           -- storage path in bucket "foam-photos"
  label_printed           boolean not null default false,
  label_printed_at        timestamptz,
  pdf_path                text,           -- storage path in bucket "pdfs"
  drive_folder_id         text,
  drive_pdf_file_id       text,
  drive_synced_at         timestamptz,
  sent_to_supplier_at     timestamptz,
  arrived_at              timestamptz,
  picked_up_at            timestamptz,
  cancelled_at            timestamptz,
  converted_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references auth.users(id) on delete set null default auth.uid(),
  -- Orders must have an arch type; drafts may leave it "Not decided yet".
  constraint order_needs_arch_type check (status in ('draft','cancelled') or arch_type_id is not null or arch_type_name is not null)
);

create index assessments_status_idx on public.assessments (status, created_at desc);
create index assessments_created_idx on public.assessments (created_at desc);

create or replace function public.assessments_before_write()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    case new.status
      when 'sent_to_supplier' then new.sent_to_supplier_at := coalesce(new.sent_to_supplier_at, now());
      when 'arrived'          then new.arrived_at          := coalesce(new.arrived_at, now());
      when 'picked_up'        then new.picked_up_at        := coalesce(new.picked_up_at, now());
      when 'cancelled'        then new.cancelled_at        := coalesce(new.cancelled_at, now());
      else null;
    end case;
    if tg_op = 'UPDATE' and old.status = 'draft' and new.status in ('new','sent_to_supplier') then
      new.converted_at := now();
    end if;
  end if;
  return new;
end $$;

create trigger assessments_before_write
  before insert or update on public.assessments
  for each row execute function public.assessments_before_write();

-- ---------------------------------------------------------------------
-- settings (key/value). is_public rows are readable on the login screen.
-- ---------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

insert into public.settings (key, value, is_public) values
  -- Shop branding (shown on login, header, label, PDF)
  ('shop_name',            to_jsonb('Reagle Menswear'::text), true),
  ('shop_address',         to_jsonb('415 Bury New Rd, Salford M7 4ED'::text), true),
  ('shop_phone',           to_jsonb('0161 307 8323'::text), true),
  ('primary_color',        to_jsonb('#0A3A6E'::text), true),
  ('accent_color',         to_jsonb('#C29A1E'::text), true),
  ('logo_url',             'null'::jsonb, true),
  -- Field toggles
  ('field_email',          'true'::jsonb, false),
  ('field_notes',          'true'::jsonb, false),
  ('field_issue',          'true'::jsonb, false),
  ('field_shoe_size',      'true'::jsonb, false),
  -- WhatsApp
  ('whatsapp_group_link',  to_jsonb(''::text), false),
  ('whatsapp_group_name',  to_jsonb(''::text), false),
  ('country_code',         to_jsonb('44'::text), false),
  -- Security / payments
  ('assessor_pin_enabled', 'false'::jsonb, false),
  ('payment_methods',      '["Cash","Card","Bank Transfer"]'::jsonb, false),
  -- Google Drive status (non-secret; tokens live in public.integrations)
  ('google_drive',         '{"connected":false}'::jsonb, false);

-- ---------------------------------------------------------------------
-- integrations - secrets (Google refresh token). Service role ONLY.
-- ---------------------------------------------------------------------
create table public.integrations (
  provider    text primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.assessors    enable row level security;
alter table public.arch_types   enable row level security;
alter table public.assessments  enable row level security;
alter table public.settings     enable row level security;
alter table public.integrations enable row level security;  -- no policies => no client access

create policy "staff read assessors"   on public.assessors   for select to authenticated using (true);
create policy "staff insert assessors" on public.assessors   for insert to authenticated with check (true);
create policy "staff update assessors" on public.assessors   for update to authenticated using (true) with check (true);
create policy "staff delete assessors" on public.assessors   for delete to authenticated using (true);

create policy "staff read arch types"   on public.arch_types for select to authenticated using (true);
create policy "staff insert arch types" on public.arch_types for insert to authenticated with check (true);
create policy "staff update arch types" on public.arch_types for update to authenticated using (true) with check (true);
create policy "staff delete arch types" on public.arch_types for delete to authenticated using (true);

create policy "staff read assessments"   on public.assessments for select to authenticated using (true);
create policy "staff insert assessments" on public.assessments for insert to authenticated with check (true);
create policy "staff update assessments" on public.assessments for update to authenticated using (true) with check (true);
create policy "staff delete assessments" on public.assessments for delete to authenticated using (true);

create policy "public read branding"   on public.settings for select to anon using (is_public);
create policy "staff read settings"    on public.settings for select to authenticated using (true);
create policy "staff insert settings"  on public.settings for insert to authenticated with check (key <> 'google_drive');
create policy "staff update settings"  on public.settings for update to authenticated using (key <> 'google_drive') with check (key <> 'google_drive');

-- Hide assessor PIN hashes from the API; PINs are set/checked via RPC only.
revoke all on public.assessors from anon, authenticated;
grant select (id, name, active, has_pin, sort_order, created_at) on public.assessors to authenticated;
grant insert (name, active, sort_order) on public.assessors to authenticated;
grant update (name, active, sort_order) on public.assessors to authenticated;
grant delete on public.assessors to authenticated;

revoke all on public.integrations from anon, authenticated;
revoke all on public.assessments from anon;
revoke all on public.arch_types from anon;

-- ---------------------------------------------------------------------
-- Assessor PIN RPCs (feature is OFF by default - settings.assessor_pin_enabled)
-- ---------------------------------------------------------------------
create or replace function public.set_assessor_pin(p_assessor uuid, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'not allowed';
  end if;
  if p_pin is null or p_pin = '' then
    update public.assessors set pin_hash = null where id = p_assessor;
  elsif p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'PIN must be 4 to 6 digits';
  else
    update public.assessors set pin_hash = crypt(p_pin, gen_salt('bf')) where id = p_assessor;
  end if;
end $$;

create or replace function public.verify_assessor_pin(p_assessor uuid, p_pin text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select auth.role() = 'authenticated' and exists (
    select 1 from public.assessors
    where id = p_assessor and pin_hash is not null and pin_hash = crypt(p_pin, pin_hash)
  );
$$;

revoke execute on function public.set_assessor_pin(uuid, text)    from public, anon;
revoke execute on function public.verify_assessor_pin(uuid, text) from public, anon;
grant  execute on function public.set_assessor_pin(uuid, text)    to authenticated;
grant  execute on function public.verify_assessor_pin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Storage buckets + policies
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('branding',    'branding',    true,  5242880,  array['image/png','image/jpeg']),
  ('foam-photos', 'foam-photos', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('pdfs',        'pdfs',        false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy "branding public read" on storage.objects for select
  using (bucket_id = 'branding');
create policy "branding staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding');
create policy "branding staff update" on storage.objects for update to authenticated
  using (bucket_id = 'branding') with check (bucket_id = 'branding');
create policy "branding staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'branding');

create policy "files staff read" on storage.objects for select to authenticated
  using (bucket_id in ('foam-photos','pdfs'));
create policy "files staff insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('foam-photos','pdfs'));
create policy "files staff update" on storage.objects for update to authenticated
  using (bucket_id in ('foam-photos','pdfs')) with check (bucket_id in ('foam-photos','pdfs'));
create policy "files staff delete" on storage.objects for delete to authenticated
  using (bucket_id in ('foam-photos','pdfs'));
