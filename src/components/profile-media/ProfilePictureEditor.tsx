import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProfileImage } from "./ProfileImage";
import { uploadProfileFile, type ProfilePageType } from "@/lib/profileMedia";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export function ProfilePictureEditor({ pageType, pageId, value, shape, label, onSaved }: {
  pageType: ProfilePageType;
  pageId: string;
  value?: string | null;
  shape: "square" | "wide";
  label: string;
  onSaved: (path: string | null) => Promise<void>;
}) {
  const { userId } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const saveFile = async (file: File | null) => {
    if (!file || !userId) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose a photo."); return; }
    if (file.size > 12 * 1024 * 1024) { toast.error("Photos must be under 12 MB."); return; }
    setBusy(true);
    try {
      const path = await uploadProfileFile(userId, pageType, pageId, file, shape === "wide" ? "cover" : "portrait");
      await onSaved(path);
      if (value && !/^https?:/.test(value)) await supabase.storage.from("profile-media").remove([value]);
      toast.success(`${label} saved.`);
    } catch { toast.error(`That ${label.toLowerCase()} didn't save.`); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { await onSaved(null); if (value && !/^https?:/.test(value)) await supabase.storage.from("profile-media").remove([value]); toast.success(`${label} removed.`); }
    catch { toast.error(`That ${label.toLowerCase()} couldn't be removed.`); }
    finally { setBusy(false); }
  };
  return <div><p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-ink-soft">{label}</p><ProfileImage path={value} alt="" shape={shape} organization={pageType === "organization"} className={shape === "square" ? "h-28 w-28" : undefined} /><div className="mt-2 flex gap-2"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => void saveFile(event.target.files?.[0] ?? null)} /><Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} {value ? "Replace" : "Add"}</Button>{value && <Button type="button" size="icon" variant="ghost" onClick={() => void remove()} disabled={busy} aria-label={`Remove ${label.toLowerCase()}`}><Trash2 /></Button>}</div></div>;
}