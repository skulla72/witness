import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Phone } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import type { Pro } from "@/lib/pros";
import { proPhone, proPlace } from "@/lib/pros";

/**
 * "Here's who's coming to your door." Photo, name, the work they do and a short
 * bio, so nobody wonders who just pulled into the driveway. The phone number is
 * fetched separately — only the household that hired them can read it.
 */
export function TechCard({
  pro,
  headsUpAt,
  headsUpNote,
}: {
  pro: Pro;
  headsUpAt?: string | null;
  headsUpNote?: string | null;
}) {
  const bio = pro.about?.trim() || pro.headline?.trim() || "";
  const phone = useQuery({
    queryKey: ["pros", "phone", pro.id],
    queryFn: () => proPhone(pro.id),
  });
  return (
    <section className="rounded-2xl border border-brass/40 bg-brass/5 p-4 shadow-soft">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-brass-deep">
        Who's coming to your door
      </h2>
      <div className="flex items-start gap-3">
        <Avatar name={pro.display_name} photo={pro.photo_url} size={72} />
        <div className="min-w-0">
          <Link
            to="/pro/$slug"
            params={{ slug: pro.slug }}
            className="font-serif text-[18px] leading-tight text-ink"
          >
            {pro.display_name}
          </Link>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            {[pro.trade, proPlace(pro)].filter(Boolean).join(" · ")}
          </p>
          {pro.id_verified_at ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-brass-deep">
              <BadgeCheck className="h-3.5 w-3.5" /> Identity verified
            </p>
          ) : (
            <p className="mt-1 text-[11.5px] text-ink-soft">Identity check not finished yet.</p>
          )}
        </div>
      </div>

      {bio && <p className="mt-3 text-[13px] leading-relaxed text-ink">{bio}</p>}

      {headsUpAt && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <p className="text-[12.5px] text-ink">
            {pro.display_name.split(" ")[0]} said they're on the way
            {" · "}
            <span className="text-ink-soft">
              {new Date(headsUpAt).toLocaleString(undefined, {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </p>
          {headsUpNote && (
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{headsUpNote}</p>
          )}
        </div>
      )}

      {phone.data && (
        <a
          href={`tel:${phone.data.replace(/[^0-9+]/g, "")}`}
          className="tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
        >
          <Phone className="h-3.5 w-3.5" /> Call them
        </a>
      )}
    </section>
  );
}
