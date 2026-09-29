import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Church, Clock, MapPin, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { searchChurches, addFoundChurch } from "@/lib/places.functions";
import { ORG_PUBLIC_COLUMNS, placeLine, serviceWhen, type Org, type OrgService } from "@/lib/community";
import { ProfileImage } from "@/components/profile-media/ProfileImage";


export const Route = createFileRoute("/community/churches")({
  staticData: { sitemap: true },
  component: Churches,
  head: () => ({
    meta: [
      { title: "Churches near you — service times and prayer · Witness" },
      {
        name: "description",
        content:
          "Browse churches with their own page: when they gather, how to reach them, and a quiet way to send a prayer request before you ever walk in.",
      },
      { property: "og:title", content: "Churches · Witness" },
      {
        property: "og:description",
        content: "Service times, contact details and a prayer request form for every church.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Churches() {
  const [q, setQ] = useState("");
  const [typed, setTyped] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const { signedIn } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lookup = useServerFn(searchChurches);
  const save = useServerFn(addFoundChurch);

  // One lookup after they stop typing, not one per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setTyped(q.trim()), 450);
    return () => window.clearTimeout(id);
  }, [q]);


  const churchesQuery = useQuery({
    queryKey: ["community", "churches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .eq("kind", "church")
        .order("verified", { ascending: false })
        .order("name");
      if (error) throw error;
      return data as Org[];
    },
  });

  const servicesQuery = useQuery({
    queryKey: ["community", "church-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_services")
        .select("*")
        .order("day_of_week")
        .order("sort");
      if (error) throw error;
      return data as OrgService[];
    },
  });

  const byOrg = useMemo(() => {
    const map = new Map<string, OrgService[]>();
    for (const s of servicesQuery.data ?? []) {
      const list = map.get(s.org_id) ?? [];
      list.push(s);
      map.set(s.org_id, list);
    }
    return map;
  }, [servicesQuery.data]);

  const needle = q.trim();

  const churches = useMemo(() => {
    const lower = needle.toLowerCase();
    return (churchesQuery.data ?? []).filter(c =>
      !lower
        ? true
        : `${c.name} ${c.city} ${c.region} ${c.description}`
            .toLowerCase()
            .includes(lower),
    );
  }, [churchesQuery.data, needle]);

  const found = useQuery({
    queryKey: ["churches", "nationwide", typed],
    enabled: Boolean(signedIn) && typed.length >= 3,
    staleTime: 10 * 60_000,
    queryFn: () => lookup({ data: { query: typed } }),
  });

  // Don't offer a church that already has a page here.
  const fresh = useMemo(() => {
    const here = new Set(
      (churchesQuery.data ?? []).map(c => `${c.name.toLowerCase()}|${c.city.toLowerCase()}`),
    );
    return (found.data?.churches ?? []).filter(
      c => !here.has(`${c.name.toLowerCase()}|${c.city.toLowerCase()}`),
    );
  }, [found.data, churchesQuery.data]);

  const add = async (placeId: string) => {
    setAdding(placeId);
    try {
      const result = await save({ data: { placeId } });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["community"] });
      toast.success("Added. It's unclaimed until someone from the church claims it.");
      navigate({ to: "/community/$slug", params: { slug: result.slug } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That church could not be added.");
    } finally {
      setAdding(null);
    }
  };


  return (
    <div className="px-5 pt-5 pb-10">
      <Link to="/community" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" /> Community
      </Link>

      <header className="mt-4 mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Somewhere to walk in</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Churches</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          When they gather, how to reach them, and a quiet way to ask for prayer before you ever
          show up in person.
        </p>
      </header>

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink-soft" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search any church, city or state"
          aria-label="Search churches"
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-soft"
        />
      </div>

      {churchesQuery.isLoading && <p className="px-1 text-[13px] text-ink-soft">Loading…</p>}

      <div className="space-y-3">
        {churches.map(c => {
          const services = (byOrg.get(c.id) ?? []).slice(0, 2);
          return (
            <Link
              key={c.id}
              to="/community/$slug"
              params={{ slug: c.slug }}
              className="tap-scale block rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <ProfileImage path={c.logo_url} alt={`${c.name} logo`} organization className="h-14 w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                      <Church className="h-3 w-3" /> Church
                    </span>
                    {c.verified && (
                      <span className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-hope">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-serif text-[17px] leading-tight text-ink">{c.name}</p>
                </div>
              </div>
              {(c.address || placeLine(c)) && (
                <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-soft">
                  <MapPin className="h-3.5 w-3.5" /> {c.address || placeLine(c)}
                </p>
              )}
              {services.length > 0 && (
                <p className="mt-2 flex items-center gap-1 text-[11.5px] text-ink-soft">
                  <Clock className="h-3.5 w-3.5" />
                  {services.map(s => `${s.label} · ${serviceWhen(s)}`).join("  |  ")}
                </p>
              )}
              <p className="mt-3 text-[12px] text-brass">Services, contact and prayer request →</p>
            </Link>
          );
        })}
      </div>

      {!churchesQuery.isLoading && churches.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 text-center">
          <Church className="mx-auto h-5 w-5 text-ink-soft" />
          <p className="mt-2 font-serif text-[15.5px] text-ink">No church here yet by that name</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Keep typing a city or a name — churches across the country are below.
          </p>
        </div>
      )}

      {signedIn && needle.length >= 3 && (
        <section className="mt-7">
          <p className="px-1 text-[10.5px] uppercase tracking-[0.2em] text-ink-soft">
            Churches across the country
          </p>
          {found.isFetching && <p className="mt-2 px-1 text-[13px] text-ink-soft">Looking…</p>}
          {found.data?.error && (
            <p className="mt-2 px-1 text-[12.5px] text-ink-soft">{found.data.error}</p>
          )}
          {!found.isFetching && found.data && !found.data.error && fresh.length === 0 && (
            <p className="mt-2 px-1 text-[12.5px] text-ink-soft">
              Nothing else found for that. Try a city and state.
            </p>
          )}
          <div className="mt-2 space-y-3">
            {fresh.map(c => (
              <div key={c.placeId} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-serif text-[16.5px] leading-tight text-ink">{c.name}</p>
                {c.address && (
                  <p className="mt-1 flex items-start gap-1 text-[11.5px] text-ink-soft">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c.address}
                  </p>
                )}
                <button
                  type="button"
                  disabled={adding === c.placeId}
                  onClick={() => add(c.placeId)}
                  className="tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-paper disabled:opacity-60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {adding === c.placeId ? "Adding…" : "Add to Witness"}
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-ink-soft">
            These come from public map records. A church page is unclaimed until someone from that
            church claims it, so service times and contacts may still be missing.
          </p>
        </section>
      )}
    </div>
  );
}

