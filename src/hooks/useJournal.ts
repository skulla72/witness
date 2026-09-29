import { useEffect, useState } from "react";
import {
  DEFAULT_JOURNAL,
  readJournal,
  subscribeJournal,
  writeJournal,
  type JournalState,
} from "@/lib/journal";

/**
 * SSR-safe read of the private gratitude journal: first render uses defaults,
 * then hydrates from the device.
 */
export function useJournal() {
  const [state, setState] = useState<JournalState>(DEFAULT_JOURNAL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState({ ...readJournal() });
    setReady(true);
    return subscribeJournal(() => setState({ ...readJournal() }));
  }, []);

  return {
    journal: state,
    ready,
    update: (next: Partial<JournalState>) => setState({ ...writeJournal(next) }),
  };
}
