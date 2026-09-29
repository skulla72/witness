import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import {
  PRO_STATUS,
  addStrike,
  decidePro,
  proPlace,
  prosForReview,
  rateLine,
  setIdentityVerified,
  type Pro,
} from "@/lib/pros";

export const Route = createFileRoute("/admin/pros")({
  staticData: { sitemap: false },
  component: AdminPros,
  head: () => ({
    meta: [
      { title: `Professional pages (team) · ${BRAND.name}` },
      {
        name: "description",
        content: "Team review: professional pages waiting to go live, identity checks and reported problems.",
      },
      { property: "og:title", content: `Professional pages (team) · ${BRAND.name}` },
      { property: "og:description", content: "Review professional pages before they appear in search." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminPros() {
  const { userId, signedIn } = useSession();
  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => myRoles(userId!),
    enabled: !!userId,
  });
  const isAdmin = (roles.data ?? []).includes("admin");

  const rows = useQuery({ queryKey: ["pros", "review"], queryFn: prosForReview, enabled: isAdmin });

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

  const waiting = (rows.data ?? []).filter(p => p.status === "pending");
  const rest = (rows.data ?? []).filter(p => p.status !== "pending");

  return (
    <Shell>
      <p className="mb-4 text-[12.5px] text-ink-soft">
        {waiting.length} waiting · {rest.length} decided
      </p>
      <div className="space-y-3">
        {waiting.map(p => <Card key={p.id} row={p} reviewerId={userId!} />)}
        {waiting.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] text-ink-soft">
            Nothing waiting.
          </p>
        )}
      </div>
      {rest.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
            Decided
          </h2>
          <div className="space-y-3">
            {rest.map(p => <Card key={p.id} row={p} reviewerId={userId!} />)}
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
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Professional pages</h1>
      </header>
      <div className="px-4">{children}</div>
    </div>
  );
}

function Card({ row, reviewerId }: { row: Pro; reviewerId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(row.review_note ?? "");
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["pros"] });

  const decide = useMutation({
    mutationFn: (status: "approved" | "removed" | "pending") =>
      decidePro(row.id, status, note, reviewerId),
    onSuccess: () => {
      toast.success("Recorded.");
      invalidate();
    },
    onError: () => toast.error("That didn't save."),
  });

  const verify = useMutation({
    mutationFn: () => setIdentityVerified(row.id, !row.id_verified_at),
    onSuccess: () => {
      toast.success("Identity check updated.");
      invalidate();
    },
    onError: () => toast.error("That didn't save."),
  });

  const strike = useMutation({
    mutationFn: (kind: "no_show" | "quality") => addStrike(row.id, kind, note, reviewerId),
    onSuccess: () => {
      toast.success("Report recorded.");
      invalidate();
    },
    onError: () => toast.error("That didn't save."),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-serif text-[16px] leading-tight text-ink">{row.display_name}</p>
          <p className="mt-1 text-[11.5px] text-ink-soft">
            {[row.trade, proPlace(row), rateLine(row)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-paper px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {PRO_STATUS[row.status] ?? row.status}
        </span>
      </div>
      {row.headline && <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{row.headline}</p>}
      {row.about && <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{row.about}</p>}

      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="What we decided, or what a report was about."
        className="mt-3 min-h-[64px] w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60"
      />

      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["approved", "pending", "removed"] as const).map(s => (
          <button
            key={s}
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.mutate(s)}
            className={`rounded-xl border py-2 text-[12.5px] disabled:opacity-60 ${
              row.status === s ? "border-brass/50 bg-brass/10 text-brass" : "border-border text-ink-soft"
            }`}
          >
            {PRO_STATUS[s]}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={verify.isPending}
          onClick={() => verify.mutate()}
          className="rounded-xl border border-border py-2 text-[12px] text-ink-soft disabled:opacity-60"
        >
          {row.id_verified_at ? "Undo verified" : "Mark verified"}
        </button>
        <button
          type="button"
          disabled={strike.isPending}
          onClick={() => strike.mutate("no_show")}
          className="rounded-xl border border-border py-2 text-[12px] text-ink-soft disabled:opacity-60"
        >
          No-show report
        </button>
        <button
          type="button"
          disabled={strike.isPending}
          onClick={() => strike.mutate("quality")}
          className="rounded-xl border border-border py-2 text-[12px] text-ink-soft disabled:opacity-60"
        >
          Quality report
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">
        A second report of the same kind takes the page out of search on its own.
      </p>
    </div>
  );
}
