import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** The signed-in user: `null` when signed out, `undefined` while still unknown. */
export function useSession() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { userId, email, signedIn: userId === undefined ? undefined : userId !== null };
}
