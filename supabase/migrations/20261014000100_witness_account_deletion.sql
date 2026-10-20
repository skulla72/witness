-- PREPARED ONLY: review and test on a separate staging project before applying.
-- Storage is cleaned by the server before this atomic relational transaction.
-- No financial API calls are made here; active billing must be resolved first.
-- Preserve shared conversations/groups when their original creator leaves.
-- NULL grants no creator permissions under existing equality-based policies.
ALTER TABLE public.conversations ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.organization_groups ALTER COLUMN created_by DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.witness_delete_account(
  target_user uuid, preflight boolean DEFAULT true
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  t text;
  blocked boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  PERFORM 1 FROM auth.users WHERE id = target_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF EXISTS (SELECT 1 FROM organizations WHERE owner_id = target_user OR claimed_by = target_user) THEN
    RAISE EXCEPTION 'Transfer organization ownership before deleting';
  END IF;
  FOREACH t IN ARRAY ARRAY['donations','fund_gifts','witness_gifts','pro_subscriptions'] LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE user_id = $1
       AND stripe_subscription_id IS NOT NULL
       AND status NOT IN (''canceled'',''cancelled'',''ended'',''expired''))', t)
    INTO blocked USING target_user;
    IF blocked THEN RAISE EXCEPTION 'Resolve recurring billing before deleting'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM org_subscriptions WHERE started_by = target_user
    AND stripe_subscription_id IS NOT NULL AND status NOT IN ('canceled','cancelled','ended','expired')) THEN
    RAISE EXCEPTION 'Resolve organization billing before deleting';
  END IF;
  IF EXISTS (SELECT 1 FROM store_orders WHERE user_id = target_user
    AND status NOT IN ('delivered','canceled','cancelled','refunded')
    AND shipped_at IS NULL) THEN
    RAISE EXCEPTION 'Resolve unfulfilled orders before deleting';
  END IF;
  IF EXISTS (SELECT 1 FROM therapy_sessions
    WHERE (client_id = target_user OR therapist_id = target_user)
      AND status NOT IN ('canceled','cancelled')) THEN
    RAISE EXCEPTION 'Clinical retention review required before deleting';
  END IF;
  IF EXISTS (SELECT 1 FROM job_funds
    WHERE (created_by = target_user OR worker_id = target_user)
      AND status NOT IN ('paid','paid_out','released','canceled','cancelled','refunded')) THEN
    RAISE EXCEPTION 'Resolve funded work before deleting';
  END IF;
  IF preflight THEN RETURN true; END IF;

  -- Retain accounting values; remove contact and free-text personal details.
  FOREACH t IN ARRAY ARRAY['donations','fund_gifts','witness_gifts','job_contributions'] LOOP
    EXECUTE format('UPDATE public.%I SET user_id = NULL, donor_name = NULL,
      email = NULL, note = '''' WHERE user_id = $1', t) USING target_user;
  END LOOP;
  UPDATE store_orders SET user_id = NULL, email = NULL, shipping_name = NULL,
    shipping_address = NULL WHERE user_id = target_user;

  -- Explicitly remove personally authored content which could otherwise be
  -- retained by SET NULL foreign keys. Dependent rows use existing FK rules.
  DELETE FROM prayer_posts WHERE author_id = target_user;
  DELETE FROM gratitude_entries WHERE author_id = target_user;
  DELETE FROM intercessions WHERE sender_id = target_user;
  DELETE FROM messages WHERE sender_id = target_user;
  DELETE FROM organization_prayer_requests WHERE user_id = target_user;
  DELETE FROM need_updates WHERE author_id = target_user;
  DELETE FROM profile_media WHERE owner_id = target_user;
  DELETE FROM prayer_media WHERE owner_id = target_user;
  DELETE FROM support_requests WHERE user_id = target_user;
  DELETE FROM platform_testimonials WHERE author_id = target_user;
  UPDATE conversations SET created_by = NULL WHERE created_by = target_user;
  UPDATE organization_groups SET created_by = NULL WHERE created_by = target_user;

  -- The auth deletion and all FK effects commit together or not at all. An
  -- unexpected restrictive FK fails the transaction rather than losing profile
  -- data while leaving an apparently deleted but still usable account.
  DELETE FROM auth.users WHERE id = target_user;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.witness_delete_account(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.witness_delete_account(uuid, boolean) TO service_role;
