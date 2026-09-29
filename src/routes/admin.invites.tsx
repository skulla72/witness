import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Phone } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { invitesOverview, markInviteHandled, setClaimInvites } from "@/lib/invites.functions";
import { telHref } from "@/lib/community";

export const Route = createFileRoute("/admin/invites")({
  staticData: { sitemap: false },
  component: AdminInvites,
  head: () => ({
    meta: [
      { title: `Inviting organizations (team) · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Team tools: offer a church, ministry or nonprofit their page when somebody names them.",
      },
      { property: "og:title", content: `Inviting organizations (team) · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Turn claim invitations on, and see who still needs a phone call.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function AdminInvites() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => myRoles(userId!),
    enabled: !!userId,
  });
  const isAdmin = (roles.data ?? []).includes("admin");

  const load = useServerFn(invitesOverview);
  const overview = useQuery({
    queryKey: ["org", "claim-invites"],
    queryFn: () => load({ data: {} as never }),
    enabled: isAdmin,
  });

  const toggle = useServerFn(setClaimInvites);
  const flip = useMutation({
    mutationFn: (enabled: boolean) => toggle({ data: { enabled } }),
    onSuccess: (_r, enabled) => {
      toast.success(enabled ? "Invitations are going out." : "Invitations are paused.");
      qc.invalidateQueries({ queryKey: ["org", "claim-invites"] });
    },
    onError: () => toast.error("That didn't save. Try again."),
  });

  const handle = useServerFn(markInviteHandled);
  const close = useMutation({
    mutationFn: (v: { inviteId: string; status: "called" | "skipped" }) => handle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org", "claim-invites"] }),
    onError: () => toast.error("That didn't save. Try again."),
  });

  if (signedIn === false) return <Shell><p className={muted}>Sign in to use team tools.</p></Shell>;
  if (roles.isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
        </div>
      </Shell>
    );
  }
  if (!isAdmin) return <Shell><p className={muted}>This page is for the team.</p></Shell>;

  const data = overview.data;
  const open = (data?.calls ?? []).filter(c => c.status === "needs_call" || c.status === "failed");
  const done = (data?.calls ?? []).filter(c => c.status === "called" || c.status === "skipped");

  return (
    <Shell>
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[14px] text-ink">Offer organizations their page</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">
          When somebody adds a church, ministry or nonprofit that hasn't claimed its page, we write
          to the address on file and offer it to them. Each organization is only written to once.
          Keep this off until launch.
        </p>
        <button
          type="button"
          onClick={() => flip.mutate(!data?.enabled)}
          disabled={flip.isPending || overview.isLoading}
          className={`mt-3 rounded-full px-4 py-2 text-[13px] ${
            data?.enabled ? "bg-hope/15 text-ink" : "bg-ink text-paper"
          }`}
        >
          {flip.isPending
            ? "Saving…"
            : data?.enabled
              ? "On — tap to pause"
              : "Off — tap to start inviting"}
        </button>
        {data ? (
          <p className="mt-2 text-[12px] text-ink-soft">{data.sentCount} letters sent so far.</p>
        ) : null}
      </div>

      <h2 className="mt-6 px-1 font-serif text-[14px] uppercase tracking-[0.18em] text-ink-soft">
        Waiting on a call ({open.length})
      </h2>
      <p className="mt-1 px-1 text-[12px] leading-snug text-ink-soft">
        These have a phone number but no email, so a person needs to reach out.
      </p>
      <div className="mt-3 space-y-2">
        {open.length === 0 ? (
          <p className={muted}>No calls waiting.</p>
        ) : (
          open.map(c => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to="/community/$slug"
                    params={{ slug: c.orgSlug }}
                    className="block truncate text-[14px] text-ink"
                  >
                    {c.orgName}
                  </Link>
                  <a
                    href={telHref(c.phone)}
                    className="mt-0.5 flex items-center gap-1.5 text-[13px] text-brass"
                  >
                    <Phone className="h-3.5 w-3.5" /> {c.phone}
                  </a>
                  {c.note ? <p className="mt-1 text-[12px] text-ink-soft">{c.note}</p> : null}
                </div>
                <span className="shrink-0 text-[11px] text-ink-soft">
                  {DATE.format(new Date(c.createdAt))}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => close.mutate({ inviteId: c.id, status: "called" })}
                  className="rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] text-paper"
                >
                  I called them
                </button>
                <button
                  type="button"
                  onClick={() => close.mutate({ inviteId: c.id, status: "skipped" })}
                  className="rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-ink-soft"
                >
                  Leave it
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {done.length > 0 && (
        <>
          <h2 className="mt-6 px-1 font-serif text-[14px] uppercase tracking-[0.18em] text-ink-soft">
            Followed up ({done.length})
          </h2>
          <div className="mt-3 space-y-2">
            {done.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-paper px-3.5 py-2.5"
              >
                <span className="truncate text-[13px] text-ink">{c.orgName}</span>
                <span className="shrink-0 text-[11.5px] text-ink-soft">
                  {c.status === "called" ? "Called" : "Left alone"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}

const muted = "px-1 py-6 text-center text-[13px] italic text-ink-soft";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-5">
      <Link to="/profile" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
        <ArrowLeft className="h-4 w-4" /> You
      </Link>
      <h1 className="mb-4 font-serif text-[22px] text-ink">Inviting organizations</h1>
      {children}
    </div>
  );
}
