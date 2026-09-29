import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Heart,
  Sun,
  Users,
  Flame,
  Globe,
  Film,
  BookOpen,
  ChevronRight,
  X,
} from "lucide-react";
import { BRAND } from "@/config/brand";

const STORAGE_KEY = "witness.tour.v1";

type Slide = {
  Icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  body: string;
  gradient: string;
  accent: string;
};

const slides: Slide[] = [
  {
    Icon: Sparkles,
    eyebrow: `Welcome to ${BRAND.name}`,
    title: "A quiet place to bring the ask, and witness the answer.",
    body: "Not a feed to scroll forever. A small, sacred space you return to when something changes.",
    gradient: "from-[oklch(0.22_0.03_60)] to-[oklch(0.12_0.02_60)]",
    accent: "text-brass",
  },
  {
    Icon: Heart,
    eyebrow: "Record a prayer",
    title: "Speak it. Don't perfect it.",
    body: "Voice, video, or a few honest words. Choose who sees it — yourself, your circle, or the world.",
    gradient: "from-[oklch(0.24_0.04_30)] to-[oklch(0.13_0.02_30)]",
    accent: "text-[oklch(0.78_0.13_40)]",
  },
  {
    Icon: Users,
    eyebrow: "Walk With",
    title: "Someone is already praying with you.",
    body: "Friends can stand with your ask in silence — no chat, no noise. Just presence.",
    gradient: "from-[oklch(0.22_0.03_240)] to-[oklch(0.12_0.02_250)]",
    accent: "text-[oklch(0.78_0.10_220)]",
  },
  {
    Icon: Flame,
    eyebrow: "Sit With Someone",
    title: "Be still next to a stranger's storm.",
    body: "Open a candle. No words required. Your presence is the prayer.",
    gradient: "from-[oklch(0.20_0.03_50)] to-[oklch(0.11_0.02_45)]",
    accent: "text-brass",
  },
  {
    Icon: Sun,
    eyebrow: "Gratitude",
    title: "Notice the small mercies.",
    body: "A daily place for thanks — the kind that rewires how you see your week.",
    gradient: "from-[oklch(0.26_0.04_80)] to-[oklch(0.14_0.02_70)]",
    accent: "text-[oklch(0.82_0.13_75)]",
  },
  {
    Icon: Sparkles,
    eyebrow: "The Answered Wall",
    title: "Only answers. Never asks.",
    body: "When a prayer turns to praise, it lands here. Proof that yours might too.",
    gradient: "from-[oklch(0.22_0.03_120)] to-[oklch(0.12_0.02_140)]",
    accent: "text-[oklch(0.80_0.12_140)]",
  },
  {
    Icon: BookOpen,
    eyebrow: "Your Ledger",
    title: "Every prayer brought. Every answer marked.",
    body: "A quiet timeline of your faith — yours to keep, yours to remember.",
    gradient: "from-[oklch(0.20_0.03_300)] to-[oklch(0.11_0.02_290)]",
    accent: "text-[oklch(0.78_0.12_300)]",
  },
];

export function IntroTour({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI(v => Math.min(v + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setI(v => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const slide = slides[i];
  const isLast = i === slides.length - 1;

  const dots = useMemo(
    () =>
      slides.map((_, idx) => (
        <button
          key={idx}
          onClick={() => setI(idx)}
          aria-label={`Go to slide ${idx + 1}`}
          className={`h-1.5 rounded-full transition-all ${
            idx === i ? "w-6 bg-brass" : "w-1.5 bg-white/30 hover:bg-white/50"
          }`}
        />
      )),
    [i]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div className="relative w-full max-w-md mx-auto flex flex-col">
        {/* Full-bleed cinematic panel */}
        <div
          key={i}
          className={`relative flex-1 overflow-hidden bg-gradient-to-br ${slide.gradient} animate-[fadeIn_400ms_ease-out]`}
        >
          {/* Soft texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
               style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white, transparent 50%), radial-gradient(circle at 70% 80%, white, transparent 40%)" }} />

          {/* Top bar */}
          <div className="relative flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-white/70">
              <Sparkles className="h-3 w-3 text-brass" />
              {BRAND.name} · Tour
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="relative flex flex-col justify-center h-full px-7 pb-32 pt-10">
            <div
              className={`h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 grid place-items-center ${slide.accent} animate-[scaleIn_500ms_cubic-bezier(0.2,0.8,0.2,1)]`}
            >
              <slide.Icon className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <p
              className={`mt-7 text-[10px] uppercase tracking-[0.28em] ${slide.accent} animate-[slideUp_500ms_ease-out]`}
            >
              {slide.eyebrow}
            </p>
            <h2
              className="mt-3 font-serif text-[28px] leading-[1.15] text-white animate-[slideUp_600ms_ease-out]"
              style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
            >
              {slide.title}
            </h2>
            <p
              className="mt-4 text-[14px] leading-relaxed text-white/75 max-w-[320px] animate-[slideUp_700ms_ease-out]"
              style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
            >
              {slide.body}
            </p>
          </div>

          {/* Footer controls */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-8 bg-gradient-to-t from-black/40 to-transparent">
            <div className="flex items-center justify-center gap-1.5 mb-5">{dots}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-white/20 bg-white/5 text-white/80 text-[12.5px] tracking-wide py-3 hover:bg-white/10 transition-colors"
              >
                Skip
              </button>
              {isLast ? (
                <Link
                  to="/record"
                  onClick={onClose}
                  className="flex-[1.4] inline-flex items-center justify-center gap-1.5 rounded-full bg-brass text-ink text-[12.5px] font-medium tracking-wide py-3 hover:bg-brass/90 transition-colors"
                >
                  Bring your first prayer
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  onClick={() => setI(v => Math.min(v + 1, slides.length - 1))}
                  className="flex-[1.4] inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-ink text-[12.5px] font-medium tracking-wide py-3 hover:bg-white/90 transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

export function useIntroTour() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // small delay so the home page paints first
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, []);

  const close = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  const replay = () => setOpen(true);

  return { open, close, replay };
}