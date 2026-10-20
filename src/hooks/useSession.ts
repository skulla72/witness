import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** The signed-in user: `null` when signed out, `undefined` while still unknown. */
export function useSession() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || revision) return;
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
    }).catch(() => {
      if (active) { setUserId(null); setEmail(null); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      revision += 1;
      if (!active) return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return { userId, email, signedIn: userId === undefined ? undefined : userId !== null };
}
