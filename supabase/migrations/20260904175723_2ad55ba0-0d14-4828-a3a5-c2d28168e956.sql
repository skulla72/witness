DROP POLICY "Leaders can update their organization" ON public.organizations;
DROP POLICY "Leaders can add members" ON public.organization_members;
DROP POLICY "Leaders can change roles" ON public.organization_members;
DROP POLICY "People can leave, leaders can remove" ON public.organization_members;
DROP POLICY "Leaders can create groups" ON public.organization_groups;
DROP POLICY "Leaders can update groups" ON public.organization_groups;
DROP POLICY "Leaders can delete groups" ON public.organization_groups;
DROP POLICY "People can leave a group" ON public.group_members;
DROP POLICY "Leaders can post events" ON public.organization_events;
DROP POLICY "Leaders can update events" ON public.organization_events;
DROP POLICY "Leaders can delete events" ON public.organization_events;

DROP FUNCTION public.is_org_leader(uuid, uuid);

CREATE POLICY "Leaders can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM public.organization_members m
               WHERE m.org_id = organizations.id AND m.user_id = auth.uid() AND m.role IN ('owner','leader'))
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR EXISTS (SELECT 1 FROM public.organization_members m
               WHERE m.org_id = organizations.id AND m.user_id = auth.uid() AND m.role IN ('owner','leader'))
  );

CREATE POLICY "Owners can add members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o
                      WHERE o.id = organization_members.org_id AND o.owner_id = auth.uid()));

CREATE POLICY "Owners can change roles"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o
                 WHERE o.id = organization_members.org_id AND o.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o
                      WHERE o.id = organization_members.org_id AND o.owner_id = auth.uid()));

CREATE POLICY "People can leave, owners can remove"
  ON public.organization_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.organizations o
               WHERE o.id = organization_members.org_id AND o.owner_id = auth.uid())
  );

CREATE POLICY "Leaders can create groups"
  ON public.organization_groups FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.organization_members m
                WHERE m.org_id = organization_groups.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader'))
  );

CREATE POLICY "Leaders can update groups"
  ON public.organization_groups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.org_id = organization_groups.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m
                      WHERE m.org_id = organization_groups.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader')));

CREATE POLICY "Leaders can delete groups"
  ON public.organization_groups FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.org_id = organization_groups.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader')));

CREATE POLICY "People can leave a group"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.organization_groups g
               JOIN public.organization_members m ON m.org_id = g.org_id
               WHERE g.id = group_members.group_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader'))
  );

CREATE POLICY "Leaders can post events"
  ON public.organization_events FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.organization_members m
                WHERE m.org_id = organization_events.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader'))
  );

CREATE POLICY "Leaders can update events"
  ON public.organization_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.org_id = organization_events.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m
                      WHERE m.org_id = organization_events.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader')));

CREATE POLICY "Leaders can delete events"
  ON public.organization_events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organization_members m
                 WHERE m.org_id = organization_events.org_id AND m.user_id = auth.uid() AND m.role IN ('owner','leader')));