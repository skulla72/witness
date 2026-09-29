import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { BookOpen, Loader2, Check, Sparkles } from "lucide-react";
import { suggestVerses, type VerseSuggestion } from "@/lib/bible.functions";

interface Props {
  /** The prayer, answer, or situation the verses should speak to. */
  situation: string;
  category?: string;
  label?: string;
  /** Called when someone attaches a verse. */
  onSelect?: (verse: VerseSuggestion) => void;
  /** Reference of a verse already attached. */
  selected?: string | null;
}

/** AI-gathered verses that tie a real situation to scripture. */
export function ScriptureSuggest({ situation, category, label, onSelect, selected }: Props) {
  const run = useServerFn(suggestVerses);
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [verses, setVerses] = useState<VerseSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(selected ?? null);

  async function gather() {
    setState("loading");
    setError(null);
    const res = await run({ data: { situation, category, translation: "kjv" } });
    setVerses(res.verses);
    setError(res.error ?? null);
    setState("idle");
  }

  return (
    <section className="mx-5 mt-6 rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2">
        <BookOpen className="h-3.5 w-3.5 text-brass" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          {label ?? "Tie this to scripture"}
        </span>
      </div>

      {!verses.length && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
          Let scripture meet this exact moment — a few passages chosen for what's happening right now.
        </p>
      )}

      <button
        onClick={gather}
        disabled={state === "loading"}
        className="tap-scale mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[12.5px] text-paper disabled:opacity-60"
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching scripture
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" /> {verses.length ? "Find more verses" : "Find verses for this"}
          </>
        )}
      </button>

      {error && <p className="mt-3 text-[12px] text-ink-soft">{error}</p>}

      {verses.length > 0 && (
        <ul className="mt-4 space-y-3">
          {verses.map(v => {
            const isPicked = picked === v.reference;
            return (
              <li
                key={v.reference}
                className={`rounded-2xl border p-3.5 transition-colors ${
                  isPicked ? "border-brass/60 bg-brass/10" : "border-border bg-paper"
                }`}
              >
                <p className="font-serif text-[15px] leading-snug text-ink">"{v.text}"</p>
                <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-brass">{v.reference}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{v.why}</p>
                <div className="mt-3 flex items-center gap-3">
                  {onSelect && (
                    <button
                      onClick={() => {
                        setPicked(v.reference);
                        onSelect(v);
                      }}
                      className="tap-scale inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-ink"
                    >
                      {isPicked ? <Check className="h-3.5 w-3.5 text-brass" /> : null}
                      {isPicked ? "Attached" : "Keep this verse on my prayer"}
                    </button>
                  )}
                  <Link
                    to="/bible"
                    search={{ ref: v.reference }}
                    className="text-[11.5px] text-ink-soft underline decoration-brass/40 underline-offset-4"
                  >
                    Read in context
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
