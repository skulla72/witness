import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { reviewTestimonial, testimonialsForReview, TESTIMONIAL_STATUS, type TestimonialStatus, type TestimonialStory } from "@/lib/testimonials";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/testimonials")({
  staticData: { sitemap: false },
  component: AdminTestimonials,
  head: () => ({
    meta: [
      { title: `Success stories (team) · ${BRAND.name}` },
      { name: "description", content: "Team review for church and professional success stories." },
      { property: "og:title", content: `Success stories (team) · ${BRAND.name}` },
      { property: "og:description", content: "Review stories before they appear publicly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminTestimonials() {
  const { userId, signedIn } = useSession();
  const roles = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId ?? ""), enabled: Boolean(userId) });
  const isAdmin = (roles.data ?? []).includes("admin");
  const rows = useQuery({ queryKey: ["testimonials", "review"], queryFn: testimonialsForReview, enabled: isAdmin });
  if (signedIn === false) return <Shell><p className={muted}>Sign in to use team tools.</p></Shell>;
  if (roles.isLoading) return <Shell><Loader2 className="mx-auto my-12 h-5 w-5 animate-spin text-ink-soft" /></Shell>;
  if (!isAdmin) return <Shell><p className={muted}>This page is for the team.</p></Shell>;
  const waiting = (rows.data ?? []).filter(row => row.status === "pending");
  const decided = (rows.data ?? []).filter(row => row.status !== "pending");
  return <Shell><p className="mb-4 text-[12.5px] text-ink-soft">{waiting.length} waiting · {decided.length} decided</p><div className="space-y-3">{waiting.map(row => <ReviewCard key={row.id} row={row} reviewerId={userId ?? ""} />)}{waiting.length === 0 && <p className="rounded-2xl border border-border bg-card p-4 text-[12.5px] text-ink-soft">Nothing waiting.</p>}</div>{decided.length > 0 && <><h2 className="mb-2 mt-7 px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Decided</h2><div className="space-y-3">{decided.map(row => <ReviewCard key={row.id} row={row} reviewerId={userId ?? ""} />)}</div></>}</Shell>;
}

function ReviewCard({ row, reviewerId }: { row: TestimonialStory; reviewerId: string }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(row.review_note ?? "");
  const review = useMutation({
    mutationFn: (status: TestimonialStatus) => reviewTestimonial(row.id, status, note, reviewerId),
    onSuccess: () => { toast.success("Recorded."); void qc.invalidateQueries({ queryKey: ["testimonials"] }); },
    onError: () => toast.error("That didn't save."),
  });
  return <article className="rounded-2xl border border-border bg-card p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="font-serif text-[16px] text-ink">{row.headline}</p><p className="mt-1 text-[11.5px] text-ink-soft">{row.subjectName} · {row.subject_type === "church" ? "Church" : "Professional"}</p></div><span className="shrink-0 text-[10.5px] text-brass-deep">{TESTIMONIAL_STATUS[row.status] ?? row.status}</span></div>{row.photo_url && <img src={row.photo_url} alt="" className="mt-3 aspect-video w-full rounded-xl object-cover" />}<p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{row.story}</p><div className="mt-3 border-l-2 border-brass pl-3"><p className="text-[10px] uppercase tracking-[0.16em] text-brass-deep">Outcome</p><p className="mt-1 text-[12.5px] text-ink">{row.outcome}</p></div><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="A note for the storyteller if changes are needed." className="mt-4 min-h-20 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/55" /><div className="mt-3 grid grid-cols-3 gap-2"><Button type="button" size="sm" disabled={review.isPending} onClick={() => review.mutate("approved")}>Approve</Button><Button type="button" size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate("changes_requested")}>Changes</Button><Button type="button" size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate("removed")}>Remove</Button></div></article>;
}

const muted = "text-[13px] leading-relaxed text-ink-soft";
function Shell({ children }: { children: React.ReactNode }) { return <div className="pb-16"><div className="px-4 pt-3"><Link to="/testimonials" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Public stories</Link></div><header className="px-5 pb-5 pt-4"><p className="text-[10px] uppercase tracking-[0.22em] text-brass">Team</p><h1 className="mt-2 font-serif text-[28px] text-ink">Success stories</h1></header><main className="px-4">{children}</main></div>; }