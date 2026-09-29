import type { WalkGroup } from "@/lib/groups";

/** Small honest labels: who the room is for, and how full it is. */
export function GroupBadges({ group }: { group: WalkGroup }) {
  const badges: string[] = [];
  if (group.tone === "mens") badges.push("Men only");
  if (group.seats_open === 0) badges.push("Full for now");
  else if (group.seats_open <= 2) badges.push(`${group.seats_open} seats left`);
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map(b => (
        <span
          key={b}
          className="rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-brass"
        >
          {b}
        </span>
      ))}
    </div>
  );
}
