alter table public.nonprofit_spotlights add column if not exists org_id uuid references public.organizations(id) on delete set null;

update public.nonprofit_spotlights s
set org_id = o.id
from public.organizations o
where lower(o.name) = lower(s.name);

update public.nonprofit_spotlights set cover_url = '/spotlights/second-mile.jpg' where lower(name) = 'second mile homes';
update public.nonprofit_spotlights set cover_url = '/spotlights/after-the-casseroles.jpg' where lower(name) = 'after the casseroles';
update public.nonprofit_spotlights set cover_url = '/spotlights/no-trash-bags.jpg' where lower(name) = 'no trash bags';