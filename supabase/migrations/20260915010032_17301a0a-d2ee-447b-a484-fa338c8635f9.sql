create or replace function private.join_group(p_group_id uuid, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
begin
  select id, seats_total, accepting into g
  from public.organization_groups
  where id = p_group_id
  for update;

  if not found then return 'missing'; end if;

  if exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  ) then return 'joined'; end if;

  if not g.accepting then return 'closed'; end if;

  if (select count(*) from public.group_members where group_id = p_group_id) >= g.seats_total then
    return 'full';
  end if;

  insert into public.group_members (group_id, user_id)
  values (p_group_id, p_user_id);
  return 'joined';
end;
$$;

revoke all on function private.join_group(uuid, uuid) from public, anon;
grant execute on function private.join_group(uuid, uuid) to authenticated;

create or replace function public.join_group(p_group_id uuid)
returns text
language sql
set search_path = public
as $$
  select case
    when auth.uid() is null then 'signin'
    else private.join_group(p_group_id, auth.uid())
  end;
$$;

revoke all on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;