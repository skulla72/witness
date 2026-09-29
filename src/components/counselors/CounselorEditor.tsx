import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { LICENSE_TYPES, SPECIALTIES, saveCounselorPage, type Counselor, type CounselorDraft } from "@/lib/counselors";
import { ProfilePictureEditor } from "@/components/profile-media/ProfilePictureEditor";
import { ProfileMediaManager } from "@/components/profile-media/ProfileMediaManager";
import { supabase } from "@/integrations/supabase/client";

const EMPTY: CounselorDraft = {
  display_name: "", headline: "", about: "", license_type: "LPC", license_number: "", license_state: "",
  specialties: [], languages: ["English"], offers_video: true, offers_in_person: false, city: "", region: "",
  rate_cents: 0, sliding_scale: false, faith_integrated: false, photo_url: "",
};

export function CounselorEditor({ existing }: { existing?: Counselor | null }) {
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [d, setD] = useState<CounselorDraft>(EMPTY);
  const [rate, setRate] = useState("");
  const [langs, setLangs] = useState("English");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    const { display_name, headline, about, license_type, license_number, license_state, specialties, languages,
      offers_video, offers_in_person, city, region, rate_cents, sliding_scale, faith_integrated, photo_url } = existing;
    setD({ display_name, headline, about, license_type, license_number, license_state, specialties, languages,
      offers_video, offers_in_person, city, region, rate_cents, sliding_scale, faith_integrated, photo_url });
    setRate(rate_cents ? String(Math.round(rate_cents / 100)) : "");
    setLangs(languages.join(", "));
  }, [existing]);

  if (signedIn === false) return <div className="px-5 pt-8 text-[13px] text-ink-soft"><p>Create an account or sign in to make your counselor page.</p><a href="/login?mode=signup&next=%2Fcounselors%2Fnew" className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground">Create account or sign in</a></div>;

  const set = <K extends keyof CounselorDraft>(k: K, v: CounselorDraft[K]) => setD(p => ({ ...p, [k]: v }));
  const toggleSpec = (s: string) => set("specialties", d.specialties.includes(s) ? d.specialties.filter(x => x !== s) : [...d.specialties, s]);

  const save = async () => {
    if (!userId) return;
    if (!d.display_name.trim() || !d.license_number.trim() || !d.license_state.trim()) {
      toast.error("Your name, license number and license state are needed."); return;
    }
    setSaving(true);
    try {
      await saveCounselorPage(userId, {
        ...d,
        rate_cents: Math.max(0, Math.round(Number(rate || 0) * 100)),
        languages: langs.split(",").map(s => s.trim()).filter(Boolean),
      }, existing);
      await qc.invalidateQueries({ queryKey: ["counselors"] });
      toast.success(existing ? "Saved." : "Sent in. Our team will check your license.");
      void navigate({ to: "/counselors/mine" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your page.");
    } finally { setSaving(false); }
  };

  const input = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-soft";
  return (
    <div className="px-5 pt-6 pb-16 md:mx-auto md:max-w-2xl md:px-0">
      <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Counselor page</p>
      <h1 className="mt-2 font-serif text-[26px] leading-tight text-ink">{existing ? "Edit your page" : "Create your page"}</h1>
      <p className="mt-2 text-[12.5px] text-ink-soft">Your page stays hidden until our team checks your license. Changing license details sends it back for another check.</p>

      <div className="mt-5 space-y-3">
        <input className={input} placeholder="Full name and credentials" value={d.display_name} onChange={e => set("display_name", e.target.value)} maxLength={80} />
        <input className={input} placeholder="One line about how you help" value={d.headline} onChange={e => set("headline", e.target.value)} maxLength={120} />
        <textarea className={input} rows={4} placeholder="About your practice" value={d.about} onChange={e => set("about", e.target.value)} maxLength={1500} />
        {existing && <ProfilePictureEditor pageType="counselor" pageId={existing.id} value={d.photo_url} shape="square" label="Square profile picture" onSaved={async path => { const { error } = await supabase.from("counselor_profiles").update({ photo_url: path ?? "" }).eq("id", existing.id); if (error) throw error; set("photo_url", path ?? ""); }} />}
        <div className="grid grid-cols-3 gap-2">
          <select className={input} value={d.license_type} onChange={e => set("license_type", e.target.value)} aria-label="License type">
            {LICENSE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input className={input} placeholder="License #" value={d.license_number} onChange={e => set("license_number", e.target.value)} maxLength={40} />
          <input className={input} placeholder="State" value={d.license_state} onChange={e => set("license_state", e.target.value)} maxLength={20} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="City" value={d.city} onChange={e => set("city", e.target.value)} maxLength={60} />
          <input className={input} placeholder="State / region" value={d.region} onChange={e => set("region", e.target.value)} maxLength={60} />
        </div>
        <div>
          <p className="mb-2 text-[12px] text-ink-soft">Specialties</p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map(s => (
              <button key={s} type="button" aria-pressed={d.specialties.includes(s)} onClick={() => toggleSpec(s)} className={`rounded-full border px-3 py-1.5 text-[11.5px] ${d.specialties.includes(s) ? "border-brass/50 bg-brass/15 text-ink" : "border-border bg-card text-ink-soft"}`}>{s}</button>
            ))}
          </div>
        </div>
        <input className={input} placeholder="Languages, separated by commas" value={langs} onChange={e => setLangs(e.target.value)} maxLength={120} />
        <input className={input} inputMode="numeric" placeholder="Rate per session in dollars (optional)" value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9]/g, ""))} />
        {([
          ["offers_video", "I offer video sessions"],
          ["offers_in_person", "I offer in-person sessions"],
          ["sliding_scale", "I offer a sliding scale"],
          ["faith_integrated", "I can bring faith into sessions when someone asks"],
        ] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={d[k]} onChange={e => set(k, e.target.checked)} /> {label}
          </label>
        ))}
        <p className="rounded-xl bg-secondary p-3 text-[11.5px] text-ink-soft">Pages are free during the beta. Paying for sessions through Witness isn't switched on yet — you arrange payment with each person directly.</p>
        <button disabled={saving} onClick={() => void save()} className="w-full rounded-xl bg-ink py-3 text-[14px] text-paper disabled:opacity-50">
          {saving ? "Saving…" : existing ? "Save changes" : "Send for license check"}
        </button>
      </div>
      {existing && <div className="mt-4"><ProfileMediaManager pageType="counselor" pageId={existing.id} /></div>}
    </div>
  );
}
