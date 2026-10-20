import { useEffect, useState } from "react";
import {
  DEFAULT_JOURNAL,
  readJournal,
  subscribeJournal,
  writeJournal,
  setJournalAccount,
  journalAccount,
  type JournalState,
} from "@/lib/journal";
import { useSession } from "@/hooks/useSession";

/**
 * SSR-safe read of the private gratitude journal: first render uses defaults,
 * then hydrates from the device.
 */
export function useJournal() {
  const { userId } = useSession();
  const [snapshot, setSnapshot] = useState<{ account: string | null; journal: JournalState }>({ account: null, journal: DEFAULT_JOURNAL });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setJournalAccount(userId ?? null);
    const refresh = () => setSnapshot({ account: journalAccount(), journal: { ...readJournal() } });
    refresh();
    setReady(userId !== undefined);
    return subscribeJournal(refresh);
  }, [userId]);

  return {
    journal: userId && snapshot.account === userId ? snapshot.journal : DEFAULT_JOURNAL,
    ready: ready && userId !== undefined,
    signedIn: Boolean(userId),
    update: (next: Partial<JournalState>) => {
      setJournalAccount(userId ?? null);
      setSnapshot({ account: userId ?? null, journal: { ...writeJournal(next) } });
    },
  };
}
