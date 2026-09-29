import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { COUNSELOR_STATUS, allCounselorPages, reviewCounselor, type Counselor } from "@/lib/counselors";

export const Route = createFileRoute("/admin/counselors")({
  staticData: { sitemap: false },
  component: AdminCounselors,
  head: () => ({
    meta: [
      { title: `Counselor pages (team) · ${BRAND.name}` },
      { name: "description", content: "Team review: check counselor licenses before pages go live." },
      { property: "og:title", content: `Counselor pages (team) · ${BRAND.name}` },
      { property: "og:description", content: "Check counselor licenses before pages go live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminCounselors() {
  const { userId, signedIn } = useSession();
  const roles = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isAdmin = (roles.data ?? []).includes("admin");
  const rows = useQuery({ queryKey: ["counselors", "review"], queryFn: allCounselorPages, enabled: isAdmin });

  if (signedIn === false) return <p className="px-5 pt-8 text-[13px] text-ink-soft">Sign in to use team tools.</p>;
  if (roles.isLoading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-ink-soft" />;
  if (!isAdmin) return <p className="px-5 pt-8 text-[13px] text-ink-soft">This page is for the team.</p>;

  return (
    <div className="px-5 pt-6 pb-16 md:mx-auto md:max-w-3xl md:px-0">
      <h1 className="font-serif text-[24px] text-ink">Counselor pages</h1>
      <p className="mt-1 text-[12.5px] text-ink-soft">Look the license up with the state board before approving.</p>
      <div className="mt-4 space-y-3">
        {(rows.data ?? []).map(c => <Row key={c.id} c={c} />)}
        {rows.data?.length === 0 && <p className="text-[13px] text-ink-soft">No counselor pages yet.</p>}
      </div>
    </div>
  );
}

function Row({ c }: { c: Counselor }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(c.review_note);
  const decide = async (status: "approved" | "removed" | "pending") => {
    try { await reviewCounselor(c.id, status, note); await qc.invalidateQueries({ queryKey: ["counselors"] }); toast.success("Saved."); }
    catch { toast.error("Couldn't save."); }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-serif text-[16px] text-ink">{c.display_name}</p>
      <p className="text-[12px] text-ink-soft">{c.license_type} #{c.license_number} · {c.license_state} · {COUNSELOR_STATUS[c.status] ?? c.status}</p>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note to the counselor" className="mt-2 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[12.5px] text-ink" />
      <div className="mt-2 flex gap-2">
        <button onClick={() => void decide("approved")} className="rounded-full bg-ink px-4 py-1.5 text-[12px] text-paper">Approve</button>
        <button onClick={() => void decide("pending")} className="rounded-full border border-border px-4 py-1.5 text-[12px] text-ink">Back to pending</button>
        <button onClick={() => void decide("removed")} className="rounded-full border border-border px-4 py-1.5 text-[12px] text-ink">Remove</button>
      </div>
    </div>
  );
}
