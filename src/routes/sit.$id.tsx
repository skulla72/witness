import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Flame } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { loadStory } from "@/lib/prayers";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/sit/$id")({
  staticData: { sitemap: false },
  component: SitWithMe,
  head: () => ({ meta: [
    { title: "Sit with me · Witness" },
    { name: "description", content: "A minute of silent presence with someone's prayer." },
    { property: "og:title", content: "Sit with me · Witness" },
    { property: "og:description", content: "A minute of silent presence with someone's prayer." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function SitWithMe() {
  const { id } = Route.useParams();
  const { userId } = useSession();
  const q = useQuery({ queryKey: ["story", id, userId ?? "anon"], queryFn: () => loadStory(id, userId ?? null), enabled: userId !== undefined });
  const prayer = q.data;

  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const seq: Array<"in" | "hold" | "out"> = ["in", "hold", "out", "hold"];
    const durations = [4000, 2000, 6000, 2000];
    let i = 0;
    setPhase(seq[0]);
    let timeout = setTimeout(function loop() {
      i = (i + 1) % seq.length;
      setPhase(seq[i]);
      timeout = setTimeout(loop, durations[i]);
    }, durations[0]);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (q.isLoading || userId === undefined) {
    return <div className="min-h-[calc(100dvh-6rem)] bg-sit" />;
  }
  if (!prayer) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-ink-soft">This prayer can't be found.</p>
        <Link to="/" className="mt-4 inline-block text-brass underline">Return home</Link>
      </div>
    );
  }

  const showAnon = prayer.is_anonymous && prayer.user_id !== userId;
  const phaseLabel = phase === "in" ? "Breathe in" : phase === "out" ? "Breathe out" : "Hold";
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="-mt-px flex min-h-[calc(100dvh-6rem)] flex-col overflow-hidden bg-sit text-sit-foreground">
      <header className="flex items-center justify-between px-5 pt-5 sm:px-7 sm:pt-7">
        <Button asChild variant="ghost" className="h-9 rounded-full px-2.5 text-[12px] font-normal text-sit-muted hover:bg-sit-surface hover:text-sit-foreground">
          <Link to="/prayer/$id" params={{ id }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Leave quietly
          </Link>
        </Button>
        <span className="text-[10px] uppercase tracking-[0.22em] text-sit-accent">Prayer session</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-4 text-center sm:py-10">
        <div className="rise-in">
          <h1 className="font-serif text-[30px] leading-none text-sit-foreground sm:text-[34px]">Sit with me</h1>
          <p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-sit-muted">You are sitting with</p>
          <p className="mt-1.5 text-[15px] font-medium text-sit-foreground">{showAnon ? "Anonymous" : prayer.author.name}</p>
          <p className="mx-auto mt-2 max-w-sm text-[13px] italic leading-relaxed text-sit-muted">"{prayer.ask_caption}"</p>
        </div>

        <div className="relative my-5 grid h-52 w-52 shrink-0 place-items-center sm:my-10 sm:h-72 sm:w-72">
          <div className="absolute inset-0 rounded-full border border-sit-line/40" aria-hidden />
          <div className="absolute inset-8 rounded-full border border-sit-line/60" aria-hidden />
          <div
            className={`absolute rounded-full bg-sit-glow transition-all ease-in-out ${phase === "in" ? "h-48 w-48 opacity-100 sm:h-64 sm:w-64" : phase === "out" ? "h-28 w-28 opacity-50 sm:h-36 sm:w-36" : "h-40 w-40 opacity-75 sm:h-48 sm:w-48"}`}
            style={{ transitionDuration: phase === "in" ? "4000ms" : phase === "out" ? "6000ms" : "2000ms" }}
            aria-hidden
          />
          <div
            className={`absolute rounded-full border border-sit-line bg-sit-surface transition-all ease-in-out ${phase === "in" ? "h-36 w-36 sm:h-44 sm:w-44" : phase === "out" ? "h-24 w-24 sm:h-32 sm:w-32" : "h-32 w-32 sm:h-40 sm:w-40"}`}
            style={{ transitionDuration: phase === "in" ? "4000ms" : phase === "out" ? "6000ms" : "2000ms" }}
            aria-hidden
          />
          <div className="relative grid h-20 w-20 place-items-center rounded-full border border-sit-accent/30 bg-sit-core shadow-sit">
            <Flame className="h-6 w-6 text-sit-accent" strokeWidth={1.4} />
          </div>
        </div>

        <p className="font-serif text-[21px] text-sit-foreground">{phaseLabel}</p>
        <p className="mt-2 font-mono text-[12px] tabular-nums tracking-[0.18em] text-sit-muted">
          {mm}:{ss}
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-sit-muted">
          {prayer.intercession_count > 0 ? `${prayer.intercession_count} ${prayer.intercession_count === 1 ? "person is" : "people are"} praying` : "Held in quiet presence"}
        </p>
        <p className="mt-4 max-w-[280px] text-[12px] leading-relaxed text-sit-muted sm:mt-7">
          No chat. No likes. Just presence. Stay as long as you can.
        </p>
      </main>

      <footer className="mx-auto w-full max-w-xl px-6 pb-4 text-center sm:pb-9">
        <Button asChild className="h-12 w-full rounded-full bg-sit-foreground text-[13px] tracking-wide text-sit hover:bg-sit-foreground/90 sm:max-w-xs">
          <Link to="/prayer/$id" params={{ id }}>Amen</Link>
        </Button>
      </footer>
    </div>
  );
}
