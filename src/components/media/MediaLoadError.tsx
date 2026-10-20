export function MediaLoadError({ retry, className = "" }: { retry: () => void; className?: string }) {
  return (
    <span role="status" className={`inline-flex flex-col items-center justify-center gap-2 bg-secondary p-2 text-center text-xs text-ink ${className}`}>
      <span>Media couldn't load.</span>
      <button type="button" onClick={event => { event.preventDefault(); event.stopPropagation(); retry(); }}
        className="min-h-11 rounded border border-border px-3">Try again</button>
    </span>
  );
}
