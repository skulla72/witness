import { useTone } from "@/hooks/useTone";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { X, Circle, RotateCcw, Lock, Users, Church, Globe, Eye, EyeOff, Camera, Sun, Mic, Type, Video, Sparkles, Upload, Check, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { createAsk, loadFeed, loadStory, loadStoriesBy, postAnswer, sendIntercession, uploadTestimonyMedia, mediaTypeOf, type AnswerKind, type Story } from "@/lib/prayers";
import { markMilestone } from "@/lib/usage";
import { Avatar } from "@/components/Avatar";
import { VoiceRecorder, fmtSeconds, type VoiceTake } from "@/components/media/VoiceRecorder";
import { CrisisDialog } from "@/components/safety/CrisisDialog";
import { looksLikeCrisis } from "@/lib/crisis";
import { STOCK_PHOTO_ALBUMS, stockPhotoToFile, type StockPhoto } from "@/lib/stockPhotos";
import { GratitudePhotoEditor } from "@/components/gratitude/GratitudePhotoEditor";
import { VideoOverlayEditor, type StickerOption } from "@/components/video/VideoOverlayEditor";
import { OverlayLayers } from "@/components/video/OverlayLayers";
import { daysBetween, hasOverlay, type VideoOverlay } from "@/lib/overlay";


type Mode = "choose" | "prayer" | "gratitude" | "intercession" | "reaction";

export const Route = createFileRoute("/record")({
  staticData: { sitemap: false },
  component: Record,
  validateSearch: (s: Record<string, unknown>): { mode?: Mode; prayer?: string; text?: string; kind?: GratKind } => ({
    mode: ["prayer", "gratitude", "intercession", "reaction", "answer"].includes(String(s.mode)) ? (s.mode === "answer" ? "reaction" : (s.mode as Mode)) : undefined,
    prayer: typeof s.prayer === "string" ? s.prayer : undefined,
    text: typeof s.text === "string" && s.text.length <= 600 ? s.text : undefined,
    kind: ["photo", "video", "text", "voice"].includes(String(s.kind)) ? (s.kind as GratKind) : undefined,
  }),

  head: () => ({ meta: [
    { title: "Record a Prayer · Witness" },
    { name: "description", content: "Record or write a prayer request, gratitude, or answer in Witness." },
    { property: "og:title", content: "Record a Prayer · Witness" },
    { property: "og:description", content: "Record or write a prayer request, gratitude, or answer in Witness." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const categories = ["Health", "Family", "Provision", "Faith", "Relationships", "Work", "Salvation", "Grief", "Other"] as const;
const privacy = [
  { id: "private", label: "Private", Icon: Lock, sub: "Just me" },
  { id: "circle", label: "Circle", Icon: Users, sub: "Trusted few" },
  { id: "church", label: "Church", Icon: Church, sub: "My group" },
  { id: "public", label: "Public", Icon: Globe, sub: "Anyone" },
] as const;

type PrivId = (typeof privacy)[number]["id"];
type Cat = (typeof categories)[number];

type GratKind = "photo" | "video" | "text" | "voice";
type PrayerKind = "text" | "voice" | "video";

const DRAFT_KEY = "witness.record.draft.v1";

function readDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(value: string) {
  try {
    if (value.trim()) window.localStorage.setItem(DRAFT_KEY, value);
    else window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* private browsing — nothing to keep */
  }
}

function Record() {
  const tone = useTone();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { userId, signedIn } = useSession();
  const [mode, setMode] = useState<Mode>(search.mode ?? "choose");
  const [step, setStep] = useState<"capture" | "compose">("capture");
  const [caption, setCaption] = useState(search.text ?? "");
  const [category, setCategory] = useState<Cat>("Faith");
  const [priv, setPriv] = useState<PrivId>("circle");
  const [anon, setAnon] = useState(false);
  const [gratKind, setGratKind] = useState<GratKind>("photo");
  const [prayerKind, setPrayerKind] = useState<PrayerKind>("text");
  const [askBg, setAskBg] = useState<string>("oklch(0.86 0.06 250)");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [voiceTake, setVoiceTake] = useState<VoiceTake | null>(null);
  const [backdrop, setBackdrop] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [targetId, setTargetId] = useState<string | undefined>(search.prayer);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [overlay, setOverlay] = useState<VideoOverlay | null>(null);
  const [editingOverlay, setEditingOverlay] = useState(false);
  const [stickers, setStickers] = useState<StickerOption[]>([]);
  useEffect(() => {
    setOverlay(null);
    if (!mediaFile) { setEditingOverlay(false); return; }
    // Any picked or recorded video opens the words editor with the video playing behind it.
    if (mediaFile.type.startsWith("video") && mode !== "gratitude") setEditingOverlay(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFile]);
  const openOverlay = (opts: StickerOption[] = []) => { setStickers(opts); setEditingOverlay(true); };

  useEffect(() => { if (search.mode) setMode(search.mode); if (search.prayer) setTargetId(search.prayer); if (search.kind) setGratKind(search.kind); }, [search.mode, search.prayer, search.kind]);

  // Words typed here survive a dropped signal, a closed tab, or a phone call.
  useEffect(() => {
    if (search.text) return;
    const kept = readDraft();
    if (kept) setCaption(current => (current ? current : kept));
  }, [search.text]);

  useEffect(() => {
    writeDraft(caption);
  }, [caption]);

  const invalidate = () => {
    writeDraft("");
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: ["stories"] });
    qc.invalidateQueries({ queryKey: ["story"] });
    qc.invalidateQueries({ queryKey: ["gratitude"] });
  };


  const requireMember = () => {
    if (signedIn === false) {
      toast.error("Sign in to share with the community.");
      navigate({ to: "/login" });
      return false;
    }
    return Boolean(userId);
  };

  const postPrayer = async (skipCrisisCheck = false) => {
    if (!requireMember() || !userId || posting) return;
    if (prayerKind === "video" && !mediaFile) { toast.error("Record or choose a video first."); return; }
    if (prayerKind === "voice" && !voiceTake) { toast.error("Speak your prayer first."); return; }
    if (prayerKind === "text" && !caption.trim()) { toast.error("Write your prayer first."); return; }
    // Help before publishing when the words sound like danger.
    if (!skipCrisisCheck && looksLikeCrisis(caption)) { setCrisisOpen(true); return; }
    setPosting(true);
    try {
      const prayerId = await createAsk({
        userId, body: caption, category, privacy: priv, isAnonymous: anon,
        bg: prayerKind === "video" || (prayerKind === "text" && backdrop) ? null : askBg,
        media: prayerKind === "voice" && voiceTake ? { file: voiceTake.file, seconds: voiceTake.seconds }
          : prayerKind === "video" && mediaFile ? { file: mediaFile }
            : prayerKind === "text" && backdrop ? { file: backdrop } : null,
        backdrop: prayerKind === "voice" ? backdrop : null,
        overlay: prayerKind === "video" ? overlay : null,
      });
      invalidate();
      markMilestone();
      toast.success(prayerKind === "voice" ? "Your voice is now held by the community." : `Your ${tone.ask} is now held by the community.`);
      navigate({ to: "/prayer/$id", params: { id: prayerId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your prayer could not be posted.");
    } finally { setPosting(false); }
  };

  const postGratitude = async (isPublic: boolean) => {
    if (!requireMember() || !userId || posting) return;
    if (!caption.trim()) { toast.error("Add a few words of gratitude first."); return; }
    setPosting(true);
    try {
      const mediaPath = mediaFile ? await uploadTestimonyMedia(userId, "gratitude", mediaFile) : null;
      const { error } = await supabase.from("gratitude_entries").insert({
        author_id: userId, body: caption.trim(), privacy: isPublic ? "community" : "private",
        media_path: mediaPath, media_type: mediaFile ? mediaTypeOf(mediaFile) : null,
        linked_prayer_id: targetId ?? null,
      });
      if (error) throw error;
      invalidate();
      toast.success(isPublic ? "Gratitude shared." : "Gratitude saved privately.");
      navigate({ to: "/gratitude" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your gratitude could not be saved.");
    } finally { setPosting(false); }
  };

  const postReaction = async (kind: AnswerKind, isPublic: boolean, story: Story) => {
    if (!requireMember() || !userId || posting) return;
    if (!mediaFile && !caption.trim()) { toast.error("Record the reaction or write a few words."); return; }
    setPosting(true);
    try {
      await postAnswer({
        parentId: story.id, userId, body: caption, kind, file: mediaFile, category: story.category, overlay,
        privacy: isPublic ? (story.privacy === "private" ? "circle" : story.privacy) : "private", isAnonymous: story.is_anonymous,
      });
      invalidate();
      markMilestone();
      toast.success("The answer is linked to your ask.");
      navigate({ to: "/prayer/$id", params: { id: story.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The answer could not be posted.");
    } finally { setPosting(false); }
  };

  const postIntercession = async (story: Story) => {
    if (!requireMember() || !userId || posting) return;
    if (!mediaFile && !caption.trim()) { toast.error("Record a prayer or write a note first."); return; }
    setPosting(true);
    try {
      await sendIntercession(story.id, userId, mediaFile, caption);
      invalidate();
      toast.success(`Sent privately to ${story.author.id ? story.author.name.split(" ")[0] : "them"}.`);
      navigate({ to: "/prayer/$id", params: { id: story.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your prayer.");
    } finally { setPosting(false); }
  };

  return (
    <div className="min-h-screen bg-ink text-paper md:grid md:place-items-center md:p-6">
      <CrisisDialog
        open={crisisOpen}
        onOpenChange={setCrisisOpen}
        onContinue={() => { setCrisisOpen(false); void postPrayer(true); }}
      />
      {editingOverlay && mediaFile && mediaFile.type.startsWith("video") && (
        <VideoOverlayEditor
          file={mediaFile}
          initial={overlay}
          stickers={stickers}
          onCancel={() => setEditingOverlay(false)}
          onDone={o => { setOverlay(o); setEditingOverlay(false); }}
        />
      )}
      <div className="mx-auto max-w-md min-h-screen flex flex-col relative md:min-h-[calc(100vh-3rem)] md:w-full md:max-w-xl md:overflow-hidden md:rounded-lg md:border md:border-paper/15 md:bg-ink md:shadow-lift">
        <header className="flex items-center justify-between px-5 pt-4">
          <Link to="/" className="text-paper/80"><X className="h-5 w-5" /></Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-paper/60">
            {mode === "choose" ? "Create" :
              mode === "prayer" ? (step === "capture" ? (prayerKind === "voice" ? "The Ask · speak it" : prayerKind === "video" ? "The Ask · on camera" : "The Ask · write it") : "Before you post")
              : mode === "gratitude" ? "Gratitude · keep it small"
              : mode === "intercession" ? tone.say("Pray for them · private", "Encourage them · private")
              : "The Reaction · 60 seconds"}
          </p>
          <span className="w-5" />
        </header>

        {mode === "choose" ? (
          <ChooseView onPick={(m) => { setMode(m); setStep("capture"); }} />
        ) : mode === "gratitude" ? (
          <GratitudeCompose kind={gratKind} setKind={setGratKind} caption={caption} setCaption={setCaption} mediaFile={mediaFile} setMediaFile={setMediaFile} posting={posting} onPost={postGratitude} />
        ) : mode === "intercession" ? (
          <IntercessionCompose userId={userId ?? null} targetId={targetId} setTargetId={setTargetId} caption={caption} setCaption={setCaption} mediaFile={mediaFile} setMediaFile={setMediaFile} posting={posting} onPost={postIntercession} />
        ) : mode === "reaction" ? (
          <ReactionCompose userId={userId ?? null} targetId={targetId} setTargetId={setTargetId} caption={caption} setCaption={setCaption} mediaFile={mediaFile} setMediaFile={setMediaFile} posting={posting} onPost={postReaction} overlay={overlay} onEditOverlay={openOverlay} />
        ) : step === "capture" ? (
          <CaptureView
            kind={prayerKind}
            setKind={setPrayerKind}
            caption={caption}
            setCaption={setCaption}
            bg={askBg}
            setBg={setAskBg}
            mediaFile={mediaFile}
            setMediaFile={setMediaFile}
            voiceTake={voiceTake}
            setVoiceTake={setVoiceTake}
            backdrop={backdrop}
            setBackdrop={setBackdrop}
            onCaptured={() => { setStep("compose"); if (prayerKind === "video") openOverlay(); }}
          />
        ) : (
          <ComposeView
            caption={caption}
            setCaption={setCaption}
            category={category}
            setCategory={setCategory}
            priv={priv}
            setPriv={setPriv}
            anon={anon}
            setAnon={setAnon}
            prayerKind={prayerKind}
            askBg={askBg}
            mediaFile={mediaFile}
            voiceTake={voiceTake}
            backdrop={backdrop}
            posting={posting}
            onPost={postPrayer}
            onBack={() => setStep("capture")}
            overlay={overlay}
            onEditOverlay={() => openOverlay()}
          />
        )}

        {mode !== "choose" && (
          <button
            onClick={() => { setMode("choose"); setStep("capture"); }}
            className="absolute top-4 right-5 text-[11px] text-paper/55"
          >
            Switch
          </button>
        )}
      </div>
    </div>
  );
}

function ChooseView({ onPick }: { onPick: (m: Mode) => void }) {
  const tone = useTone();
  const choices: Array<{ id: Mode; label: string; sub: string; Icon: typeof Sun; tone: string }> = [
    { id: "prayer", label: tone.askTitle, sub: "Write it, or speak it in 20 seconds over a photo.", Icon: Mic, tone: "bg-paper/5 border-paper/15" },
    { id: "reaction", label: "The Answer", sub: "Write or record what happened — it links to your ask.", Icon: Sparkles, tone: "bg-brass/15 border-brass/40" },
    { id: "intercession", label: tone.prayForSomeone, sub: "Video or voice — sent privately to them.", Icon: Video, tone: "bg-paper/5 border-paper/15" },
    { id: "gratitude", label: "A Gratitude", sub: tone.say("A small mercy. A photo. A word.", "A small good thing. A photo. A word."), Icon: Sun, tone: "bg-brass/15 border-brass/40" },
  ];
  return (
    <div className="flex-1 px-6 pt-8 pb-12 flex flex-col">
      <h2 className="font-serif text-[26px] leading-tight text-paper">What do you want to put on display?</h2>
      <p className="mt-2 text-[13px] text-paper/60">Asking, thanking, answering — the whole journey.</p>
      <div className="mt-8 space-y-3">
        {choices.map(c => (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className={`w-full text-left p-5 rounded-2xl border ${c.tone} flex items-start gap-4 active:scale-[0.99] transition-transform`}
          >
            <div className="h-11 w-11 rounded-full bg-paper/10 grid place-items-center shrink-0">
              <c.Icon className="h-5 w-5 text-paper" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-serif text-[19px] text-paper leading-tight">{c.label}</p>
              <p className="mt-1 text-[12px] text-paper/60">{c.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GratitudeCompose({
  kind, setKind, caption, setCaption, mediaFile, setMediaFile, posting, onPost,
}: { kind: GratKind; setKind: (k: GratKind) => void; caption: string; setCaption: (s: string) => void; mediaFile: File | null; setMediaFile: (file: File | null) => void; posting: boolean; onPost: (isPublic: boolean) => Promise<void> }) {
  const kinds: Array<{ id: GratKind; label: string; Icon: typeof Sun }> = [
    { id: "photo", label: "Photo", Icon: Camera },
    { id: "video", label: "Video · 30s", Icon: Circle },
    { id: "text", label: "Text", Icon: Type },
    { id: "voice", label: "Voice", Icon: Mic },
  ];
  const [isPublic, setIsPublic] = useState(true);
  return (
    <div className="flex-1 px-5 pt-4 pb-8 flex flex-col">
      <div className="grid grid-cols-4 gap-2">
        {kinds.map(k => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[11px] ${
              kind === k.id ? "bg-brass/20 border-brass/60 text-paper" : "bg-paper/5 border-paper/15 text-paper/70"
            }`}
          >
            <k.Icon className="h-4 w-4" />
            {k.label}
          </button>
        ))}
      </div>

      {kind === "voice" ? (
        <div className="mt-5">
          <VoiceRecorder take={mediaFile ? { file: mediaFile, seconds: 0 } : null} onTake={t => setMediaFile(t?.file ?? null)} hint="One small mercy, out loud." />
        </div>
      ) : kind === "text" ? (
        <div className="mt-5 flex-1 rounded-2xl border border-paper/15 bg-[oklch(0.92_0.04_60)] grid place-items-center p-6 min-h-[260px]">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Thank you for…"
            aria-label="What are you thankful for?"
            className="w-full h-full bg-transparent text-ink font-serif text-[22px] text-center placeholder:text-ink/40 focus:outline-none resize-none"
          />
        </div>
      ) : (
          <GratitudeMediaPick kind={kind === "video" ? "video" : "photo"} mediaFile={mediaFile} setMediaFile={setMediaFile} caption={caption} />
      )}


      {kind !== "text" && (
        <input
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="A short caption."
          aria-label="A short caption"
          className="mt-4 w-full bg-paper/5 border border-paper/15 rounded-xl px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-brass/60"
        />
      )}

      <PrivacyToggle isPublic={isPublic} setIsPublic={setIsPublic} publicLabel="Public · everyone" privateLabel="Private · just me" />

      <button disabled={posting} onClick={() => void onPost(isPublic)} className="mt-5 grid place-items-center py-3.5 rounded-xl bg-brass text-ink font-medium text-[14px] tracking-wide shadow-lift disabled:opacity-50">
        {posting ? "Saving…" : isPublic ? "Post Gratitude" : "Save Privately"}
      </button>
    </div>
  );
}

/** Gratitude photo/video: take one with the camera, or pick one already on the phone. */
function GratitudeMediaPick({ kind, mediaFile, setMediaFile, caption }: { kind: "photo" | "video"; mediaFile: File | null; setMediaFile: (f: File | null) => void; caption: string }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const url = useObjectUrl(mediaFile);
  const accept = kind === "photo" ? "image/*" : "video/*";

  const pick = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.value = "";
    input.click();
  };
  const choosePhoto = (file: File) => {
    setSourceFile(file);
    setEditorOpen(true);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) kind === "photo" ? choosePhoto(file) : setMediaFile(file);
  };

  return (
    <div className="mt-5 flex-1 min-h-[260px] flex flex-col">
      <div className="relative flex-1 min-h-[220px] overflow-hidden rounded-2xl border border-paper/15 bg-[oklch(0.92_0.04_60)] grid place-items-center p-6 text-center">
        {url && kind === "photo" && <img src={url} alt="Your chosen photo" className="absolute inset-0 h-full w-full object-cover" />}
        {url && kind === "video" && <video src={url} controls playsInline className="absolute inset-0 h-full w-full object-cover" />}
        {!url && (
          <div className="text-ink/60">
            <Upload className="mx-auto mb-3 h-6 w-6" />
            <p className="font-serif text-[18px] text-ink">{kind === "photo" ? "Add a photo" : "Add a video"}</p>
            <p className="mt-2 text-[12px]">{kind === "photo" ? "Take one, choose one, or pick a mood." : "It stays protected inside Witness."}</p>
          </div>
        )}
        {mediaFile && (
          <button
            type="button"
            onClick={() => setMediaFile(null)}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] text-paper"
          >
            <RotateCcw className="h-3 w-3" /> Start over
          </button>
        )}
        {mediaFile && kind === "photo" && (
          <button type="button" onClick={() => setEditorOpen(true)} className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-paper/90 px-3 py-1.5 text-[11px] font-medium text-ink shadow-soft">
            <Sparkles className="h-3 w-3" /> Edit photo
          </button>
        )}
      </div>

      {kind === "photo" ? (
        <>
          <PhotoInputActions onPick={choosePhoto} takeLabel="Take a photo" chooseLabel="Choose a photo" />
          <StockPhotoPicker selectedFile={sourceFile ?? mediaFile} onPick={choosePhoto} />
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => pick(cameraRef.current)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper/15 bg-paper/5 py-3 text-[13px] text-paper"
            >
              <Camera className="h-4 w-4" /> Record a video
            </button>
            <button
              type="button"
              onClick={() => pick(libraryRef.current)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper/15 bg-paper/5 py-3 text-[13px] text-paper"
            >
              <ImagePlus className="h-4 w-4" /> Choose a video
            </button>
          </div>
          <input ref={cameraRef} type="file" className="sr-only" accept={accept} capture="user" onChange={onChange} />
          <input ref={libraryRef} type="file" className="sr-only" accept={accept} onChange={onChange} />
        </>
      )}
      {kind === "photo" && sourceFile && (
        <GratitudePhotoEditor
          file={sourceFile}
          open={editorOpen}
          caption={caption}
          onOpenChange={setEditorOpen}
          onDone={setMediaFile}
        />
      )}
    </div>
  );
}

async function captureNativePhotoFile(): Promise<{ native: boolean; file: File | null }> {
  if (!Capacitor.isNativePlatform()) return { native: false, file: null };
  try {
    const { Camera: NativeCamera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await NativeCamera.getPhoto({
      quality: 88,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true,
    });
    if (!photo.webPath) return { native: true, file: null };
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    const extension = photo.format || "jpg";
    return { native: true, file: new File([blob], `witness-photo-${Date.now()}.${extension}`, { type: blob.type || "image/jpeg" }) };
  } catch {
    return { native: true, file: null };
  }
}

function PhotoInputActions({ onPick, takeLabel = "Take a photo", chooseLabel = "Choose a photo" }: { onPick: (file: File) => void; takeLabel?: string; chooseLabel?: string }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const pick = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.value = "";
    input.click();
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) onPick(file);
  };
  const takePhoto = async () => {
    if (!Capacitor.isNativePlatform()) {
      pick(cameraRef.current);
      return;
    }
    const nativePhoto = await captureNativePhotoFile();
    if (nativePhoto.file) onPick(nativePhoto.file);
  };
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => void takePhoto()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper/15 bg-paper/5 py-3 text-[13px] text-paper"
      >
        <Camera className="h-4 w-4" /> {takeLabel}
      </button>
      <button
        type="button"
        onClick={() => pick(libraryRef.current)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-paper/15 bg-paper/5 py-3 text-[13px] text-paper"
      >
        <ImagePlus className="h-4 w-4" /> {chooseLabel}
      </button>
      <input ref={cameraRef} type="file" className="sr-only" accept="image/*" capture="environment" onChange={onChange} />
      <input ref={libraryRef} type="file" className="sr-only" accept="image/*" onChange={onChange} />
    </div>
  );
}

function StockPhotoPicker({ selectedFile, onPick }: { selectedFile: File | null; onPick: (file: File) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [activeAlbumId, setActiveAlbumId] = useState(STOCK_PHOTO_ALBUMS[0]?.id ?? "");
  const activeAlbum = STOCK_PHOTO_ALBUMS.find(album => album.id === activeAlbumId) ?? STOCK_PHOTO_ALBUMS[0];
  const choose = async (photo: StockPhoto) => {
    setBusy(photo.id);
    try {
      onPick(await stockPhotoToFile(photo));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That photo could not be opened.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] text-paper/55">Mood albums</p>
        <p className="text-[11px] text-paper/40">choose a feeling</p>
      </div>
      <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Mood albums">
        {STOCK_PHOTO_ALBUMS.map(album => (
          <button
            key={album.id}
            type="button"
            onClick={() => setActiveAlbumId(album.id)}
            aria-selected={activeAlbum?.id === album.id}
            role="tab"
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${activeAlbum?.id === album.id ? "border-brass bg-brass/15 text-paper" : "border-paper/15 bg-paper/5 text-paper/65"}`}
          >
            {album.label}
          </button>
        ))}
      </div>
      {activeAlbum && (
        <p className="mt-1 text-[11px] text-paper/40">{activeAlbum.hint}</p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {activeAlbum?.photos.map(photo => {
          const picked = selectedFile?.name === photo.filename;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => void choose(photo)}
              aria-pressed={picked}
              className={`relative aspect-[4/5] min-w-0 overflow-hidden rounded-xl border text-left shadow-soft ${picked ? "border-brass" : "border-paper/15"}`}
            >
              <img src={photo.src} alt={`${photo.label}: ${photo.feeling}`} width={960} height={960} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/45 to-transparent p-2 pt-7">
                <span className="block text-[12px] font-medium leading-tight text-paper">{busy === photo.id ? "Opening…" : photo.label}</span>
                <span className="block text-[9.5px] leading-tight text-paper/70">{photo.feeling}</span>
              </span>
              {picked && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brass text-ink"><Check className="h-3 w-3" /></span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}



function TargetPicker({
  title, hint, stories, loading, targetId, setTargetId, emptyText,
}: { title: string; hint: string; stories: Story[]; loading: boolean; targetId?: string; setTargetId: (id: string) => void; emptyText: string }) {
  return (
    <div className="flex-1 px-5 pt-4 pb-8 flex flex-col">
      <h2 className="font-serif text-[22px] text-paper leading-tight">{title}</h2>
      <p className="mt-1 text-[12.5px] text-paper/60">{hint}</p>
      <div className="mt-5 space-y-2">
        {loading && <div className="h-16 rounded-xl bg-paper/5 animate-pulse" />}
        {!loading && stories.length === 0 && (
          <p className="text-[13px] text-paper/60 italic">{emptyText}</p>
        )}
        {stories.map(s => (
          <button key={s.id} onClick={() => setTargetId(s.id)} className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 ${targetId === s.id ? "border-brass/60 bg-brass/15" : "border-paper/15 bg-paper/5"}`}>
            <Avatar name={s.is_anonymous ? "Anonymous" : s.author.name} photo={s.is_anonymous ? null : s.author.photo} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-paper truncate">{s.ask_caption || (s.ask_media_path ? "Video ask" : "Prayer")}</p>
              <p className="text-[11px] text-paper/55">{s.is_anonymous ? "Anonymous" : s.author.name} · {s.category}</p>
            </div>
            {targetId === s.id && <Check className="h-4 w-4 text-brass" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function MediaPicker({ accept, capture, mediaFile, setMediaFile, label, overlay }: { accept: string; capture?: "user" | "environment"; mediaFile: File | null; setMediaFile: (f: File | null) => void; label: string; overlay?: VideoOverlay | null }) {
  return (
    <div className="mt-4 rounded-2xl border border-paper/15 bg-paper/5 min-h-[220px] relative overflow-hidden grid place-items-center">
      {mediaFile && accept.startsWith("video") ? <VideoPreview file={mediaFile} overlay={overlay} /> : mediaFile ? (
        <p className="text-[13px] text-paper/80 px-4 text-center">{mediaFile.name}</p>
      ) : (
        <div className="text-center text-paper/70 p-6">
          <p className="font-serif text-[17px] text-paper">{label}</p>
          <p className="mt-2 text-[12px]">Stays protected inside Witness.</p>
          <div className="mt-4 flex justify-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-[13px] font-medium text-ink">
              <Camera className="h-4 w-4" /> Record
              <input type="file" className="sr-only" accept={accept} capture={capture ?? "user"} onChange={e => setMediaFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-paper/25 px-4 py-2 text-[13px] text-paper">
              <Upload className="h-4 w-4" /> Upload
              <input type="file" className="sr-only" accept={accept} onChange={e => setMediaFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
      )}
      {mediaFile && (
        <button onClick={() => setMediaFile(null)} className="absolute top-2 right-2 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] text-paper inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Redo</button>
      )}
    </div>
  );
}

function IntercessionCompose({
  userId, targetId, setTargetId, caption, setCaption, mediaFile, setMediaFile, posting, onPost,
}: { userId: string | null; targetId?: string; setTargetId: (id: string) => void; caption: string; setCaption: (s: string) => void; mediaFile: File | null; setMediaFile: (f: File | null) => void; posting: boolean; onPost: (story: Story) => Promise<void> }) {
  const tone = useTone();
  const [kind, setKind] = useState<"video" | "voice" | "word">("video");
  const feedQ = useQuery({ queryKey: ["stories", "feed-pick", userId ?? "anon"], queryFn: () => loadFeed(userId), enabled: !targetId && !!userId });
  const storyQ = useQuery({ queryKey: ["story", targetId, userId ?? "anon"], queryFn: () => loadStory(targetId!, userId), enabled: !!targetId });

  if (!targetId) {
    const others = (feedQ.data ?? []).filter(s => s.user_id !== userId && s.status === "open");
    return <TargetPicker title={tone.say("Who are you praying for?", "Who would you like to encourage?")} hint={tone.say("Pick an open ask. Your prayer goes only to them.", "Pick an open ask. Your words go only to them.")} stories={others} loading={feedQ.isLoading} targetId={targetId} setTargetId={setTargetId} emptyText="No open asks from others right now." />;
  }
  const story = storyQ.data;
  if (!story) return <div className="flex-1 px-5 pt-6"><div className="h-20 rounded-xl bg-paper/5 animate-pulse" /></div>;
  const first = story.is_anonymous ? "them" : story.author.name.split(" ")[0];

  return (
    <div className="flex-1 px-5 pt-4 pb-8 flex flex-col">
      <div className="rounded-xl border border-paper/15 bg-paper/5 p-3 flex items-start gap-3">
        <Avatar name={story.is_anonymous ? "Anonymous" : story.author.name} photo={story.is_anonymous ? null : story.author.photo} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-paper/50">{tone.say("Praying for", "Standing with")} {first}</p>
          <p className="mt-1 text-[13px] text-paper/85 line-clamp-3">"{story.ask_caption || "Video ask"}"</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {([["video", "Video", Video], ["voice", "Voice", Mic], ["word", "Written", Type]] as const).map(([id, label, Icon]) => (
          <button key={id} aria-pressed={kind === id} onClick={() => { setKind(id); setMediaFile(null); }} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[11px] ${kind === id ? "bg-brass/20 border-brass/60 text-paper" : "bg-paper/5 border-paper/15 text-paper/70"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {kind === "video" && (
        <MediaPicker accept="video/*" capture="user" mediaFile={mediaFile} setMediaFile={setMediaFile} label={tone.say("Record yourself praying", "Record a message for them")} />
      )}
      {kind === "voice" && (
        <div className="mt-4">
          <VoiceRecorder take={mediaFile ? { file: mediaFile, seconds: 0 } : null} onTake={t => setMediaFile(t?.file ?? null)} hint={`Say ${first}'s name out loud.`} />
        </div>
      )}
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={kind === "word" ? 5 : 2} maxLength={600} aria-label={kind === "word" ? "Your words" : "A short note (optional)"} placeholder={kind === "word" ? tone.say(`Lord, for ${first}…`, `${first}, I'm with you…`) : "A short note (optional)"} className="mt-4 w-full bg-paper/5 border border-paper/15 rounded-xl px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-brass/60 resize-none" />
      <p className="mt-3 text-[11px] text-paper/50 inline-flex items-center gap-1.5"><Lock className="h-3 w-3" /> Video and voice {tone.asks} are private to {first}. Written words appear under the {tone.ask}.</p>
      <button disabled={posting} onClick={() => void onPost(story)} className="mt-4 grid place-items-center py-3.5 rounded-xl bg-brass text-ink font-medium text-[14px] tracking-wide shadow-lift disabled:opacity-50">
        {posting ? "Sending…" : `Send to ${first}`}
      </button>
    </div>
  );
}

function ReactionCompose({
  userId, targetId, setTargetId, caption, setCaption, mediaFile, setMediaFile, posting, onPost, overlay, onEditOverlay,
}: { userId: string | null; targetId?: string; setTargetId: (id: string) => void; caption: string; setCaption: (s: string) => void; mediaFile: File | null; setMediaFile: (f: File | null) => void; posting: boolean; onPost: (kind: AnswerKind, isPublic: boolean, story: Story) => Promise<void>; overlay: VideoOverlay | null; onEditOverlay: (s: StickerOption[]) => void }) {
  const tone = useTone();
  const [kind, setKind] = useState<AnswerKind>("yes");
  const [isPublic, setIsPublic] = useState(true);
  const mineQ = useQuery({ queryKey: ["stories", "mine", userId ?? "anon"], queryFn: () => loadStoriesBy(userId!, userId), enabled: !targetId && !!userId });
  const storyQ = useQuery({ queryKey: ["story", targetId, userId ?? "anon"], queryFn: () => loadStory(targetId!, userId), enabled: !!targetId });

  if (!targetId) {
    const open = (mineQ.data ?? []).filter(s => s.status === "open");
    return <TargetPicker title={tone.say("Which prayer did He answer?", "Which hope came through?")} hint="Pick one of your open asks. The reaction links right under it." stories={open} loading={mineQ.isLoading} targetId={targetId} setTargetId={setTargetId} emptyText={`You have no open asks yet. Share a ${tone.ask} first — the answer comes later.`} />;
  }
  const story = storyQ.data;
  if (!story) return <div className="flex-1 px-5 pt-6"><div className="h-20 rounded-xl bg-paper/5 animate-pulse" /></div>;
  const kinds: Array<{ id: AnswerKind; label: string; sub: string }> = [
    { id: "yes", label: "Yes", sub: tone.say("He did it.", "It happened.") },
    { id: "differently", label: "Differently", sub: "Not what I asked. Better." },
    { id: "still_trusting", label: "Still trusting", sub: tone.say("Not yet — but I see Him.", "Not yet — still hopeful.") },
  ];
  return (
    <div className="flex-1 px-5 pt-4 pb-8 flex flex-col">
      <div className="rounded-xl border border-brass/40 bg-brass/10 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">You asked · {story.category}</p>
        <p className="mt-1 text-[13px] text-paper/85 line-clamp-3">"{story.ask_caption || "Video ask"}"</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {kinds.map(k => (
          <button key={k.id} aria-pressed={kind === k.id} onClick={() => setKind(k.id)} className={`text-left p-3 rounded-xl border ${kind === k.id ? "bg-brass/20 border-brass/60" : "bg-paper/5 border-paper/15"}`}>
            <p className="text-[14px] text-paper font-medium">{k.label}</p>
            <p className="text-[10.5px] text-paper/55 leading-tight mt-0.5">{k.sub}</p>
          </button>
        ))}
      </div>
      <MediaPicker accept="video/*" capture="user" mediaFile={mediaFile} setMediaFile={setMediaFile} label="Record the reaction (optional)" overlay={overlay} />
      {mediaFile && (
        <button
          onClick={() => onEditOverlay([
            { label: tone.faith ? "Answered" : "It came through", text: tone.faith ? "Answered" : "It came through" },
            { label: `Day ${daysBetween(story.ask_created_at)}`, text: `Day ${daysBetween(story.ask_created_at)} of ${tone.faith ? "praying" : "hoping"}` },
            ...(tone.faith && story.verse_ref ? [{ label: story.verse_ref, text: story.verse_ref }] : []),
          ])}
          className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full border border-paper/20 bg-paper/10 px-3 py-1.5 text-[12px] text-paper"
        >
          <Type className="h-3.5 w-3.5" /> {hasOverlay(overlay) ? "Edit words on video" : "Add words to video"}
        </button>
      )}
      <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} maxLength={600} aria-label="What happened?" placeholder="What happened? Say it plainly." className="mt-4 w-full bg-paper/5 border border-paper/15 rounded-xl px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-brass/60 resize-none" />
      <PrivacyToggle isPublic={isPublic} setIsPublic={setIsPublic} publicLabel="Same audience as the ask" privateLabel="Private · just me" />
      <button disabled={posting} onClick={() => void onPost(kind, isPublic, story)} className="mt-5 grid place-items-center py-3.5 rounded-xl bg-brass text-ink font-medium text-[14px] tracking-wide shadow-lift disabled:opacity-50">
        {posting ? "Posting…" : "Post the Answer"}
      </button>
    </div>
  );
}

function PrivacyToggle({
  isPublic, setIsPublic, publicLabel, privateLabel,
}: { isPublic: boolean; setIsPublic: (b: boolean) => void; publicLabel: string; privateLabel: string }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <button
        onClick={() => setIsPublic(false)}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] ${
          !isPublic ? "bg-brass/20 border-brass/60 text-paper" : "bg-paper/5 border-paper/15 text-paper/70"
        }`}
      >
        <Lock className="h-3.5 w-3.5" />
        {privateLabel}
      </button>
      <button
        onClick={() => setIsPublic(true)}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] ${
          isPublic ? "bg-brass/20 border-brass/60 text-paper" : "bg-paper/5 border-paper/15 text-paper/70"
        }`}
      >
        <Globe className="h-3.5 w-3.5" />
        {publicLabel}
      </button>
    </div>
  );
}

const SWATCHES = [
  "oklch(0.86 0.06 250)",
  "oklch(0.88 0.06 75)",
  "oklch(0.85 0.08 140)",
  "oklch(0.84 0.07 25)",
  "oklch(0.92 0.03 60)",
];

/** Object URL for a chosen file; revoked when it changes. */
function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

/** The surface a voice prayer sits on: a chosen photo under a soft scrim, or a tone. */
function Backdrop({ photo, bg, className = "", children }: { photo: File | null; bg: string; className?: string; children?: React.ReactNode }) {
  const url = useObjectUrl(photo);
  return (
    <div className={`relative overflow-hidden ${className}`} style={url ? undefined : { background: `radial-gradient(circle at 50% 25%, ${bg}, color-mix(in oklch, ${bg} 78%, black))` }}>
      {url && <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {url && <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/30 to-ink/75" />}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

function CaptureView({
  kind, setKind, caption, setCaption, bg, setBg, mediaFile, setMediaFile, voiceTake, setVoiceTake, backdrop, setBackdrop, onCaptured,
}: {
  kind: PrayerKind;
  setKind: (k: PrayerKind) => void;
  caption: string;
  setCaption: (s: string) => void;
  bg: string;
  setBg: (s: string) => void;
  mediaFile: File | null;
  setMediaFile: (file: File | null) => void;
  voiceTake: VoiceTake | null;
  setVoiceTake: (t: VoiceTake | null) => void;
  backdrop: File | null;
  setBackdrop: (f: File | null) => void;
  onCaptured: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const swatches = SWATCHES;
  const onPhoto = Boolean(backdrop);
  const textBackdropUrl = useObjectUrl(kind === "text" ? backdrop : null);
  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-3 grid grid-cols-3 gap-2">
        {(["text", "voice", "video"] as const).map(k => (
          <button
            key={k}
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[12px] ${
              kind === k ? "bg-brass/20 border-brass/60 text-paper" : "bg-paper/5 border-paper/15 text-paper/70"
            }`}
          >
            {k === "video" ? <Video className="h-4 w-4" /> : k === "voice" ? <Mic className="h-4 w-4" /> : <Type className="h-4 w-4" />}
            {k === "video" ? "On camera" : k === "voice" ? "Speak it" : "Write it"}
          </button>
        ))}
      </div>

      {kind === "voice" ? (
        <>
          <Backdrop photo={backdrop} bg={bg} className="mx-5 mt-5 rounded-2xl border border-paper/15 aspect-[9/11]">
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded ${onPhoto ? "bg-ink/50 text-paper/90" : "bg-paper/70 text-ink/70"}`}>The Ask · voice</span>
                {onPhoto && <button onClick={() => setBackdrop(null)} className="text-[11px] text-paper/80 underline underline-offset-2">Use a tone</button>}
              </div>
              <div className="text-center px-4">
                <p className={`font-serif text-[22px] leading-snug ${onPhoto ? "text-paper" : "text-ink"}`}>
                  {caption.trim() ? `"${caption.trim()}"` : "Speak it plainly."}
                </p>
                {!caption.trim() && <p className={`mt-2 text-[12.5px] ${onPhoto ? "text-paper/75" : "text-ink/60"}`}>Hearing a voice is different from reading one.</p>}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {swatches.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => { setBg(s); setBackdrop(null); }}
                      aria-label={`Background tone ${i + 1} of ${swatches.length}`}
                      aria-pressed={!onPhoto && bg === s}
                      className={`h-6 w-6 rounded-full border-2 ${!onPhoto && bg === s ? "border-paper" : "border-paper/30"}`}
                      style={{ background: s }}
                    />
                  ))}
                </div>
                {onPhoto && <span className="text-[11px] text-paper/65">photo selected</span>}
              </div>
            </div>
          </Backdrop>

          <div className="px-5 pt-4">
            <PhotoInputActions onPick={setBackdrop} takeLabel={onPhoto ? "Retake photo" : "Take photo"} chooseLabel={onPhoto ? "Change photo" : "Choose photo"} />
            <StockPhotoPicker selectedFile={backdrop} onPick={setBackdrop} />
            <VoiceRecorder take={voiceTake} onTake={setVoiceTake} />
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={140}
              placeholder="One line for those listening with the sound off (optional)"
              aria-label="One line for those listening with the sound off (optional)"
              className="mt-3 w-full bg-paper/5 border border-paper/15 rounded-xl px-3 py-2.5 text-[13px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-brass/60"
            />
          </div>
          <div className="px-5 pt-4 pb-12">
            <button
              onClick={onCaptured}
              disabled={!voiceTake}
              className="w-full grid place-items-center py-3.5 rounded-xl bg-brass text-ink font-medium text-[14px] tracking-wide shadow-lift disabled:opacity-50"
            >
              {voiceTake ? `Continue · ${fmtSeconds(voiceTake.seconds)}` : "Record to continue"}
            </button>
          </div>
        </>
      ) : kind === "video" ? (
        <>
          <div className="flex-1 mx-5 my-5 rounded-2xl border border-paper/15 bg-[radial-gradient(circle_at_50%_30%,oklch(0.3_0.04_250),oklch(0.18_0.02_250))] grid place-items-center relative overflow-hidden">
            <div className="text-center px-8">
              <p className="font-serif text-[22px] leading-snug text-paper">Speak it plainly.</p>
              <p className="mt-2 text-[13px] text-paper/60">No need for the right words. Just the true ones.</p>
            </div>
            <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[11px] text-paper/70 bg-ink/60 px-2 py-1 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.7_0.18_25)] animate-pulse" />
              1:30
            </div>
          </div>

          <div className="pb-12 pt-2 flex items-center justify-center gap-8">
            <span className="h-10 w-10 rounded-full bg-paper/10 grid place-items-center text-paper/80" aria-hidden="true">
              <RotateCcw className="h-4 w-4" />
            </span>
            <button
              onClick={() => mediaFile ? onCaptured() : inputRef.current?.click()}
              className="h-20 w-20 rounded-full bg-paper grid place-items-center shadow-lift ring-4 ring-paper/20 active:scale-95 transition-transform"
              aria-label="Record"
            >
              <Circle className="h-8 w-8 text-[oklch(0.55_0.2_25)] fill-current" />
            </button>
            <input ref={inputRef} type="file" className="sr-only" accept="video/*" capture="user" onChange={event => { const file = event.target.files?.[0] ?? null; setMediaFile(file); if (file) onCaptured(); }} />
            <label className="h-10 w-10 rounded-full bg-paper/10 grid place-items-center text-paper/80 cursor-pointer" aria-label="Upload a video">
              <Upload className="h-4 w-4" />
              <input type="file" className="sr-only" accept="video/*" onChange={event => { const file = event.target.files?.[0] ?? null; setMediaFile(file); if (file) onCaptured(); }} />
            </label>
          </div>
        </>
      ) : (
        <>
          <div
            className="relative flex-1 mx-5 my-5 rounded-2xl border border-paper/15 grid place-items-center overflow-hidden p-6 min-h-[260px]"
            style={textBackdropUrl ? undefined : { background: bg }}
          >
            {textBackdropUrl && <img src={textBackdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            {textBackdropUrl && <div className="absolute inset-0 bg-gradient-to-b from-ink/25 via-ink/35 to-ink/80" />}
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write the ask. Plain words are enough."
              aria-label="Write the ask"
              maxLength={280}
              className={`relative z-10 w-full h-full bg-transparent font-serif text-[22px] text-center focus:outline-none resize-none ${textBackdropUrl ? "text-paper placeholder:text-paper/55" : "text-ink placeholder:text-ink/40"}`}
            />
          </div>
          <div className="px-5">
            <PhotoInputActions onPick={setBackdrop} takeLabel={textBackdropUrl ? "Retake photo" : "Take photo"} chooseLabel={textBackdropUrl ? "Change photo" : "Choose photo"} />
            <StockPhotoPicker selectedFile={backdrop} onPick={setBackdrop} />
          </div>
          <div className="px-5 flex items-center justify-between mt-4 mb-2">
            <div className="flex gap-2">
              {swatches.map((s, i) => (
                <button
                  key={s}
                      onClick={() => { setBg(s); setBackdrop(null); }}
                  aria-label={`Background color ${i + 1} of ${swatches.length}`}
                  aria-pressed={bg === s}
                  className={`h-7 w-7 rounded-full border-2 ${bg === s ? "border-paper" : "border-paper/20"}`}
                  style={{ background: s }}
                />
              ))}
            </div>
            <span className="text-[11px] text-paper/50">{caption.length}/280</span>
          </div>
          <div className="px-5 pb-12">
            <button
              onClick={onCaptured}
              disabled={!caption.trim()}
              className="w-full grid place-items-center py-3.5 rounded-xl bg-brass text-ink font-medium text-[14px] tracking-wide shadow-lift disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ComposeView(props: {
  caption: string; setCaption: (s: string) => void;
  category: Cat; setCategory: (s: Cat) => void;
  priv: PrivId; setPriv: (s: PrivId) => void;
  anon: boolean; setAnon: (b: boolean) => void;
  prayerKind: PrayerKind;
  askBg: string;
  mediaFile: File | null;
  voiceTake: VoiceTake | null;
  backdrop: File | null;
  posting: boolean;
  onPost: () => Promise<void>;
  onBack: () => void;
  overlay: VideoOverlay | null;
  onEditOverlay: () => void;
}) {
  const tone = useTone();
  const textBackdropUrl = useObjectUrl(props.prayerKind === "text" ? props.backdrop : null);
  return (
    <div className="flex-1 flex flex-col px-5 pt-2 pb-6 overflow-y-auto">
      {props.prayerKind === "text" ? (
        <div
          className="relative mt-2 aspect-[9/12] overflow-hidden rounded-2xl border border-paper/10 grid place-items-center p-5 mb-5"
          style={textBackdropUrl ? undefined : { background: props.askBg }}
        >
          {textBackdropUrl && <img src={textBackdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          {textBackdropUrl && <div className="absolute inset-0 bg-gradient-to-b from-ink/25 via-ink/35 to-ink/80" />}
          <p className={`relative z-10 font-serif text-[20px] text-center leading-snug ${textBackdropUrl ? "text-paper" : "text-ink"}`}>
            "{props.caption || "Your written ask"}"
          </p>
        </div>
      ) : props.prayerKind === "voice" ? (
        <Backdrop photo={props.backdrop} bg={props.askBg} className="mt-2 aspect-[9/12] rounded-2xl border border-paper/10 mb-5">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
            <div className={`h-14 w-14 rounded-full grid place-items-center ${props.backdrop ? "bg-paper text-ink" : "bg-ink text-paper"}`}><Mic className="h-6 w-6" /></div>
            <p className={`text-[11px] uppercase tracking-[0.18em] ${props.backdrop ? "text-paper/80" : "text-ink/60"}`}>Voice · {props.voiceTake ? fmtSeconds(props.voiceTake.seconds) : "—"}</p>
            {props.caption && <p className={`font-serif text-[18px] leading-snug ${props.backdrop ? "text-paper" : "text-ink"}`}>"{props.caption}"</p>}
          </div>
        </Backdrop>
      ) : (
        <div className="mb-5">
          <div className="relative mt-2 aspect-[9/12] overflow-hidden rounded-2xl bg-paper/5 border border-paper/10 grid place-items-center">
            <VideoPreview file={props.mediaFile} overlay={props.overlay} />
          </div>
          {props.mediaFile && (
            <button onClick={props.onEditOverlay} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-paper/20 bg-paper/10 px-3 py-1.5 text-[12px] text-paper">
              <Type className="h-3.5 w-3.5" /> {hasOverlay(props.overlay) ? "Edit words on video" : "Add words to video"}
            </button>
          )}
        </div>
      )}

      <label className="block text-[11px] uppercase tracking-[0.18em] text-paper/60 mb-2">Caption</label>
      <textarea
        value={props.caption}
        onChange={e => props.setCaption(e.target.value)}
        placeholder="Say it the way you'd say it to a friend."
        rows={3}
        className="w-full bg-paper/5 border border-paper/15 rounded-xl px-3 py-2.5 text-[14px] text-paper placeholder:text-paper/35 focus:outline-none focus:border-brass/60"
      />

      <label className="block text-[11px] uppercase tracking-[0.18em] text-paper/60 mt-5 mb-2">Category</label>
      <div className="flex flex-wrap gap-1.5">
        {categories.filter(c => tone.faith || (c !== "Faith" && c !== "Salvation")).map(c => (
          <button
            key={c}
            onClick={() => props.setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              props.category === c ? "bg-brass text-ink border-brass" : "bg-paper/5 text-paper/80 border-paper/15"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="block text-[11px] uppercase tracking-[0.18em] text-paper/60 mt-5 mb-2">Who can see this</label>
      <div className="grid grid-cols-2 gap-2">
        {privacy.map(p => (
          <button
            key={p.id}
            onClick={() => props.setPriv(p.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-colors ${
              props.priv === p.id ? "bg-brass/15 border-brass/60" : "bg-paper/5 border-paper/15"
            }`}
          >
            <p.Icon className="h-4 w-4 text-paper/80" />
            <div className="leading-tight">
              <p className="text-[13px] text-paper">{p.label}</p>
              <p className="text-[10px] text-paper/55">{p.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => props.setAnon(!props.anon)}
        className="mt-4 flex items-center justify-between bg-paper/5 border border-paper/15 rounded-xl px-3 py-3"
      >
        <div className="flex items-center gap-3">
          {props.anon ? <EyeOff className="h-4 w-4 text-brass" /> : <Eye className="h-4 w-4 text-paper/60" />}
          <div className="text-left leading-tight">
            <p className="text-[13px] text-paper">Post anonymously</p>
            <p className="text-[11px] text-paper/55">{props.prayerKind === "voice" ? "Your voice still plays. Your name doesn't." : props.prayerKind === "video" ? "Your video still plays. Your name doesn't." : "Your words still show. Your name doesn't."}</p>
          </div>
        </div>
        <span className={`h-5 w-9 rounded-full transition-colors ${props.anon ? "bg-brass" : "bg-paper/20"} relative`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-all ${props.anon ? "left-4" : "left-0.5"}`} />
        </span>
      </button>

      <button disabled={props.posting} onClick={() => void props.onPost()} className="mt-6 grid place-items-center py-3.5 rounded-xl bg-brass text-ink font-medium text-[14px] tracking-wide shadow-lift disabled:opacity-50">
        {props.posting ? "Posting…" : tone.postAsk}
      </button>
      <button onClick={props.onBack} className="mt-3 text-center text-[12px] text-paper/55">
        {props.prayerKind === "text" ? "Edit text" : props.prayerKind === "voice" ? "Change the recording or photo" : "Re-record"}
      </button>
    </div>
  );
}

function VideoPreview({ file, overlay }: { file: File | null; overlay?: VideoOverlay | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  if (!url) return <p className="text-[12px] text-paper/50">Video preview</p>;
  return (
    <div className="relative h-full w-full">
      <video src={url} controls playsInline onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)} className="h-full w-full object-cover" />
      <OverlayLayers overlay={overlay} time={time} duration={duration} />
    </div>
  );
}