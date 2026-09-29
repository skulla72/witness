import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, BadgeCheck, CalendarDays, Church, Plus, ChevronRight, HeartHandshake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ORG_KINDS,
  ORG_PUBLIC_COLUMNS,
  kindLabel,
  placeLine,
  eventWhen,
  daysAway,
  type Org,
  type OrgEvent,
} from "@/lib/community";
import { useTone } from "@/hooks/useTone";
import { ProfileRow } from "@/components/profile-media/ProfileRow";

export const Route = createFileRoute("/community/")({
  staticData: { sitemap: true },
  component: Community,
  head: () => ({
    meta: [
      { title: "Community — churches, ministries and groups · Witness" },
      {
        name: "description",
        content:
          "Find churches, ministries, nonprofits and community groups near you, join one of their groups, and see what they have coming up.",
      },
      { property: "og:title", content: "Community · Witness" },
      {
        property: "og:description",
        content: "Churches and organizations with their own pages, groups and events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type EventWithOrg = OrgEvent & { organizations: Pick<Org, "name" | "slug"> | null };

function Community() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string | null>(null);
  const tone = useTone();

  const orgsQuery = useQuery({
    queryKey: ["community", "orgs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .order("verified", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as Org[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["community", "events", "upcoming"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_events")
        .select("*, organizations(name, slug)")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(6);
      if (error) throw error;
      return data as EventWithOrg[];
    },
  });

  const orgs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (orgsQuery.data ?? []).filter(o => {
      if (kind && o.kind !== kind) return false;
      // Plain experience is a fully separate directory: organizations and nonprofits, never churches or ministries.
      if (!tone.churchFirst && (o.kind === "church" || o.kind === "ministry")) return false;
      if (!needle) return true;
      return `${o.name} ${o.city} ${o.region} ${o.description}`.toLowerCase().includes(needle);
    });
  }, [orgsQuery.data, q, kind, tone.churchFirst]);

  return (
    <div className="px-5 pt-6 pb-10">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Beyond your circle</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Community</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {tone.say(
            "Churches, ministries, nonprofits and community groups with pages of their own — their groups, and what they have coming up.",
            "Organizations, nonprofits and community groups with pages of their own — their groups, and what they have coming up.",
          )}
        </p>
      </header>

      {tone.churchFirst && (<Link
        to="/community/churches"
        className="tap-scale mb-3 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
      >
        <Church className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <span className="min-w-0">
          <span className="block font-serif text-[15.5px] leading-tight text-ink">
            Browse churches
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            Service times, contact details, and a quiet way to ask for prayer.
          </span>
        </span>
        <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-brass" />
      </Link>)}

      <Link
        to="/counselors"
        className="tap-scale mb-3 flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
      >
        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-hope" />
        <span className="min-w-0">
          <span className="block font-serif text-[15.5px] leading-tight text-ink">Find a counselor</span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">Licensed counselors, checked by our team.</span>
        </span>
        <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-brass" />
      </Link>

      <Link
        to="/community/new"
        className="tap-scale mb-5 flex items-start gap-3 rounded-2xl border border-brass/30 bg-brass/10 p-4"
      >
        <Plus className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <span className="min-w-0">
          <span className="block font-serif text-[15.5px] leading-tight text-ink">
            {tone.churchFirst ? "Add your church or organization" : "Add your organization"}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">
            Takes a minute. You'll be able to run groups and post events right away.
          </span>
        </span>
        <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 shrink-0 text-brass" />
      </Link>

      {(eventsQuery.data?.length ?? 0) > 0 && (
        <section aria-labelledby="coming-up" className="mb-7">
          <h2
            id="coming-up"
            className="mb-3 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft"
          >
            Coming up near you
          </h2>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {eventsQuery.data!.map(ev => (
              <Link
                key={ev.id}
                to="/community/$slug"
                params={{ slug: ev.organizations?.slug ?? "" }}
                className="tap-scale w-[232px] shrink-0 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-brass">
                  {daysAway(ev.starts_at)}
                </p>
                <p className="mt-1.5 font-serif text-[15.5px] leading-tight text-ink">{ev.title}</p>
                <p className="mt-1 text-[11.5px] text-ink-soft">{eventWhen(ev.starts_at)}</p>
                <p className="mt-2 text-[11.5px] text-ink-soft">
                  {ev.organizations?.name}
                  {ev.place ? ` · ${ev.place}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink-soft" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or city"
          aria-label="Search organizations"
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-soft"
        />
      </div>

      <div className="no-scrollbar -mx-5 mb-5 flex gap-2 overflow-x-auto px-5">
        <Chip active={kind === null} onClick={() => setKind(null)} label="All" />
        {ORG_KINDS.filter(k => tone.churchFirst || (k.key !== "church" && k.key !== "ministry")).map(k => (
          <Chip
            key={k.key}
            active={kind === k.key}
            onClick={() => setKind(kind === k.key ? null : k.key)}
            label={k.label}
          />
        ))}
      </div>

      {orgsQuery.isLoading && <p className="px-1 text-[13px] text-ink-soft">Loading…</p>}
      {orgsQuery.isError && (
        <p className="px-1 text-[13px] text-ink-soft">
          We couldn't load the directory just now. Pull down to try again.
        </p>
      )}

      <div className="space-y-3">
        {orgs.map(org => (
          <Link
            key={org.id}
            to="/community/$slug"
            params={{ slug: org.slug }}
            className="tap-scale block rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <ProfileRow image={org.logo_url} name={org.name} detail={[kindLabel(org.kind), placeLine(org)].filter(Boolean).join(" · ")} organization />
            {org.description && (
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink-soft">
                {org.description}
              </p>
            )}
          </Link>
        ))}
      </div>

      {!orgsQuery.isLoading && orgs.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <CalendarDays className="mx-auto h-5 w-5 text-ink-soft" />
          <p className="mt-2 font-serif text-[15.5px] text-ink">Nothing here yet</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            No organization matches that. Try another word — or add yours.
          </p>
        </div>
      )}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
        active
          ? "border-brass/50 bg-brass/15 text-ink"
          : "border-border bg-card text-ink-soft"
      }`}
    >
      {label}
    </button>
  );
}
