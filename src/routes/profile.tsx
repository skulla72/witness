import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { loadAuthor, loadStoriesBy, myRoles } from "@/lib/prayers";
import { Avatar } from "@/components/Avatar";
import { PrayerCard } from "@/components/PrayerCard";
import { MyOrders } from "@/components/store/MyOrders";
import { AccountPanel } from "@/components/AccountPanel";
import { PushToggle } from "@/components/PushToggle";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ToneSwitch } from "@/components/ToneSwitch";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";
import { useTone } from "@/hooks/useTone";

import { PhotoStudio } from "@/components/PhotoStudio";
import {
  BookOpen, MessageCircle, Users, HandCoins, HeartHandshake, Lock, Sliders, ChevronRight, LogIn, LogOut, Camera, Loader2, ShieldCheck, Sun,
  BadgeCheck, Gift, Menu, ArrowLeft, UserRound,
} from "lucide-react";

export const Route = createFileRoute("/profile")({
  staticData: { sitemap: false },
  component: Profile,
  head: () => ({ meta: [
    { title: "Profile · Witness" },
    { name: "description", content: "Your prayers, answers, circles, and account." },
    { property: "og:title", content: "Profile · Witness" },
    { property: "og:description", content: "Your prayers, answers, circles, and account." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function Profile() {
  const { userId, email, signedIn } = useSession();
  const tone = useTone();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const meQ = useQuery({ queryKey: ["author", userId], queryFn: () => loadAuthor(userId!), enabled: !!userId });
  const mineQ = useQuery({ queryKey: ["stories", "mine", userId ?? "anon"], queryFn: () => loadStoriesBy(userId!, userId!), enabled: !!userId });
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const prayedQ = useQuery({
    queryKey: ["prayed-count", userId],
    queryFn: async () => {
      const { count } = await supabase.from("intercessions").select("id", { count: "exact", head: true }).eq("sender_id", userId!);
      return count ?? 0;
    },
    enabled: !!userId,
  });

  const mine = mineQ.data ?? [];
  const answered = mine.filter(s => !!s.answer).length;
  const isMod = (rolesQ.data ?? []).some(r => r === "admin" || r === "vetter");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    navigate({ to: "/login" });
  };

  if (signedIn === false) {
    return (
      <div className="pt-16 px-6 text-center">
        <h1 className="font-serif text-[26px] text-ink">Your profile</h1>
        <p className="mt-2 text-[13px] text-ink-soft">{tone.faith ? "Sign in to see your prayers, answers, and circles." : "Sign in to see your hopes, updates, and people."}</p>
        <Link to="/login" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper"><LogIn className="h-4 w-4" /> Sign in</Link>
      </div>
    );
  }

  const me = meQ.data;

  return (
    <div className="pt-6 md:mx-auto md:max-w-3xl md:pt-10 lg:grid lg:max-w-5xl lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="lg:sticky lg:top-8">
      <header className="px-6 text-center">
        <AvatarEditor userId={userId ?? null} name={me?.name ?? "You"} photo={me?.photo ?? null} onChanged={() => { qc.invalidateQueries({ queryKey: ["author", userId] }); qc.invalidateQueries({ queryKey: ["home"] }); }} />
        <h1 className="mt-4 font-serif text-[26px] text-ink">{me?.name ?? "…"}</h1>
        {me?.bio && <p className="mt-1 text-[13px] text-ink-soft italic">"{me.bio}"</p>}
        {isMod && <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-brass inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Moderator</p>}

        <div className="mt-6 grid grid-cols-3 gap-2 max-w-xs mx-auto">
          <Stat n={mine.length} label={tone.faith ? "Prayers" : "Hopes"} />
          <Stat n={answered} label={tone.faith ? "Answered" : "Came through"} />
          <Stat n={prayedQ.data ?? 0} label={tone.faith ? "Prayed for" : "Supported"} />
        </div>
      </header>

      <nav className="mx-4 mt-7" aria-label="Profile shortcuts">
        <div className="grid grid-cols-4 gap-2">
          <ProfileShortcut to="/messages" Icon={MessageCircle} label="Messages" />
          <ProfileShortcut to="/journal" Icon={BookOpen} label={tone.faith ? "My prayers" : "My hopes"} />
          <ProfileShortcut to="/circle" Icon={Users} label="My people" />
          <ProfileShortcut to="/giving" Icon={HandCoins} label="Giving" />
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="tap-scale mt-3 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-soft"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
            <Menu className="h-4 w-4 text-ink" strokeWidth={1.6} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-ink">Menu</span>
            <span className="block truncate text-[11px] text-ink-soft">Your personal activity and settings</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-soft" />
        </button>
      </nav>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ink/20" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Your menu"
            className="absolute inset-y-0 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col bg-paper shadow-lift"
          >
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 px-4">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-ink"
                aria-label="Close menu"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="font-serif text-[20px] leading-none text-ink">Your menu</h2>
                <p className="mt-1 text-[11px] text-ink-soft">Everything in one quieter place</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              <div className="px-3 pb-2 pt-5">
                <p className="mb-2 text-[10.5px] uppercase tracking-[0.18em] text-ink-soft">Switch space</p>
                <SpaceSwitcher />
              </div>
              <MenuGroup label="Your activity">
                <ProfileLink to="/gratitude" Icon={Sun} label="Gratitude journal" sub="Small mercies, noticed" compact />
                <ProfileLink to="/giving" Icon={HandCoins} label="Giving history" sub="Your gifts and monthly giving" compact />
                <ProfileLink to="/perks" Icon={Gift} label="Thank-you gifts" sub="Private gifts of appreciation" compact />
                <ProfileLink to="/hours" Icon={BadgeCheck} label="Hours served" sub="Verified time and your badge" compact />
                <ProfileLink to="/room" Icon={Lock} label="The Room" sub="Men, unedited" compact />
              </MenuGroup>

              <MenuGroup label="Personal care & service">
                <ProfileLink to="/serve" Icon={HeartHandshake} label="Serve" sub="Shifts, skills, and opportunities" compact />
                <ProfileLink to="/therapy" Icon={HeartHandshake} label="Therapy sessions" sub="Book a licensed therapist" compact />
              </MenuGroup>

              <MenuGroup label="Settings">
                <ProfileLink to="/setup" Icon={Sliders} label="Shape my experience" sub="Your season, rooms, and lanes" compact />
                <button
                  type="button"
                  onClick={() => setAccountOpen(current => !current)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                  aria-expanded={accountOpen}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
                    <UserRound className="h-4 w-4 text-ink" strokeWidth={1.5} />
                  </span>
                  <span className="flex-1 text-[14px] font-medium text-ink">Profile & account</span>
                  <ChevronRight className={`h-4 w-4 text-ink-soft transition-transform ${accountOpen ? "rotate-90" : ""}`} />
                </button>
                {accountOpen && <AccountPanel embedded />}
                <div className="space-y-2 px-3 py-2">
                  <ToneSwitch />
                  <PushToggle />
                  <NotificationSettings />
                </div>

                <MyOrders embedded />
                {isMod && <ProfileLink to="/moderation" Icon={ShieldCheck} label="Moderation" sub="Review community reports" compact />}
                {email ? (
                  <button onClick={handleSignOut} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
                      <LogOut className="h-4 w-4 text-ink" strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink">Sign out</span>
                      <span className="block truncate text-[11px] text-ink-soft">{email}</span>
                    </span>
                  </button>
                ) : (
                  <ProfileLink to="/login" Icon={LogIn} label="Sign in" sub={tone.faith ? "Save your prayers across devices" : "Save your hopes across devices"} compact />
                )}
              </MenuGroup>
            </div>
          </section>
        </div>
      )}

      <div className="mt-8 px-4 lg:mt-0 lg:px-0">
        <div className="mb-3 flex items-center justify-between px-2">
          <h2 className="font-serif text-[14px] uppercase tracking-[0.18em] text-ink-soft">{tone.faith ? "Your prayers" : "Your hopes"}</h2>
          {mine.length > 0 && <Link to="/journal" className="text-[12px] text-brass">See journal</Link>}
        </div>
        {mineQ.isLoading ? (
          <div className="aspect-[9/12] rounded-2xl bg-card border border-border animate-pulse" />
        ) : mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-[13.5px] text-ink-soft">Nothing here yet. Your first ask starts the story.</p>
            <Link to="/record" search={{ mode: "prayer" }} className="mt-3 inline-block rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper">{tone.faith ? "Record a prayer" : "Share a hope"}</Link>
          </div>
        ) : (
          <div className="space-y-5">
            {mine.slice(0, 2).map(p => (
              <PrayerCard key={p.id} prayer={p} onRemoved={() => qc.invalidateQueries({ queryKey: ["stories"] })} />
            ))}
            {mine.length > 2 && <Link to="/journal" className="block text-center text-[13px] text-brass">See all {mine.length} in your journal</Link>}
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarEditor({ userId, name, photo, onChanged }: { userId: string | null; name: string; photo: string | null; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<File | null>(null);

  const pick = (file: File | null) => {
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose a photo."); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Photos need to be under 15 MB."); return; }
    setEditing(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const upload = async (blob: Blob) => {
    if (!userId) return;
    setBusy(true);
    try {
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("profiles").update({ avatar_url: path }).eq("user_id", userId);
      if (error) throw error;
      if (photo && !/^https?:/.test(photo)) void supabase.storage.from("avatars").remove([photo]);
      toast.success("Profile picture updated.");
      setEditing(null);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update your picture.");
    } finally { setBusy(false); }
  };

  const clear = async () => {
    if (!userId || !photo) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
    if (!error && !/^https?:/.test(photo)) void supabase.storage.from("avatars").remove([photo]);
    setBusy(false);
    if (error) toast.error("Couldn't remove your picture."); else { toast.success("Picture removed."); onChanged(); }
  };

  return (
    <div className="mx-auto w-fit">
      <div className="relative">
        <Avatar name={name} photo={photo} size={96} className="border-2 border-brass/40" />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || !userId}
          aria-label="Change profile picture"
          className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-ink text-paper grid place-items-center border-2 border-paper shadow-lift disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={e => pick(e.target.files?.[0] ?? null)} />
      </div>
      {editing && (
        <PhotoStudio
          file={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onDone={blob => void upload(blob)}
        />
      )}
      {photo && <button onClick={() => void clear()} disabled={busy} className="mt-2 text-[11px] text-ink-soft underline-offset-2 hover:underline">Remove picture</button>}
    </div>
  );
}

function ProfileShortcut({ to, Icon, label }: { to: string; Icon: typeof BookOpen; label: string }) {
  return (
    <Link to={to as "/journal"} className="tap-scale flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1 py-3 shadow-soft">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
        <Icon className="h-4 w-4 text-ink" strokeWidth={1.5} />
      </span>
      <span className="max-w-full truncate text-[10.5px] text-ink">{label}</span>
    </Link>
  );
}

function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="px-2 text-[10px] uppercase tracking-[0.18em] text-ink-soft">{label}</h3>
      <div className="mt-2 divide-y divide-border rounded-2xl border border-border bg-card shadow-soft">{children}</div>
    </section>
  );
}

function ProfileLink({ to, Icon, label, sub, compact = false }: { to: string; Icon: typeof BookOpen; label: string; sub: string; compact?: boolean }) {
  return (
    <Link to={to as "/journal"} className={`flex items-center gap-3 ${compact ? "px-3 py-3" : "px-4 py-3.5"}`}>
      <div className="h-9 w-9 rounded-full bg-secondary grid place-items-center">
        <Icon className="h-4 w-4 text-ink" strokeWidth={1.5} />
      </div>
      <div className="flex-1 leading-tight">
        <p className="text-[14px] font-medium text-ink">{label}</p>
        <p className="text-[11px] text-ink-soft">{sub}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-soft" />
    </Link>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="bg-card border border-border rounded-xl py-3">
      <p className="font-serif text-[22px] text-ink leading-none">{n}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink-soft">{label}</p>
    </div>
  );
}
