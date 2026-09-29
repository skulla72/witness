import { OrgCounselorList } from "@/components/counselors/OrgCounselors";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inviteOrgToClaim } from "@/lib/invites.functions";
import { useSession } from "@/hooks/useSession";
import { ServiceTimes } from "@/components/community/ServiceTimes";
import { ContactPanel } from "@/components/community/ContactPanel";
import { StorePanel } from "@/components/community/StorePanel";
import { GivingPanel } from "@/components/community/GivingPanel";
import { ProfileImage } from "@/components/profile-media/ProfileImage";
import { ProfileMediaGallery } from "@/components/profile-media/ProfileMediaGallery";

import { PrayerRequestForm, PrayerRequestInbox } from "@/components/community/PrayerRequestForm";
import {
  OPEN_TO,
  ORG_PUBLIC_COLUMNS,
  RHYTHMS,
  eventWhen,
  daysAway,
  kindLabel,
  openToLabel,
  placeLine,
  rhythmLabel,
  type Org,
  type OrgEvent,
  type OrgGroup,
} from "@/lib/community";
import { announcements, kindLabel as announcementKind } from "@/lib/orgs";

export const Route = createFileRoute("/community/$slug")({
  staticData: { sitemap: true },
  component: OrgPage,
  head: () => ({
    meta: [
      { title: "An organization on Witness · Community" },
      {
        name: "description",
        content:
          "See who this church or organization is, the groups you can join, and the events they have coming up.",
      },
      { property: "og:title", content: "Community organization · Witness" },
      {
        property: "og:description",
        content: "Groups you can join and events you can come to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <Shell>
      <p className="font-serif text-[18px] text-ink">We couldn't open this page</p>
      <p className="mt-2 text-[13px] text-ink-soft">Try again in a moment.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="font-serif text-[18px] text-ink">No such organization</p>
      <p className="mt-2 text-[13px] text-ink-soft">It may have been removed.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-5 pb-12">
      <Link to="/community" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" /> Community
      </Link>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function OrgPage() {
  const { slug } = Route.useParams();
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const [tab, setTab] = useState<
    "about" | "services" | "contact" | "prayer" | "groups" | "events" | "store" | "giving"
  >("about");


  const orgQuery = useQuery({
    queryKey: ["community", "org", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data as Org;
    },
  });

  const org = orgQuery.data;

  const groupsQuery = useQuery({
    queryKey: ["community", "groups", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_groups")
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at");
      if (error) throw error;
      return data as OrgGroup[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["community", "org-events", org?.id],
    enabled: !!org,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_events")
        .select("*")
        .eq("org_id", org!.id)
        .order("starts_at");
      if (error) throw error;
      return data as OrgEvent[];
    },
  });

  const membershipQuery = useQuery({
    queryKey: ["community", "membership", org?.id, userId],
    enabled: !!org && !!userId,
    queryFn: async () => {
      const [member, groups] = await Promise.all([
        supabase
          .from("organization_members")
          .select("role")
          .eq("org_id", org!.id)
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase.from("group_members").select("group_id").eq("user_id", userId!),
      ]);
      return {
        role: member.data?.role ?? null,
        groupIds: (groups.data ?? []).map(g => g.group_id),
      };
    },
  });

  const role = membershipQuery.data?.role ?? null;
  const isLeader = role === "owner" || role === "leader";
  const joinedGroupIds = membershipQuery.data?.groupIds ?? [];

  const offerThePage = useServerFn(inviteOrgToClaim);

  const followOrg = useMutation({
    mutationFn: async (join: boolean) => {
      if (!org || !userId) return { invited: false as boolean };
      if (join) {
        const { error } = await supabase
          .from("organization_members")
          .insert({ org_id: org.id, user_id: userId, role: "member" });
        if (error) throw error;
        // Nobody looks after this page yet — offer it to them, quietly.
        if (!org.owner_id) {
          try {
            const result = await offerThePage({ data: { orgId: org.id } });
            return { invited: result.outcome === "sent" };
          } catch {
            // Reaching out is a kindness, not part of joining. Never block it.
          }
        }
      } else {
        const { error } = await supabase
          .from("organization_members")
          .delete()
          .eq("org_id", org.id)
          .eq("user_id", userId);
        if (error) throw error;
      }
      return { invited: false as boolean };
    },
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ["community", "membership"] });
      if (result?.invited) {
        toast.success(`We've let ${org?.name ?? "them"} know they can claim their page.`);
      }
    },
  });

  const toggleGroup = useMutation({
    mutationFn: async ({ groupId, join }: { groupId: string; join: boolean }) => {
      if (!userId) return;
      if (join) {
        const { error } = await supabase
          .from("group_members")
          .insert({ group_id: groupId, user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "membership"] }),
  });

  if (orgQuery.isLoading) {
    return (
      <Shell>
        <p className="text-[13px] text-ink-soft">Loading…</p>
      </Shell>
    );
  }
  if (!org) {
    return (
      <Shell>
        <p className="font-serif text-[18px] text-ink">No such organization</p>
      </Shell>
    );
  }

  const upcoming = (eventsQuery.data ?? []).filter(e => new Date(e.starts_at) >= new Date());

  return (
    <div className="px-5 pt-5 pb-12">
      <Link to="/community" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" /> Community
      </Link>

      <header className="mt-4">
        <ProfileImage path={org.cover_path} alt={org.name} shape="wide" organization className="mb-4" />
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
            {kindLabel(org.kind)}
          </span>
          {org.verified && (
            <span className="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-hope">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          )}
          {isLeader && (
            <span className="rounded-full border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10.5px] uppercase tracking-[0.14em] text-ink">
              You lead this
            </span>
          )}
        </div>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">{org.name}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11.5px] text-ink-soft">
          {placeLine(org) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {placeLine(org)}
            </span>
          )}
          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-brass"
            >
              <Globe className="h-3.5 w-3.5" /> Website
            </a>
          )}
        </div>

        {signedIn === true ? (
          <button
            type="button"
            onClick={() => followOrg.mutate(!role)}
            disabled={followOrg.isPending || role === "owner"}
            className={`tap-scale mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] disabled:opacity-60 ${
              role
                ? "border border-border bg-card text-ink-soft"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {followOrg.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : role ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            {role === "owner" ? "You're the owner" : role ? "You're in" : "Join this community"}
          </button>
        ) : (
          <Link
            to="/login"
            className="tap-scale mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground"
          >
            Sign in to join
          </Link>
        )}

        {isLeader ? (
          <Link
            to="/community/manage/$slug"
            params={{ slug: org.slug }}
            className="mt-3 block text-[12.5px] text-brass"
          >
            Run this page — announcements, giving and your plan
          </Link>
        ) : (
          <Link
            to="/community/claim/$slug"
            params={{ slug: org.slug }}
            className="mt-3 block text-[12.5px] text-ink-soft"
          >
            Is this your organization? Claim the page
          </Link>
        )}
      </header>

      <div className="no-scrollbar -mx-5 mt-6 mb-5 flex gap-2 overflow-x-auto px-5">
        {(["about", "services", "contact", "prayer", "groups", "events", "store", "giving"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] capitalize ${
              tab === t ? "border-brass/50 bg-brass/15 text-ink" : "border-border bg-card text-ink-soft"
            }`}
          >
            {t === "prayer" ? "prayer request" : t}
            {t === "groups" && groupsQuery.data ? ` · ${groupsQuery.data.length}` : ""}
            {t === "events" ? ` · ${upcoming.length}` : ""}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <StorePanel orgId={org.id} orgSlug={org.slug} isLeader={isLeader} />
      )}

      {tab === "giving" && (
        <GivingPanel
          orgId={org.id}
          orgSlug={org.slug}
          orgName={org.name}
          isLeader={isLeader}
        />
      )}


      {tab === "about" && (
        <section className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-ink">
            {org.description || "This organization hasn't written its story yet."}
          </p>
          <Announcements orgId={org.id} />
          <ProfileMediaGallery pageType="organization" pageId={org.id} />
          <OrgCounselorList orgId={org.id} />
          {!org.verified && (
            <p className="rounded-xl border border-border bg-card p-3 text-[11.5px] leading-relaxed text-ink-soft">
              Not verified yet. Anyone can create a page, so treat it like a flyer on a notice
              board until a real person has checked it out.
            </p>
          )}
        </section>
      )}

      {tab === "services" && <ServiceTimes orgId={org.id} isLeader={isLeader} />}

      {tab === "contact" && <ContactPanel org={org} isLeader={isLeader} />}

      {tab === "prayer" && (
        <>
          <PrayerRequestForm orgId={org.id} orgName={org.name} />
          {isLeader && <PrayerRequestInbox orgId={org.id} />}
        </>
      )}

      {tab === "groups" && (
        <section className="space-y-3">
          {isLeader && <NewGroupForm orgId={org.id} />}
          {(groupsQuery.data ?? []).map(g => {
            const joined = joinedGroupIds.includes(g.id);
            return (
              <div key={g.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <p className="font-serif text-[16px] leading-tight text-ink">{g.name}</p>
                <p className="mt-1 text-[11.5px] text-ink-soft">
                  {rhythmLabel(g.rhythm)} · {openToLabel(g.open_to)}
                  {!g.accepting ? " · full for now" : ""}
                </p>
                {g.description && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{g.description}</p>
                )}
                {signedIn === true ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup.mutate({ groupId: g.id, join: !joined })}
                    disabled={toggleGroup.isPending || (!joined && !g.accepting)}
                    className={`tap-scale mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] disabled:opacity-60 ${
                      joined
                        ? "border border-border bg-secondary text-ink-soft"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {joined ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {joined ? "Joined — tap to leave" : "Take a seat"}
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="mt-3 inline-flex text-[12px] text-brass"
                  >
                    Sign in to take a seat
                  </Link>
                )}
              </div>
            );
          })}
          {(groupsQuery.data?.length ?? 0) === 0 && !groupsQuery.isLoading && (
            <p className="text-[13px] text-ink-soft">No groups here yet.</p>
          )}
        </section>
      )}

      {tab === "events" && (
        <section className="space-y-3">
          {isLeader && <NewEventForm orgId={org.id} />}
          {upcoming.map(ev => (
            <div key={ev.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-[10.5px] uppercase tracking-[0.16em] text-brass">
                {daysAway(ev.starts_at)}
              </p>
              <p className="mt-1.5 font-serif text-[16px] leading-tight text-ink">{ev.title}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-ink-soft">
                <CalendarDays className="h-3.5 w-3.5" /> {eventWhen(ev.starts_at)}
              </p>
              {ev.place && <p className="mt-1 text-[11.5px] text-ink-soft">{ev.place}</p>}
              {ev.description && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{ev.description}</p>
              )}
              {ev.online_url && (
                <a
                  href={ev.online_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex text-[12px] text-brass"
                >
                  Join online
                </a>
              )}
            </div>
          ))}
          {upcoming.length === 0 && !eventsQuery.isLoading && (
            <p className="text-[13px] text-ink-soft">Nothing on the calendar right now.</p>
          )}
        </section>
      )}
    </div>
  );
}

function NewGroupForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { userId } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rhythm, setRhythm] = useState<string>("weekly");
  const [openTo, setOpenTo] = useState<string>("anyone");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organization_groups").insert({
        org_id: orgId,
        created_by: userId!,
        name: name.trim(),
        description: description.trim(),
        rhythm,
        open_to: openTo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setDescription("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["community", "groups"] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-scale flex w-full items-center gap-2 rounded-2xl border border-brass/30 bg-brass/10 p-4 text-left"
      >
        <Plus className="h-4 w-4 text-brass" />
        <span className="text-[13.5px] text-ink">Add a group</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        create.mutate();
      }}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <input
        required
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Group name"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        placeholder="What happens when you meet?"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-soft"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={rhythm}
          onChange={e => setRhythm(e.target.value)}
          aria-label="How often it meets"
          className="rounded-xl border border-border bg-paper px-3 py-2.5 text-[12.5px] text-ink"
        >
          {RHYTHMS.map(r => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={openTo}
          onChange={e => setOpenTo(e.target.value)}
          aria-label="Who it's open to"
          className="rounded-xl border border-border bg-paper px-3 py-2.5 text-[12.5px] text-ink"
        >
          {OPEN_TO.map(o => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending || !name.trim()}
          className="tap-scale inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add group
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-2 text-[13px] text-ink-soft"
        >
          Cancel
        </button>
      </div>
      {create.isError && (
        <p className="text-[12px] text-destructive">That didn't save. Try again.</p>
      )}
    </form>
  );
}

function NewEventForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { userId } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organization_events").insert({
        org_id: orgId,
        created_by: userId!,
        title: title.trim(),
        starts_at: new Date(when).toISOString(),
        place: place.trim(),
        online_url: onlineUrl.trim() || null,
        description: description.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setWhen("");
      setPlace("");
      setOnlineUrl("");
      setDescription("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["community", "org-events"] });
      qc.invalidateQueries({ queryKey: ["community", "events", "upcoming"] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-scale flex w-full items-center gap-2 rounded-2xl border border-brass/30 bg-brass/10 p-4 text-left"
      >
        <Plus className="h-4 w-4 text-brass" />
        <span className="text-[13.5px] text-ink">Post an event</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        create.mutate();
      }}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <input
        required
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Event name"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        required
        type="datetime-local"
        value={when}
        onChange={e => setWhen(e.target.value)}
        aria-label="When it starts"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none"
      />
      <input
        value={place}
        onChange={e => setPlace(e.target.value)}
        placeholder="Where (address or room)"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        value={onlineUrl}
        onChange={e => setOnlineUrl(e.target.value)}
        placeholder="Online link (optional)"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft"
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={3}
        placeholder="What to expect, what to bring."
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-soft"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending || !title.trim() || !when}
          className="tap-scale inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Post event
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-2 text-[13px] text-ink-soft"
        >
          Cancel
        </button>
      </div>
      {create.isError && (
        <p className="text-[12px] text-destructive">That didn't save. Try again.</p>
      )}
    </form>
  );
}

/** What the organization has been telling its people lately. */
function Announcements({ orgId }: { orgId: string }) {
  const q = useQuery({
    queryKey: ["org", "announcements", orgId],
    queryFn: () => announcements(orgId),
  });
  const rows = q.data ?? [];
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <h2 className="px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Lately</h2>
      {rows.slice(0, 6).map(a => (
        <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-brass">{announcementKind(a.kind)}</p>
          <p className="mt-0.5 text-[13.5px] text-ink">{a.title}</p>
          {a.body && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{a.body}</p>}
          {a.starts_at && (
            <p className="mt-1 text-[11.5px] text-ink-soft">{eventWhen(a.starts_at)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
