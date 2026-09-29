import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Story } from "@/lib/prayers";
import { useTone } from "@/hooks/useTone";

/**
 * A familiar avatar rail — the shape everyone already knows from stories —
 * but ranked by who has the FEWEST people praying, not by who is loudest.
 */
export function AskRail({ items }: { items: Story[] }) {
  const tone = useTone();
  return (
    <section className="rise-in -mx-4 mt-4">
      <div className="flex items-baseline justify-between px-6">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">{tone.say("Waiting on someone", "People to stand with")}</h2>
        <span className="text-[10.5px] text-brass">{tone.say("Fewest prayers first", "Fewest people standing with them first")}</span>
      </div>
      <div className="no-scrollbar mt-3 flex gap-3.5 overflow-x-auto px-5 pb-1">
        <Link to="/record" className="flex w-[62px] shrink-0 flex-col items-center gap-1.5">
          <span className="grid h-[58px] w-[58px] place-items-center rounded-full border border-dashed border-brass/60 bg-card text-brass">
            <Plus className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <span className="text-[10.5px] text-ink-soft">{tone.say("Your ask", "Your hope")}</span>
        </Link>
        {items.map(prayer => {
          const anon = !prayer.author.id;
          return (
            <Link
              key={prayer.id}
              to="/prayer/$id"
              params={{ id: prayer.id }}
              className="tap-scale flex w-[62px] shrink-0 flex-col items-center gap-1.5"
            >
              <span className={`grid h-[58px] w-[58px] place-items-center rounded-full p-[2px] ${prayer.intercession_count < 5 ? "bg-gradient-to-br from-flame to-brass" : "bg-border"}`}>
                <Avatar name={anon ? "?" : prayer.author.name} photo={anon ? null : prayer.author.photo} size={52} className="border-2 border-card" />
              </span>
              <span className="w-full truncate text-center text-[10.5px] text-ink-soft">
                {anon ? "Anonymous" : prayer.author.name.split(" ")[0]}
              </span>
              <span className="w-full text-center text-[9.5px] leading-tight text-brass">{tone.say("Pray", "Stand with them")}</span>
            </Link>
          );
        })}
        {!items.length && (
          <p className="self-center text-[12px] text-ink-soft italic">{tone.say("Everyone here has been prayed for. Bring someone new.", "Everyone here has someone standing with them. Bring someone new.")}</p>
        )}
      </div>
    </section>
  );
}
