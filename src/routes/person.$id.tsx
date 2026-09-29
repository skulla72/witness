import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, MessageCircle, Ban, HandCoins } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { isBlocked, loadAuthor, loadGratitude, loadStoriesBy, unblockMember } from "@/lib/prayers";
import { PrayerCard } from "@/components/PrayerCard";
import { GratitudeCard } from "@/components/GratitudeCard";
import { Avatar } from "@/components/Avatar";
import { SafetyMenu } from "@/components/safety/ReportSheet";
import { openDirectThread } from "@/lib/messaging";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/config/brand";
import { loadBadge } from "@/lib/hours";
import { HoursBadge } from "@/components/serving/HoursBadge";
import { FriendButton } from "@/components/FriendButton";
import { useTone } from "@/hooks/useTone";


export const Route = createFileRoute("/person/$id")({
  staticData: { sitemap: false },
  component: PersonProfile,
  head: () => ({
    meta: [
      { title: "Member · Witness" },
      { name: "description", content: "A member of the Witness community." },
      { property: "og:title", content: "Member · Witness" },
      { property: "og:description", content: "A member of the Witness community." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PersonProfile() {
  const { id } = useParams({ from: "/person/$id" });
  const { userId, signedIn } = useSession();
  const tone = useTone();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const userQ = useQuery({ queryKey: ["author", id], queryFn: () => loadAuthor(id), enabled: !!userId });
  const storiesQ = useQuery({ queryKey: ["stories", "by", id, userId ?? "anon"], queryFn: () => loadStoriesBy(id, userId ?? null), enabled: !!userId });
  const gratQ = useQuery({ queryKey: ["gratitude", "by", id, userId ?? "anon"], queryFn: () => loadGratitude({ authorId: id, viewerId: userId ?? null, limit: 6 }), enabled: !!userId });
  const blockedQ = useQuery({ queryKey: ["blocked", userId, id], queryFn: () => isBlocked(userId!, id), enabled: !!userId && userId !== id });
  // Serving is public; giving shows only as a quiet "gives" mark — never an amount.
  const badgeQ = useQuery({ queryKey: ["badge", id], queryFn: () => loadBadge(id), enabled: !!userId });
  const givesQ = useQuery({
    queryKey: ["gives", id],
    queryFn: async () => {
      const { data } = await supabase.rpc("member_cards", { _ids: [id] });
      return !!data?.[0]?.has_given;
    },
    enabled: !!userId,
  });

  if (signedIn === false) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Members see each other.</p>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Sign in</Link>
      </div>
    );
  }
  if (userQ.isLoading || userId === undefined) {
    return <div className="px-6 pt-10"><div className="mx-auto h-24 w-24 rounded-full bg-card border border-border animate-pulse" /></div>;
  }
  const user = userQ.data;
  if (!user) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">This person keeps a quiet profile.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-[13px] text-paper">Back to today</Link>
      </div>
    );
  }

  const isMe = userId === id;
  // Anonymous asks are hidden from everyone but the author, even on their own page.
  const theirPrayers = (storiesQ.data ?? []).filter(p => isMe || !p.is_anonymous);
  const answered = theirPrayers.filter(p => !!p.answer);
  const theirGratitudes = (gratQ.data ?? []).filter(g => g.privacy === "community" || isMe);
  const first = user.name.split(" ")[0];

  const message = async () => {
    if (!userId) return;
    const res = await openDirectThread(userId, id);
    if (res.id) navigate({ to: "/messages/$id", params: { id: res.id } });
    else toast.error(res.error ?? "Couldn't open a conversation.");
  };

  const unblock = async () => {
    if (!userId) return;
    await unblockMember(userId, id);
    qc.invalidateQueries({ queryKey: ["blocked", userId, id] });
    qc.invalidateQueries({ queryKey: ["stories"] });
    toast.success("Unblocked.");
  };

  return (
    <div className="pt-4 pb-8">
      <div className="px-4 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        {!isMe && <SafetyMenu targetType="profile" targetId={id} authorId={id} label="Report person" />}
      </div>

      <header className="mt-4 px-6 text-center">
        <Avatar name={user.name} photo={user.photo} size={96} className="mx-auto border-2 border-brass/40" />
        <h1 className="mt-4 font-serif text-[26px] text-ink">{user.name}</h1>
        {user.bio && <p className="mt-1 text-[13px] text-ink-soft italic">"{user.bio}"</p>}

        <div className="mt-6 grid grid-cols-2 gap-2 max-w-[240px] mx-auto">
          <Stat n={theirPrayers.length} label={tone.faith ? "Prayers" : "Hopes"} />
          <Stat n={answered.length} label={tone.faith ? "Answered" : "Came through"} />
        </div>

        {answered.length > 0 && (
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-brass/10 px-3.5 py-1.5 text-[11.5px] text-ink">
            <Sparkles className="h-3.5 w-3.5 text-brass" />
            {tone.faith
              ? answered.length === 1 ? "One story of an answered prayer" : `${answered.length} stories of answered prayers`
              : answered.length === 1 ? "One hope that came through" : `${answered.length} hopes that came through`}
          </p>
        )}

        {(badgeQ.data || givesQ.data) && (
          <div className="mx-auto mt-4 max-w-[320px] space-y-2 text-left">
            {badgeQ.data && (
              <HoursBadge
                userId={id}
                hoursVerified={Number(badgeQ.data.hours_verified)}
                hoursSelf={Number(badgeQ.data.hours_self)}
                businessName={badgeQ.data.business_name}
                businessLine={badgeQ.data.business_line}
              />
            )}
            {givesQ.data && (
              <p className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                <HandCoins className="h-3.5 w-3.5 text-brass" /> Gives through {BRAND.name}
              </p>
            )}
          </div>
        )}

        {!isMe && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {blockedQ.data ? (
              <button onClick={() => void unblock()} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] text-ink"><Ban className="h-3.5 w-3.5" /> Unblock</button>
            ) : (
              <>
                {userId && <FriendButton myUserId={userId} personId={id} firstName={first} />}
                <button onClick={() => void message()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[12.5px] text-paper"><MessageCircle className="h-3.5 w-3.5" /> Message {first}</button>
              </>
            )}
          </div>
        )}

        {isMe && <Link to="/profile" className="mt-4 inline-block text-[12px] text-brass">Edit your profile</Link>}
      </header>

      {theirGratitudes.length > 0 && (
        <section className="mt-8 px-4">
          <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">Gratitudes</h2>
          <div className="grid grid-cols-2 gap-3">
            {theirGratitudes.map(g => <GratitudeCard key={g.id} g={g} />)}
          </div>
        </section>
      )}

      <section className="mt-8 px-4">
        <h2 className="px-2 font-serif text-[14px] text-ink-soft mb-3 uppercase tracking-[0.18em]">{tone.faith ? "Prayers shared with you" : "Hopes shared with you"}</h2>
        {storiesQ.isLoading ? (
          <div className="aspect-[9/12] rounded-2xl bg-card border border-border animate-pulse" />
        ) : theirPrayers.length === 0 ? (
          <p className="px-2 text-[13px] text-ink-soft">{tone.faith ? `${first} is praying quietly right now.` : `${first} hasn't shared anything here yet.`}</p>
        ) : (
          <div className="space-y-5">
            {theirPrayers.map(p => <PrayerCard key={p.id} prayer={p} onRemoved={() => qc.invalidateQueries({ queryKey: ["stories"] })} />)}
          </div>
        )}
      </section>
    </div>
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
