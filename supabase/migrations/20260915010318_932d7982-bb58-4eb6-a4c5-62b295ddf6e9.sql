create policy "Moderators read conversations with reported messages"
on public.conversations
for select
to authenticated
using (
  private.is_moderator(auth.uid())
  and exists (
    select 1
    from public.messages m
    join public.content_reports cr on cr.target_type = 'message' and cr.target_id = m.id
    where m.conversation_id = conversations.id
  )
);

create policy "Moderators read members of conversations with reported messages"
on public.conversation_members
for select
to authenticated
using (
  private.is_moderator(auth.uid())
  and exists (
    select 1
    from public.messages m
    join public.content_reports cr on cr.target_type = 'message' and cr.target_id = m.id
    where m.conversation_id = conversation_members.conversation_id
  )
);