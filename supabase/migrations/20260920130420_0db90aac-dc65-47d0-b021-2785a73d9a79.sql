CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  category TEXT NOT NULL CHECK (category IN ('prayed_for_me', 'answers', 'messages', 'needs', 'weekly_story', 'system')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 300),
  path TEXT CHECK (path IS NULL OR (left(path, 1) = '/' AND left(path, 2) <> '//')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People see their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "People mark their own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_unread_idx
ON public.notifications(user_id, read_at, created_at DESC);

CREATE OR REPLACE FUNCTION private.notify_on_intercession()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  recipient UUID;
  actor_name TEXT;
  label TEXT;
BEGIN
  SELECT author_id INTO recipient FROM public.prayer_posts WHERE id = NEW.prayer_id;
  IF recipient IS NULL OR recipient = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(display_name, ''), 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.sender_id;
  label := CASE NEW.kind
    WHEN 'word' THEN 'wrote you encouragement'
    WHEN 'video' THEN 'sent you a video prayer'
    WHEN 'voice' THEN 'left you a voice prayer'
    ELSE 'prayed for you'
  END;
  INSERT INTO public.notifications(user_id, actor_id, category, title, body, path)
  VALUES (recipient, NEW.sender_id, 'prayed_for_me', COALESCE(actor_name, 'Someone') || ' ' || label, COALESCE(NEW.body, ''), '/prayer/' || NEW.prayer_id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER intercession_notification
AFTER INSERT ON public.intercessions
FOR EACH ROW EXECUTE FUNCTION private.notify_on_intercession();

CREATE OR REPLACE FUNCTION private.notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  recipient UUID;
  actor_name TEXT;
BEGIN
  SELECT COALESCE(NULLIF(display_name, ''), 'Someone') INTO actor_name FROM public.profiles WHERE user_id = NEW.sender_id;
  FOR recipient IN
    SELECT user_id FROM public.conversation_members
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications(user_id, actor_id, category, title, body, path)
    VALUES (recipient, NEW.sender_id, 'messages', COALESCE(actor_name, 'Someone') || ' sent you a message', left(COALESCE(NEW.body, ''), 300), '/messages/' || NEW.conversation_id::text);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER message_notification
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION private.notify_on_message();