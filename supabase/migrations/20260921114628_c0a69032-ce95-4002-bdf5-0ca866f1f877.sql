-- 1) Donor recognition on fund grants becomes opt-in ------------------------
alter table public.daf_grants
  add column if not exists public_credit boolean not null default false;

drop policy if exists "Anyone can see received named grants" on public.daf_grants;

create or replace function private.grants_for_org_public(_org_id uuid)
returns table(id uuid, org_id uuid, sponsor text, fund_name text, donor_name text,
              anonymous boolean, amount_cents integer, granted_on date, status text,
              note text, reference text, recorded_by uuid, created_at timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  with caller as (
    select (
      private.has_role(auth.uid(), 'admin')
      or exists (
        select 1 from public.organization_members m
        where m.org_id = _org_id
          and m.user_id = auth.uid()
          and m.role = any (array['owner','leader'])
      )
    ) as inside
  )
  select g.id,
         g.org_id,
         case when c.inside or (g.public_credit and not g.anonymous) then g.sponsor else '' end,
         case when c.inside or (g.public_credit and not g.anonymous) then g.fund_name else '' end,
         case when c.inside or (g.public_credit and not g.anonymous) then g.donor_name else '' end,
         g.anonymous,
         g.amount_cents,
         g.granted_on,
         g.status,
         case when c.inside or (g.public_credit and not g.anonymous) then g.note else '' end,
         ''::text,
         null::uuid,
         g.created_at
  from public.daf_grants g
  cross join caller c
  where g.org_id = _org_id
    and g.status = 'received'
  order by g.granted_on desc
$$;

-- 2) Organization street address and contact details are no longer public ----
revoke select on public.organizations from anon;
grant select (id, owner_id, slug, name, kind, city, region, description, logo_url,
              website, verified, google_place_id, claimed_by, claimed_at,
              created_at, updated_at)
  on public.organizations to anon;

-- 3) A professional's phone number moves out of the public page -------------
create table if not exists public.pro_contacts (
  pro_id uuid primary key references public.pro_profiles(id) on delete cascade,
  phone text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.pro_contacts (pro_id, phone)
select id, coalesce(phone, '') from public.pro_profiles
on conflict (pro_id) do nothing;

grant select, insert, update, delete on public.pro_contacts to authenticated;
grant all on public.pro_contacts to service_role;

alter table public.pro_contacts enable row level security;

create policy "A pro keeps their own number"
  on public.pro_contacts for all to authenticated
  using (exists (select 1 from public.pro_profiles p where p.id = pro_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.pro_profiles p where p.id = pro_id and p.user_id = auth.uid()));

create policy "The team reads pro numbers"
  on public.pro_contacts for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

create policy "Whoever hired them can call"
  on public.pro_contacts for select to authenticated
  using (
    exists (
      select 1 from public.service_requests r
      where r.hired_pro_id = pro_contacts.pro_id
        and (
          r.seeker_id = auth.uid()
          or exists (
            select 1 from public.organization_members m
            where m.org_id = r.org_id
              and m.user_id = auth.uid()
              and m.role = any (array['owner','leader'])
          )
        )
    )
  );

alter table public.pro_profiles drop column if exists phone;

-- 4) Avatars are readable only where they are actually someone's photo ------
drop policy if exists "Members view avatars" on storage.objects;

create policy "Members view avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.avatar_url = storage.objects.name)
    )
  );