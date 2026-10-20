/** Do not expose raw service/permission errors or mistake them for empty groups. */
export function GroupLoadError({ subject, retry, retrying = false }: {
  subject: string;
  retry: () => void;
  retrying?: boolean;
}) {
  return (
    <div role="alert" className="rounded-xl border border-border bg-card p-4 text-[13px] text-ink-soft">
      <p>We couldn't load {subject}. Your connection or access may have changed. Try again; if this continues, contact support.</p>
      <button type="button" onClick={retry} disabled={retrying}
        className="mt-3 min-h-11 rounded-lg border border-border px-4 text-ink disabled:opacity-50">
        {retrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
