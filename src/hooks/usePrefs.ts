import { useEffect, useState } from "react";
import {
  DEFAULT_PREFS,
  readPrefs,
  subscribePrefs,
  writePrefs,
  type Prefs,
} from "@/data/personalize";
import { supabase } from "@/integrations/supabase/client";
import { getMySurvey, saveMySurvey } from "@/lib/survey.functions";

/**
 * Reads personalization safely for SSR: the first render always uses defaults,
 * then hydrates from local storage. When someone is signed in, their answers
 * are pulled from (and pushed back to) their account, so the app is shaped the
 * same way on every device they use.
 */
export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setReady(true);
    const unsub = subscribePrefs(() => setPrefs({ ...readPrefs() }));

    let cancelled = false;
    const pull = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      try {
        const remote = await getMySurvey();
        if (cancelled) return;
        if (remote?.done) {
          setPrefs(writePrefs(remote));
        } else if (readPrefs().done) {
          // Local answers exist but the account has none yet — carry them up.
          await saveMySurvey({ data: stripLocal(readPrefs()) });
        }
      } catch {
        /* offline or not signed in — local answers still work */
      }
    };
    void pull();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void pull();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      unsub();
    };
  }, []);

  return {
    prefs,
    ready,
    update: (next: Partial<Prefs>) => {
      const merged = writePrefs(next);
      setPrefs(merged);
      void (async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        try {
          await saveMySurvey({ data: stripLocal(merged) });
        } catch {
          /* keep local answers; retry on next change */
        }
      })();
      return merged;
    },
  };
}

/** Only the fields the account stores. */
function stripLocal(p: Prefs) {
  return {
    done: p.done,
    firstName: p.firstName,
    gender: p.gender,
    seasons: p.seasons,
    intensity: p.intensity,
    anonymousFirst: p.anonymousFirst,
    mensRoom: p.mensRoom,
    lanes: p.lanes,
    serve: p.serve,
    processing: p.processing,
    contact: p.contact,
    timeOfDay: p.timeOfDay,
    groupSize: p.groupSize,
    faithBased: p.faithBased,
    addedFeatures: p.addedFeatures,
    removedFeatures: p.removedFeatures,
    answers: p.answers ?? {},
  };
}
