import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Search } from "lucide-react";
import { BOOKS, TRANSLATIONS, verseOfDay } from "@/lib/bible.data";
import { getPassage, type Passage } from "@/lib/bible.functions";
import { BRAND } from "@/config/brand";
import { usePrefs } from "@/hooks/usePrefs";

export const Route = createFileRoute("/bible")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
  component: BiblePage,
  head: () => ({
    meta: [
      { title: `Read the Bible — ${BRAND.name}` },
      {
        name: "description",
        content:
          "Read any chapter of the Bible, see the verse of the day, and find scripture that speaks to what you're praying about right now.",
      },
      { property: "og:title", content: `Read the Bible — ${BRAND.name}` },
      {
        property: "og:description",
        content: "A full Bible reader alongside your prayers — verse of the day included.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function parseRef(ref: string | undefined) {
  if (!ref) return { book: "Psalms", chapter: 23 };
  const match = ref.match(/^(.*?)\s+(\d+)/);
  if (!match) return { book: "Psalms", chapter: 23 };
  const rawBook = match[1]!.trim().toLowerCase();
  const book =
    BOOKS.find(b => b.name.toLowerCase() === rawBook)?.name ??
    BOOKS.find(b => b.name.toLowerCase().startsWith(rawBook.replace(/^psalm$/, "psalms")))?.name ??
    "Psalms";
  return { book, chapter: Number(match[2]) || 1 };
}

function BiblePage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const { prefs, ready: prefsReady } = usePrefs();
  const initial = useMemo(() => parseRef(ref), [ref]);
  const load = useServerFn(getPassage);

  const [book, setBook] = useState(initial.book);
  const [chapter, setChapter] = useState(initial.chapter);
  const [translation, setTranslation] = useState<string>("kjv");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const chapters = BOOKS.find(b => b.name === book)?.chapters ?? 1;

  useEffect(() => {
    if (prefsReady && prefs.faithBased === false) {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, prefs.faithBased, prefsReady]);

  useEffect(() => {
    if (!prefsReady || prefs.faithBased === false) return;
    let alive = true;
    setLoading(true);
    load({ data: { reference: `${book} ${chapter}`, translation } }).then(res => {
      if (!alive) return;
      setPassage(res);
      setLoading(false);
      window.scrollTo({ top: 0 });
    });
    return () => {
      alive = false;
    };
  }, [book, chapter, translation, load, prefs.faithBased, prefsReady]);

  const vod = verseOfDay();

  function jump(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const parsed = parseRef(query.trim());
    setBook(parsed.book);
    setChapter(Math.min(Math.max(parsed.chapter, 1), BOOKS.find(b => b.name === parsed.book)?.chapters ?? 1));
    setQuery("");
  }

  if (!prefsReady || prefs.faithBased === false) return null;

  return (
    <div className="px-4 pb-10 pt-3">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <select
          value={translation}
          onChange={e => setTranslation(e.target.value)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-ink-soft"
          aria-label="Translation"
        >
          {TRANSLATIONS.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <header className="mt-3 px-1">
        <h1 className="font-serif text-[26px] leading-tight text-ink">The Bible</h1>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          Today: <span className="text-brass">{vod.ref}</span> — "{vod.text}"
        </p>
      </header>

      <form onSubmit={jump} className="mt-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-ink-soft" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Go to a passage — e.g. John 3"
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-soft"
          />
        </div>
        <button type="submit" className="tap-scale rounded-full bg-ink px-4 py-2.5 text-[12.5px] text-paper">
          Go
        </button>
      </form>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <select
          value={book}
          onChange={e => {
            setBook(e.target.value);
            setChapter(1);
          }}
          className="truncate rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-ink"
          aria-label="Book"
        >
          <optgroup label="Old Testament">
            {BOOKS.filter(b => b.testament === "OT").map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </optgroup>
          <optgroup label="New Testament">
            {BOOKS.filter(b => b.testament === "NT").map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </optgroup>
        </select>
        <select
          value={chapter}
          onChange={e => setChapter(Number(e.target.value))}
          className="rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-ink"
          aria-label="Chapter"
        >
          {Array.from({ length: chapters }, (_, i) => i + 1).map(c => (
            <option key={c} value={c}>Ch. {c}</option>
          ))}
        </select>
      </div>

      <article className="mt-5 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-brass" />
          <h2 className="font-serif text-[17px] text-ink">
            {book} {chapter}
          </h2>
        </div>

        {loading ? (
          <p className="mt-6 inline-flex items-center gap-2 text-[13px] text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening the page…
          </p>
        ) : passage?.error ? (
          <p className="mt-4 text-[13px] text-ink-soft">{passage.error}</p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {passage?.verses.map(v => (
              <p key={v.verse} className="text-[15.5px] leading-relaxed text-ink">
                <span className="mr-1.5 align-super text-[10.5px] text-brass">{v.verse}</span>
                {v.text}
              </p>
            ))}
          </div>
        )}
      </article>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setChapter(c => Math.max(1, c - 1))}
          disabled={chapter <= 1}
          className="tap-scale inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2.5 text-[12.5px] text-ink disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <button
          onClick={() => setChapter(c => Math.min(chapters, c + 1))}
          disabled={chapter >= chapters}
          className="tap-scale inline-flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2.5 text-[12.5px] text-ink disabled:opacity-40"
        >
          Next <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
