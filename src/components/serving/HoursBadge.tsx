import { Link } from "@tanstack/react-router";
import { BadgeCheck, Clock } from "lucide-react";
import { formatTotal } from "@/lib/perks";

interface Props {
  userId: string;
  hoursVerified: number;
  hoursSelf: number;
  businessName?: string;
  businessLine?: string;
  /** Show the badge even at zero hours (own profile). */
  showEmpty?: boolean;
}

/**
 * The public serving mark. Hours are the one number this app shows in the open —
 * the contractor's "faith review", the neighbor's quiet record. Never dollars.
 */
export function HoursBadge({ userId, hoursVerified, hoursSelf, businessName, businessLine, showEmpty }: Props) {
  if (!showEmpty && hoursVerified + hoursSelf <= 0) return null;
  const servant = hoursVerified >= 50;
  return (
    <Link
      to="/badge/$id"
      params={{ id: userId }}
      className={`inline-flex max-w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2 text-left ${servant ? "border-brass/50 bg-brass/10" : "border-border bg-card"}`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${servant ? "bg-brass/25" : "bg-secondary"}`}>
        {servant ? <BadgeCheck className="h-4 w-4 text-brass-deep" /> : <Clock className="h-4 w-4 text-ink" />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] text-ink">
          <span className="font-medium">{formatTotal("goer", hoursVerified)}</span> verified
          {hoursSelf > 0 && <span className="text-ink-soft"> · {formatTotal("goer", hoursSelf)} self-reported</span>}
        </span>
        <span className="block truncate text-[11px] text-ink-soft">
          {businessName ? `${businessName}${businessLine ? ` · ${businessLine}` : ""}` : servant ? "Verified Servant" : "Hours served"}
        </span>
      </span>
    </Link>
  );
}
