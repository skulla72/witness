CREATE OR REPLACE FUNCTION private.notify_on_answer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  who UUID;
  asker_name TEXT;
BEGIN
  IF NEW.post_type <> 'answer' OR NEW.parent_prayer_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(display_name, ''), 'Someone') INTO asker_name FROM public.profiles WHERE user_id = NEW.author_id;
  FOR who IN
    SELECT DISTINCT sender_id FROM public.intercessions
    WHERE prayer_id = NEW.parent_prayer_id AND sender_id <> NEW.author_id
  LOOP
    INSERT INTO public.notifications(user_id, actor_id, category, title, body, path)
    VALUES (who, NEW.author_id, 'answers',
      COALESCE(asker_name, 'Someone') || ' shared an answer to the prayer you prayed for',
      'Come see what happened.', '/prayer/' || NEW.parent_prayer_id::text);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER answer_notification
AFTER INSERT ON public.prayer_posts
FOR EACH ROW EXECUTE FUNCTION private.notify_on_answer();

ALTER TABLE public.prayer_posts ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;

CREATE OR REPLACE FUNCTION private.send_prayer_followups()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN
  WITH due AS (
    UPDATE public.prayer_posts p SET followup_sent_at = now()
    WHERE p.post_type = 'ask'
      AND p.followup_sent_at IS NULL
      AND p.created_at < now() - interval '30 days'
      AND p.created_at > now() - interval '90 days'
      AND NOT EXISTS (SELECT 1 FROM public.prayer_posts a WHERE a.parent_prayer_id = p.id)
    RETURNING p.id, p.author_id
  )
  INSERT INTO public.notifications(user_id, category, title, body, path)
  SELECT author_id, 'system', 'Any update on what you shared?',
    'It has been a month. If something changed, even a little, the people who stood with you would love to hear.',
    '/prayer/' || id::text
  FROM due;
END;
$$;

SELECT cron.schedule('prayer-followups-daily', '15 16 * * *', $$SELECT private.send_prayer_followups();$$);