import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { CounselorEditor } from "@/components/counselors/CounselorEditor";
import { COUNSELOR_STATUS, REQUEST_STATUS, answerRequest, myCounselorPage, requestsForMe } from "@/lib/counselors";

export const Route = createFileRoute("/counselors/mine")({
  staticData: { sitemap: false },
  component: Mine,
  head: () => ({
    meta: [
      { title: `Your counselor page · ${BRAND.name}` },
      { name: "description", content: "Edit your counselor page and answer session requests." },
      { property: "og:title", content: `Your counselor page · ${BRAND.name}` },
      { property: "og:description", content: "Manage your verified counselor page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Mine() {
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const page = useQuery({ queryKey: ["counselors", "mine", userId], queryFn: () => myCounselorPage(userId!), enabled: !!userId });
  const reqs = useQuery({ queryKey: ["counselors", "requests", page.data?.id], queryFn: () => requestsForMe(page.data!.id), enabled: !!page.data });

  if (signedIn === false) return <p className="px-5 pt-8 text-[13px] text-ink-soft">Sign in to see your page.</p>;
  if (page.isLoading || signedIn === undefined) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-ink-soft" />;
  if (!page.data) return (
    <div className="px-5 pt-8 text-center">
      <p className="font-serif text-[18px] text-ink">You don't have a counselor page yet.</p>
      <Link to="/counselors/new" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Create one</Link>
    </div>
  );

  const answer = async (id: string, status: "accepted" | "declined") => {
    try { await answerRequest(id, status); await qc.invalidateQueries({ queryKey: ["counselors", "requests"] }); toast.success(status === "accepted" ? "Accepted." : "Declined kindly."); }
    catch { toast.error("Couldn't update that request."); }
  };

  return (
    <div>
      <div className="px-5 pt-6 md:mx-auto md:max-w-2xl md:px-0">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Status</p>
          <p className="mt-1 text-[14px] text-ink">{COUNSELOR_STATUS[page.data.status] ?? page.data.status}</p>
          {page.data.review_note && <p className="mt-1 text-[12px] text-ink-soft">Note from our team: {page.data.review_note}</p>}
          {page.data.status === "approved" && <Link to="/counselor/$slug" params={{ slug: page.data.slug }} className="mt-2 inline-block text-[12.5px] text-brass underline">See your public page</Link>}
        </div>
        <h2 className="mt-6 font-serif text-[18px] text-ink">Session requests</h2>
        <div className="mt-2 space-y-2">
          {(reqs.data ?? []).map(r => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[12px] text-ink-soft">{new Date(r.created_at).toLocaleDateString()} · {r.prefers_video ? "Video" : "In person"} · {REQUEST_STATUS[r.status]}</p>
              <p className="mt-1 text-[13px] text-ink">{r.message || "No message."}</p>
              {r.status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void answer(r.id, "accepted")} className="rounded-full bg-ink px-4 py-1.5 text-[12px] text-paper">Accept</button>
                  <button onClick={() => void answer(r.id, "declined")} className="rounded-full border border-border px-4 py-1.5 text-[12px] text-ink">Decline</button>
                </div>
              )}
            </div>
          ))}
          {reqs.data?.length === 0 && <p className="text-[12.5px] text-ink-soft">No requests yet.</p>}
        </div>
      </div>
      <CounselorEditor existing={page.data} />
    </div>
  );
}
