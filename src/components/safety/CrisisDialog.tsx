import { Link } from "@tanstack/react-router";
import { Phone, HeartHandshake, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CRISIS_RESOURCES, CRISIS_CHAT } from "@/lib/crisis";

/**
 * Shown before a post goes up when the words sound like the person may be in
 * danger. Nothing is blocked — they can still post — but help comes first.
 */
export function CrisisDialog({
  open,
  onOpenChange,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-brass">
            <HeartHandshake className="h-3.5 w-3.5" /> You are not alone
          </div>
          <DialogTitle className="font-serif text-[22px] leading-tight">
            Before you post — please talk to someone.
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            What you wrote sounds heavy. Witness isn't a crisis service and no one here is
            watching every hour. These lines answer right away, for free.
          </DialogDescription>
        </DialogHeader>

        <a
          href={CRISIS_CHAT.href}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brass px-4 py-3 text-[13.5px] tracking-wide text-ink"
        >
          <MessageCircle className="h-4 w-4" /> {CRISIS_CHAT.action}
        </a>
        <a
          href="tel:988"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-brass px-4 py-3 text-[13.5px] tracking-wide text-ink"
        >
          <Phone className="h-4 w-4" /> Call 988 instead
        </a>
        <p className="text-[11.5px] leading-relaxed text-ink-soft">
          Chat or call a trained 988 Lifeline counselor, 24 hours a day — a real person,
          never a bot.
        </p>

        <ul className="space-y-2">

          {CRISIS_RESOURCES.slice(0, 3).map(r => (
            <li key={r.name} className="rounded-xl border border-border p-3">
              <p className="text-[13px] text-ink">{r.name}</p>
              <p className="mt-0.5 text-[12px] text-ink-soft">{r.detail}</p>
              <a
                href={r.href}
                className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-brass underline underline-offset-4"
              >
                <Phone className="h-3 w-3" /> {r.action}
              </a>
            </li>
          ))}
        </ul>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link to="/crisis">See all help</Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={onContinue}>
            Post my ask anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
