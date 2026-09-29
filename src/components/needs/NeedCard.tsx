import { Link } from "@tanstack/react-router";
import { Hammer, MapPin, Sparkles, Church, HeartHandshake } from "lucide-react";
import { NeedMedia } from "@/components/needs/NeedMedia";
import { dollars, pctFunded, placeOf, STATUS_LABEL, type NeedWithOrg } from "@/lib/needs";

export function NeedCard({ need, featured }: { need: NeedWithOrg; featured?: boolean }) {
  const pct = pctFunded(need);
  const done = need.status === "completed";
  const place = placeOf(need) || (need.org ? [need.org.city, need.org.region].filter(Boolean).join(", ") : "");

  return (
    <Link
      to="/needs/$id"
      params={{ id: need.id }}
      className={`tap-scale block overflow-hidden rounded-2xl border bg-card shadow-soft ${featured ? "border-brass/50" : "border-border"}`}
    >
      {need.cover_path && <NeedMedia path={need.cover_path} type="image" className="aspect-[16/9] w-full" />}
      <div className="p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-brass">
          {need.kind === "project" ? <Church className="h-3 w-3" /> : <HeartHandshake className="h-3 w-3" />}
          {need.kind === "project" ? "Church project" : "Fix that"}
          {featured && <span className="ml-auto inline-flex items-center gap-1 text-flame"><Sparkles className="h-3 w-3" /> This week's story</span>}
          {done && !featured && <span className="ml-auto text-flame">Done</span>}
        </div>
        <p className="mt-1.5 font-serif text-[17px] leading-tight text-ink">{need.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-soft">
          {need.org && <span>{need.org.name}</span>}
          {place && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {place}</span>}
        </p>
        {need.story && <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink-soft">{need.story}</p>}

        {need.goal_cents > 0 && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full ${done ? "bg-flame" : "bg-hope"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink-soft">
              <span><span className="text-ink">{dollars(need.raised_cents)}</span> of {dollars(need.goal_cents)}</span>
              <span>{STATUS_LABEL[need.status]}</span>
            </div>
          </div>
        )}
        {need.needs_hands && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-paper px-2.5 py-1 text-[11px] text-ink">
            <Hammer className="h-3 w-3 text-brass" />
            {need.hours_needed > 0 ? `${need.hours_needed} hours of hands needed` : "Hands needed"}
            {need.hands_count > 0 && <span className="text-ink-soft">· {need.hands_count} offered</span>}
          </p>
        )}
      </div>
    </Link>
  );
}
