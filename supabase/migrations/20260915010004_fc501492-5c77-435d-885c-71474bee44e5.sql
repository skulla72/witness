create or replace function public.join_group(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
begin
  if auth.uid() is null then return 'signin'; end if;

  select id, seats_total, accepting into g
  from public.organization_groups
  where id = p_group_id
  for update;

  if not found then return 'missing'; end if;

  if exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  ) then return 'joined'; end if;

  if not g.accepting then return 'closed'; end if;

  if (select count(*) from public.group_members where group_id = p_group_id) >= g.seats_total then
    return 'full';
  end if;

  insert into public.group_members (group_id, user_id)
  values (p_group_id, auth.uid());
  return 'joined';
end;
$$;

revoke all on function public.join_group(uuid) from public;
grant execute on function public.join_group(uuid) to authenticated;

create policy "Moderators can update groups"
on public.organization_groups
for update
to authenticated
using (private.is_moderator(auth.uid()))
with check (private.is_moderator(auth.uid()));

create policy "Moderators can update profiles"
on public.profiles
for update
to authenticated
using (private.is_moderator(auth.uid()))
with check (private.is_moderator(auth.uid()));