import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hammer, ArrowRight } from "lucide-react";
import { dollars, loadNeedForPrayer, pctFunded } from "@/lib/needs";

/**
 * "Fix that" — the button beside a prayer that turns a need into work and money.
 * The prayer's author (or a leader) opens it; once it exists, everyone can see
 * the fix in progress and the photo when it's done.
 */
export function FixThat({ prayerId, isOwn, enabled }: { prayerId: string; isOwn: boolean; enabled: boolean }) {
  const needQ = useQuery({ queryKey: ["need-for-prayer", prayerId], queryFn: () => loadNeedForPrayer(prayerId), enabled });
  const need = needQ.data;

  if (need) {
    const done = need.status === "completed";
    return (
      <Link
        to="/needs/$id"
        params={{ id: need.id }}
        className={`mx-5 mt-4 flex items-center gap-3 rounded-2xl border p-3.5 ${done ? "border-flame/40 bg-flame/10" : "border-hope/40 bg-hope/10"}`}
      >
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${done ? "bg-flame/20" : "bg-hope/20"}`}>
          <Hammer className={`h-4 w-4 ${done ? "text-flame" : "text-hope"}`} />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13.5px] font-medium text-ink">{done ? "This got fixed." : "Someone's fixing this."}</p>
          <p className="truncate text-[11.5px] text-ink-soft">
            {need.title}
            {need.goal_cents > 0 && ` · ${dollars(need.raised_cents)} of ${dollars(need.goal_cents)} (${pctFunded(need)}%)`}
            {need.needs_hands && need.hands_count > 0 && ` · ${need.hands_count} offered hands`}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
      </Link>
    );
  }

  if (!isOwn || needQ.isLoading) return null;

  return (
    <Link
      to="/needs/new"
      search={{ prayer: prayerId }}
      className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-brass/50 bg-card p-3.5"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brass/15"><Hammer className="h-4 w-4 text-brass-deep" /></div>
      <div className="flex-1 leading-tight">
        <p className="text-[13.5px] font-medium text-ink">Fix that</p>
        <p className="text-[11.5px] text-ink-soft">Is this a tangible need — a repair, a bill, a job? Let people fund it or show up and do it.</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink-soft" />
    </Link>
  );
}
