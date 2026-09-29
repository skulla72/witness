import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProfileMediaGallery } from "./ProfileMediaGallery";
import { addProfileMedia, listProfileMedia, removeProfileMedia, updateProfileMedia, type ProfilePageType } from "@/lib/profileMedia";
import { useSession } from "@/hooks/useSession";

const MAX_IMAGE = 12 * 1024 * 1024;
const MAX_VIDEO = 75 * 1024 * 1024;

export function ProfileMediaManager({ pageType, pageId }: { pageType: ProfilePageType; pageId: string }) {
  const { userId } = useSession();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const queryKey = ["profile-media", pageType, pageId];
  const query = useQuery({ queryKey, queryFn: () => listProfileMedia(pageType, pageId) });
  const rows = query.data ?? [];
  const refresh = () => void qc.invalidateQueries({ queryKey });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !userId) return;
      const isVideo = file.type.startsWith("video/");
      if (!file.type.startsWith("image/") && !isVideo) throw new Error("Choose a photo or video.");
      if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) throw new Error(isVideo ? "Videos must be under 75 MB." : "Photos must be under 12 MB.");
      await addProfileMedia({ userId, pageType, pageId, file, caption, displayOrder: rows.length });
    },
    onSuccess: () => { setFile(null); setCaption(""); if (input.current) input.current.value = ""; refresh(); toast.success("Added to your page."); },
    onError: error => toast.error(error instanceof Error ? error.message : "That file didn't upload."),
  });

  const remove = useMutation({
    mutationFn: removeProfileMedia,
    onSuccess: refresh,
    onError: () => toast.error("That item couldn't be removed."),
  });

  const move = async (index: number, direction: -1 | 1) => {
    const other = rows[index + direction];
    const current = rows[index];
    if (!other || !current) return;
    try {
      await updateProfileMedia(current.id, { caption: current.caption, display_order: other.display_order });
      await updateProfileMedia(other.id, { caption: other.caption, display_order: current.display_order });
      refresh();
    } catch { toast.error("That order didn't save."); }
  };

  return (
    <section className="rounded-md border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Photos & videos</h2><p className="mt-1 text-[12px] text-ink-soft">{rows.length} of 12 items</p></div>
        <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={rows.length >= 12}><Plus /> Add</Button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={event => setFile(event.target.files?.[0] ?? null)} />
      {file && <div className="mt-3 rounded-md border border-border bg-paper p-3"><p className="truncate text-[12.5px] text-ink">{file.name}</p><input value={caption} onChange={event => setCaption(event.target.value)} maxLength={180} placeholder="Caption (optional)" className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-soft" /><Button type="button" size="sm" onClick={() => upload.mutate()} disabled={upload.isPending} className="mt-2">{upload.isPending ? <Loader2 className="animate-spin" /> : <Plus />} Add to page</Button></div>}
      {rows.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-border p-5 text-center text-[12px] text-ink-soft">Add photos of your people, place, or work, and short videos visitors can watch.</p> : <div className="mt-4 space-y-2">{rows.map((item, index) => <div key={item.id} className="flex items-center gap-2 rounded-md border border-border bg-paper p-2"><span className="min-w-0 flex-1 truncate text-[12px] text-ink">{item.caption || (item.media_type === "video" ? "Video" : "Photo")}</span><Button type="button" size="icon" variant="ghost" onClick={() => void move(index, -1)} disabled={index === 0} aria-label="Move earlier"><ChevronUp /></Button><Button type="button" size="icon" variant="ghost" onClick={() => void move(index, 1)} disabled={index === rows.length - 1} aria-label="Move later"><ChevronDown /></Button><Button type="button" size="icon" variant="ghost" onClick={() => remove.mutate(item)} aria-label="Remove"><Trash2 /></Button></div>)}</div>}
      <ProfileMediaGallery pageType={pageType} pageId={pageId} />
    </section>
  );
}