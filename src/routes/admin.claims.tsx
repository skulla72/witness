import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { CLAIM_STATUS, allClaims, decideClaim, type OrgClaim } from "@/lib/orgs";

export const Route = createFileRoute("/admin/claims")({
  staticData: { sitemap: false },
  component: AdminClaims,
  head: () => ({
    meta: [
      { title: `Page claims (team) · ${BRAND.name}` },
      {
        name: "description",
        content: "Team review: people asking to take responsibility for a church, ministry or nonprofit page.",
      },
      { property: "og:title", content: `Page claims (team) · ${BRAND.name}` },
      { property: "og:description", content: "Confirm who leads an organization before handing over its page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUSES = ["pending", "reviewing", "approved", "declined"] as const;
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function AdminClaims() {
  const { userId, signedIn } = useSession();
  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => myRoles(userId!),
    enabled: !!userId,
  });
  const isAdmin = (roles.data ?? []).includes("admin");
  const rows = useQuery({ queryKey: ["org", "claims"], queryFn: allClaims, enabled: isAdmin });

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

  const open = (rows.data ?? []).filter(c => c.status === "pending" || c.status === "reviewing");
  const closed = (rows.data ?? []).filter(c => c.status === "approved" || c.status === "declined");

  return (
    <Shell>
      <p className="mb-4 text-[12.5px] text-ink-soft">
        {open.length} waiting · {closed.length} decided
      </p>
      <div className="space-y-3">
        {open.map(c => <Card key={c.id} row={c} reviewerId={userId!} />)}
        {open.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] text-ink-soft">
            Nothing waiting.
          </p>
        )}
      </div>
      {closed.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            Decided
          </h2>
          <div className="space-y-3">
            {closed.map(c => <Card key={c.id} row={c} reviewerId={userId!} />)}
          </div>
        </>
      )}
    </Shell>
  );
}

const muted = "text-[13px] text-ink-soft";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Giving
        </Link>
      </div>
      <header className="mb-5 px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Team</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Page claims</h1>
      </header>
      <div className="px-4">{children}</div>
    </div>
  );
}

function Card({ row, reviewerId }: { row: OrgClaim; reviewerId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(row.review_note ?? "");

  const decide = useMutation({
    mutationFn: (status: (typeof STATUSES)[number]) => decideClaim(row.id, status, note, reviewerId),
    onSuccess: () => {
      toast.success("Recorded.");
      void qc.invalidateQueries({ queryKey: ["org", "claims"] });
    },
    onError: () => toast.error("That didn't save."),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-serif text-[16px] leading-tight text-ink">
            {row.role_title || "Someone from the organization"}
          </p>
          <p className="mt-1 break-all text-[11.5px] text-ink-soft">
            {[row.work_email, row.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {CLAIM_STATUS[row.status] ?? row.status}
        </span>
      </div>
      {row.note && <p className="mt-2 text-[12.5px] italic leading-relaxed text-ink">"{row.note}"</p>}
      <p className="mt-1.5 text-[11px] text-ink-soft">
        Asked {DATE.format(new Date(row.created_at))}
      </p>

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="How we confirmed this, in a line or two."
        className="mt-3 min-h-[64px] w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.mutate(s)}
            className={`rounded-xl border py-2 text-[12.5px] disabled:opacity-60 ${
              row.status === s ? "border-brass/50 bg-brass/10 text-brass" : "border-border text-ink-soft"
            }`}
          >
            {CLAIM_STATUS[s]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">
        Approving hands them the page and makes them a leader of it.
      </p>
    </div>
  );
}
