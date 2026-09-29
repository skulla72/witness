import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Lock, Video, MapPin } from "lucide-react";
import { toast } from "sonner";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { REQUEST_STATUS, counselorBySlug, counselorRate, myRequestTo, requestSession } from "@/lib/counselors";
import { ProfileImage } from "@/components/profile-media/ProfileImage";
import { ProfileMediaGallery } from "@/components/profile-media/ProfileMediaGallery";

export const Route = createFileRoute("/counselor/$slug")({
  staticData: { sitemap: false },
  component: CounselorPage,
  head: () => ({
    meta: [
      { title: `Counselor · ${BRAND.name}` },
      { name: "description", content: "A licensed counselor whose license our team has checked." },
      { property: "og:title", content: `Counselor · ${BRAND.name}` },
      { property: "og:description", content: "A verified, licensed counselor on Witness." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CounselorPage() {
  const { slug } = Route.useParams();
  const { userId, signedIn } = useSession();
  const qc = useQueryClient();
  const c = useQuery({ queryKey: ["counselor", slug], queryFn: () => counselorBySlug(slug) });
  const mine = useQuery({ queryKey: ["counselor", "req", c.data?.id, userId], queryFn: () => myRequestTo(c.data!.id, userId!), enabled: !!c.data && !!userId });
  const [msg, setMsg] = useState("");
  const [video, setVideo] = useState(true);
  const [sending, setSending] = useState(false);

  if (c.isLoading) return <Loader2 className="mx-auto mt-10 h-5 w-5 animate-spin text-ink-soft" />;
  if (!c.data) return <p className="px-5 pt-8 text-center text-[13px] text-ink-soft">This counselor page isn't available.</p>;
  const p = c.data;
  const isMe = p.user_id === userId;

  const send = async () => {
    if (!userId) return;
    setSending(true);
    try { await requestSession(p.id, userId, msg.trim(), video); await qc.invalidateQueries({ queryKey: ["counselor", "req"] }); setMsg(""); toast.success("Sent privately. They'll get back to you."); }
    catch { toast.error("Couldn't send your request."); }
    finally { setSending(false); }
  };

  return (
    <div className="px-5 pt-6 pb-16 md:mx-auto md:max-w-2xl md:px-0">
      <div className="flex items-center gap-4">
        <ProfileImage path={p.photo_url} alt={p.display_name} className="h-24 w-24 shrink-0" />
        <div className="min-w-0">
          <h1 className="font-serif text-[24px] leading-tight text-ink">{p.display_name}</h1>
          {p.status === "approved" && <p className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-hope"><BadgeCheck className="h-3.5 w-3.5" /> {p.license_type} · {p.license_state} · License verified</p>}
        </div>
      </div>
      {p.headline && <p className="mt-4 text-[14px] text-ink">{p.headline}</p>}
      <p className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ink-soft">
        <span>{counselorRate(p)}</span>
        {p.offers_video && <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>}
        {p.offers_in_person && [p.city, p.region].some(Boolean) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[p.city, p.region].filter(Boolean).join(", ")}</span>}
        {p.faith_integrated && <span>Faith-integrated on request</span>}
      </p>
      {p.about && <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{p.about}</p>}
      {p.specialties.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{p.specialties.map(s => <span key={s} className="rounded-full bg-secondary px-3 py-1 text-[11px] text-ink-soft">{s}</span>)}</div>}
      {p.languages.length > 0 && <p className="mt-3 text-[12px] text-ink-soft">Languages: {p.languages.join(", ")}</p>}
      <ProfileMediaGallery pageType="counselor" pageId={p.id} />

      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="inline-flex items-center gap-1.5 font-serif text-[16px] text-ink"><Lock className="h-3.5 w-3.5" /> Ask for a first session</p>
        <p className="mt-1 text-[12px] text-ink-soft">Only this counselor sees your request. Payment is arranged with them directly for now.</p>
        {isMe ? <p className="mt-3 text-[12.5px] text-ink-soft">This is your page. <Link to="/counselors/mine" className="text-brass underline">Manage it</Link>.</p>
          : signedIn === false ? <Link to="/login" className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper">Sign in to ask</Link>
          : mine.data && mine.data.status !== "declined" ? <p className="mt-3 text-[13px] text-ink">Your request: {REQUEST_STATUS[mine.data.status]}</p>
          : p.status !== "approved" ? <p className="mt-3 text-[12.5px] text-ink-soft">This page is waiting on a license check.</p>
          : (<>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3} maxLength={800} placeholder="A little about what you'd like help with (optional)" className="mt-3 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-ink-soft" />
            <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink"><input type="checkbox" checked={video} onChange={e => setVideo(e.target.checked)} /> I'd prefer video</label>
            <button disabled={sending} onClick={() => void send()} className="mt-3 rounded-full bg-ink px-5 py-2 text-[13px] text-paper disabled:opacity-50">{sending ? "Sending…" : "Send request"}</button>
          </>)}
      </section>
    </div>
  );
}
