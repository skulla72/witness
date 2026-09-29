import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flag, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { listProfileMedia, type ProfileMedia, type ProfilePageType } from "@/lib/profileMedia";
import { SafetyMenu } from "@/components/safety/ReportSheet";

function Media({ item, className }: { item: ProfileMedia; className: string }) {
  const { url, loading } = useSignedUrl(item.storage_path, "profile-media");
  if (loading || !url) return <div className={`${className} animate-pulse bg-secondary`} />;
  return item.media_type === "video"
    ? <video src={url} playsInline preload="metadata" className={`${className} bg-ink object-cover`} />
    : <img src={url} alt={item.caption} loading="lazy" className={`${className} object-cover`} />;
}

export function ProfileMediaGallery({ pageType, pageId }: { pageType: ProfilePageType; pageId: string }) {
  const [active, setActive] = useState<ProfileMedia | null>(null);
  const query = useQuery({ queryKey: ["profile-media", pageType, pageId], queryFn: () => listProfileMedia(pageType, pageId) });
  const rows = query.data ?? [];
  if (!query.isLoading && rows.length === 0) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Photos & videos</h2>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {rows.map(item => (
          <button key={item.id} type="button" onClick={() => setActive(item)} aria-label={item.caption || `Open ${item.media_type}`} className="group relative aspect-square overflow-hidden rounded-md bg-secondary text-left">
            <Media item={item} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]" />
            {item.media_type === "video" && <span className="absolute bottom-2 left-2 rounded-sm bg-ink/75 px-2 py-1 text-[10px] text-paper">Video</span>}
          </button>
        ))}
      </div>
      {active && <MediaViewer item={active} close={() => setActive(null)} />}
    </section>
  );
}

function MediaViewer({ item, close }: { item: ProfileMedia; close: () => void }) {
  const { url } = useSignedUrl(item.storage_path, "profile-media");
  return (
    <div role="dialog" aria-modal="true" aria-label="Media viewer" className="fixed inset-0 z-50 grid place-items-center bg-ink/85 p-4" onClick={close}>
      <div className="relative w-full max-w-3xl" onClick={event => event.stopPropagation()}>
        <Button type="button" variant="secondary" size="icon" onClick={close} aria-label="Close" className="absolute -top-12 right-0"><X /></Button>
        {url && (item.media_type === "video"
          ? <video src={url} controls autoPlay playsInline className="max-h-[72vh] w-full rounded-md bg-ink object-contain" />
          : <img src={url} alt={item.caption} className="max-h-[72vh] w-full rounded-md object-contain" />)}
        <div className="mt-3 flex items-start justify-between gap-3 text-paper">
          <p className="text-[13px] leading-relaxed">{item.caption}</p>
          <SafetyMenu targetType="profile_media" targetId={item.id} authorId={item.owner_id} tone="dark" label="Report" />
        </div>
      </div>
    </div>
  );
}

export function EmptyProfileGallery() {
  return <div className="grid min-h-32 place-items-center rounded-md border border-dashed border-border text-center"><div><ImageIcon className="mx-auto h-5 w-5 text-ink-soft" /><p className="mt-2 text-[12px] text-ink-soft">No photos or videos yet.</p></div></div>;
}