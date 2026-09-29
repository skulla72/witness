import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Search, Video, ChevronRight } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { useTone } from "@/hooks/useTone";
import { SPECIALTIES, counselorRate, listCounselors, myCounselorPage } from "@/lib/counselors";
import { ProfileRow } from "@/components/profile-media/ProfileRow";

export const Route = createFileRoute("/counselors/")({
  staticData: { sitemap: true },
  component: Counselors,
  head: () => ({
    meta: [
      { title: `Find a counselor · ${BRAND.name}` },
      { name: "description", content: "Licensed counselors whose licenses our team has checked. Filter by specialty, state, and video sessions." },
      { property: "og:title", content: `Find a counselor · ${BRAND.name}` },
      { property: "og:description", content: "Licensed, verified counselors — grief, marriage, anxiety, addiction and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Counselors() {
  const { userId } = useSession();
  const tone = useTone();
  const [term, setTerm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [state, setState] = useState("");
  const [video, setVideo] = useState(false);
  const [faith, setFaith] = useState(false);

  const list = useQuery({
    queryKey: ["counselors", term, specialty, state, video, faith],
    queryFn: () => listCounselors({ term, specialty, state, video, faith }),
  });
  const mine = useQuery({ queryKey: ["counselors", "mine", userId], queryFn: () => myCounselorPage(userId!), enabled: !!userId });
  const specialties = SPECIALTIES.filter(s => tone.faith || s !== "Faith questions");

  return (
    <div className="px-5 pt-6 pb-16 md:mx-auto md:max-w-3xl md:px-0">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Care</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Find a counselor</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Every counselor here is licensed, and our team has checked that license. Asking for a first session is private.
        </p>
      </header>

      <Link to={mine.data ? "/counselors/mine" : "/counselors/new"} className="tap-scale mt-4 flex items-center gap-2 rounded-2xl border border-brass/30 bg-brass/10 p-3.5 text-[13px] text-ink">
        {mine.data ? "Your counselor page" : "Are you a licensed counselor? Create your page"}
        <ChevronRight className="ml-auto h-4 w-4 text-brass" />
      </Link>

      <label className="mt-5 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink-soft" />
        <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Name or city" aria-label="Search counselors" className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-soft" />
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select value={specialty} onChange={e => setSpecialty(e.target.value)} aria-label="Specialty" className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-ink">
          <option value="">Any specialty</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={state} onChange={e => setState(e.target.value)} placeholder="State (e.g. CO)" aria-label="State" maxLength={20} className="rounded-xl border border-border bg-card px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-soft" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Toggle on={video} set={setVideo} label="Video sessions" />
        <Toggle on={faith} set={setFaith} label="Faith-integrated" />
      </div>

      <div className="mt-5 space-y-3">
        {list.isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-soft" />}
        {list.data?.map(c => (
          <Link key={c.id} to="/counselor/$slug" params={{ slug: c.slug }} className="tap-scale block rounded-2xl border border-border bg-card p-4 shadow-soft">
            <ProfileRow image={c.photo_url} name={c.display_name} detail={`${c.license_type} · ${c.license_state} · License verified`} trailing={<BadgeCheck className="h-4 w-4 shrink-0 text-hope" />} />
            {c.headline && <p className="mt-2 text-[12.5px] text-ink-soft">{c.headline}</p>}
            <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[11.5px] text-ink-soft">
              <span>{counselorRate(c)}</span>
              {c.offers_video && <span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> Video</span>}
              {c.specialties.slice(0, 3).join(" · ")}
            </p>
          </Link>
        ))}
        {list.data?.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-5 text-center text-[13px] text-ink-soft">
            No verified counselors match yet. We're checking licenses as counselors join.
          </p>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={() => set(!on)} className={`rounded-full border px-3 py-1.5 text-[11.5px] ${on ? "border-brass/50 bg-brass/15 text-ink" : "border-border bg-card text-ink-soft"}`}>
      {label}
    </button>
  );
}
