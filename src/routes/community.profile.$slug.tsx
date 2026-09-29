import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, HandHeart, Loader2, MessageCircle, Pencil } from "lucide-react";
import { BRAND } from "@/config/brand";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ORG_KINDS, ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";
import { notificationInbox, markNotificationRead } from "@/lib/notificationInbox";
import { listThreads, personName } from "@/lib/messaging";
import { ProfileMediaManager } from "@/components/profile-media/ProfileMediaManager";
import { ProfilePictureEditor } from "@/components/profile-media/ProfilePictureEditor";

export const Route = createFileRoute("/community/profile/$slug")({
  staticData: { sitemap: false },
  component: OrgProfile,
  head: () => ({
    meta: [
      { title: `Your organization profile · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Edit what people see about your organization, and read the alerts and messages that come to you.",
      },
      { property: "og:title", content: `Your organization profile · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Your organization's details, alerts and messages in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const muted = "text-[13px] leading-relaxed text-ink-soft";
const field =
  "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft/60";

function OrgProfile() {
  const { slug } = Route.useParams();
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();

  const org = useQuery({
    queryKey: ["org", slug],
    queryFn: async (): Promise<Org | null> => {
      const { data } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      return (data as Org) ?? null;
    },
  });
  const orgId = org.data?.id;

  const role = useQuery({
    queryKey: ["org", "role", orgId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("role")
        .eq("org_id", orgId!)
        .eq("user_id", userId!)
        .maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!orgId && !!userId,
  });
  const isLeader = role.data === "owner" || role.data === "leader";

  if (org.isLoading) {
    return (
      <Shell slug={slug} name="Your organization">
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }
  if (!org.data) {
    return (
      <Shell slug={slug} name="Your organization">
        <p className={muted}>We couldn't find that page.</p>
      </Shell>
    );
  }
  if (signedIn === false || (role.isFetched && !isLeader)) {
    return (
      <Shell slug={slug} name={org.data.name}>
        <p className={muted}>This screen is for the people who run {org.data.name}.</p>
        <Link to="/login" className="mt-3 inline-flex text-[12.5px] text-brass">
          Sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell slug={slug} name={org.data.name}>
      <Details org={org.data} onSaved={() => void qc.invalidateQueries({ queryKey: ["org"] })} />
      <ProfileMediaManager pageType="organization" pageId={org.data.id} />
      <PrayerAsks orgId={org.data.id} />
      <Alerts />
      <Messages userId={userId ?? null} />
    </Shell>
  );
}

/* ---------- Details ---------- */

function Details({ org, onSaved }: { org: Org; onSaved: () => void }) {
  const { signedIn } = useSession();
  const [name, setName] = useState(org.name);
  const [kind, setKind] = useState(org.kind);
  const [city, setCity] = useState(org.city ?? "");
  const [region, setRegion] = useState(org.region ?? "");
  const [description, setDescription] = useState(org.description ?? "");
  const [website, setWebsite] = useState(org.website ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [logo, setLogo] = useState(org.logo_url);
  const [cover, setCover] = useState(org.cover_path);

  const saveImage = async (column: "logo_url" | "cover_path", path: string | null) => {
    const patch = column === "logo_url" ? { logo_url: path } : { cover_path: path };
    const { error } = await supabase.from("organizations").update(patch).eq("id", org.id);
    if (error) throw error;
    if (column === "logo_url") setLogo(path); else setCover(path);
    onSaved();
  };

  const contact = useQuery({
    queryKey: ["community", "org-contact", org.id],
    enabled: signedIn === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("contact_email, contact_phone, address")
        .eq("id", org.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { contact_email: null, contact_phone: null, address: null };
    },
  });

  useEffect(() => {
    if (!contact.data) return;
    setPhone(contact.data.contact_phone ?? "");
    setEmail(contact.data.contact_email ?? "");
    setAddress(contact.data.address ?? "");
  }, [contact.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: name.trim().slice(0, 120),
          kind,
          city: city.trim(),
          region: region.trim(),
          description: description.trim().slice(0, 1200),
          website: website.trim() || null,
          contact_email: email.trim() || null,
          contact_phone: phone.trim() || null,
          address: address.trim(),
        })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved. Your page shows it now.");
      onSaved();
    },
    onError: () => toast.error("That didn't save."),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        <Pencil className="h-3.5 w-3.5" /> What people see
      </h2>
      <form
        className="space-y-2"
        onSubmit={e => {
          e.preventDefault();
          if (name.trim().length < 2) {
            toast.error("Your organization needs a name.");
            return;
          }
          save.mutate();
        }}
      >
        <div className="grid gap-4 pb-2 md:grid-cols-[140px_1fr]">
          <ProfilePictureEditor pageType="organization" pageId={org.id} value={logo} shape="square" label="Square logo" onSaved={path => saveImage("logo_url", path)} />
          <ProfilePictureEditor pageType="organization" pageId={org.id} value={cover} shape="wide" label="Wide profile image" onSaved={path => saveImage("cover_path", path)} />
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={120} className={field} />
        <div className="flex flex-wrap gap-2 py-1">
          {ORG_KINDS.map(k => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`rounded-full border px-3 py-1.5 text-[12px] ${
                kind === k.key
                  ? "border-brass/50 bg-brass/10 text-brass-deep"
                  : "border-border text-ink-soft"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" maxLength={80} className={field} />
          <input value={region} onChange={e => setRegion(e.target.value)} placeholder="State" maxLength={40} className={field} />
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          maxLength={1200}
          placeholder="Who you are, in your own words."
          className={field}
        />
        <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" maxLength={300} className={field} />
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" maxLength={200} className={field} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" maxLength={40} className={field} />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          maxLength={200}
          className={field}
        />
        <p className="text-[11px] leading-relaxed text-ink-soft">
          The street address, phone and email are only shown to people who are signed in.
        </p>
        <button
          type="submit"
          disabled={save.isPending}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
      </form>
    </section>
  );
}

/* ---------- Prayer asks sent to the organization ---------- */

function PrayerAsks({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const asks = useQuery({
    queryKey: ["org", "prayer-asks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_prayer_requests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const prayed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_prayer_requests")
        .update({ prayed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["org", "prayer-asks"] }),
    onError: () => toast.error("We couldn't mark that."),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        <HandHeart className="h-3.5 w-3.5" /> Asks sent to you
      </h2>
      {asks.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      ) : (asks.data ?? []).length === 0 ? (
        <p className={muted}>Nothing yet. When someone asks your organization for prayer, it lands here.</p>
      ) : (
        <div className="space-y-2">
          {(asks.data ?? []).map(a => (
            <div key={a.id} className="rounded-xl border border-border bg-paper p-3">
              <p className="text-[13px] text-ink">{a.name || "Someone"}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{a.request}</p>
              {a.contact && <p className="mt-1 text-[11.5px] text-ink-soft">{a.contact}</p>}
              <div className="mt-2 flex items-center gap-3">
                {a.keep_private && <span className="text-[11px] text-ink-soft">Kept private</span>}
                {a.prayed ? (
                  <span className="text-[11px] text-brass-deep">Prayed for</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => prayed.mutate(a.id)}
                    className="text-[12px] text-brass"
                  >
                    We prayed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Alerts ---------- */

function Alerts() {
  const qc = useQueryClient();
  const alerts = useQuery({
    queryKey: ["notifications", "inbox"],
    queryFn: () => notificationInbox(12),
  });

  const read = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        <Bell className="h-3.5 w-3.5" /> Your alerts
      </h2>
      {alerts.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      ) : (alerts.data ?? []).length === 0 ? (
        <p className={muted}>Nothing new right now.</p>
      ) : (
        <div className="space-y-2">
          {(alerts.data ?? []).map(n => (
            <div
              key={n.id}
              className={`rounded-xl border p-3 ${
                n.read_at ? "border-border bg-paper" : "border-brass/40 bg-brass/5"
              }`}
            >
              <p className="text-[13px] text-ink">{n.title}</p>
              {n.body && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{n.body}</p>}
              {!n.read_at && (
                <button
                  type="button"
                  onClick={() => read.mutate(n.id)}
                  className="mt-1.5 text-[12px] text-brass"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <Link to="/notifications" className="mt-3 inline-flex text-[12.5px] text-brass">
        See every alert
      </Link>
    </section>
  );
}

/* ---------- Messages ---------- */

function Messages({ userId }: { userId: string | null }) {
  const threads = useQuery({
    queryKey: ["messages", "threads", userId],
    enabled: !!userId,
    queryFn: () => listThreads(userId!),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h2 className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        <MessageCircle className="h-3.5 w-3.5" /> Your messages
      </h2>
      {threads.isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      ) : (threads.data ?? []).length === 0 ? (
        <p className={muted}>No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {(threads.data ?? []).slice(0, 8).map(t => (
            <Link
              key={t.id}
              to="/messages/$id"
              params={{ id: t.id }}
              className="block rounded-xl border border-border bg-paper p-3"
            >
              <p className="truncate text-[13px] text-ink">
                {t.title?.trim() || t.people.map(p => personName(p)).join(", ") || "Conversation"}
              </p>
              {t.preview && (
                <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">{t.preview}</p>
              )}
            </Link>
          ))}
        </div>
      )}
      <Link to="/messages" className="mt-3 inline-flex text-[12.5px] text-brass">
        Open messages
      </Link>
    </section>
  );
}

function Shell({
  slug,
  name,
  children,
}: {
  slug: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link
          to="/community/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {name}
        </Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Your profile</p>
        <h1 className="mt-2 font-serif text-[27px] leading-tight text-ink">{name}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Edit your details, and read what's come to you.
        </p>
      </header>
      <div className="space-y-4 px-4 pt-5">{children}</div>
    </div>
  );
}
