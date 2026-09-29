import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  CARE_AGREEMENT_INTRO,
  CARE_AGREEMENT_TITLE,
  clausesFor,
} from "@/lib/therapy-agreement";
import type { Party } from "@/lib/therapy";

interface Props {
  party: Party;
  onSign: (typedName: string) => Promise<void>;
}

/** Small-print agreement, read to the end, one box, one typed name. */
export function AgreementGate({ party, onSign }: Props) {
  const [read, setRead] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const ready = agreed && name.trim().length > 1 && !saving;

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await onSign(name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your signature.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-paper p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-ink-soft" strokeWidth={1.6} />
        <h2 className="font-serif text-[19px] text-ink">{CARE_AGREEMENT_TITLE}</h2>
      </div>
      <p className="mt-2 text-[13px] text-ink-soft">{CARE_AGREEMENT_INTRO}</p>

      <div
        ref={boxRef}
        onScroll={event => {
          const el = event.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setRead(true);
        }}
        className="mt-4 h-56 overflow-y-auto rounded-xl border border-border bg-ground p-3 text-[11px] leading-[1.55] text-ink-soft"
      >
        {clausesFor(party).map(clause => (
          <p key={clause.heading} className="mb-2.5">
            <span className="font-medium text-ink">{clause.heading}. </span>
            {clause.body}
          </p>
        ))}
        <p className="mb-1 text-ink-soft/80">
          This agreement is between you and the other person in the session. Keep a copy for your records.
        </p>
      </div>

      <p className="mt-2 text-[11px] text-ink-soft/80">
        {!read && <span className="mr-1">Scroll to the end to continue.</span>}
        <Link to="/care-agreement" className="underline">Read the full Care Agreement on its own page</Link>
      </p>


      <label className="mt-4 flex items-start gap-2.5 text-[12px] text-ink">
        <input
          type="checkbox"
          checked={agreed}
          disabled={!read}
          onChange={event => setAgreed(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-ink disabled:opacity-40"
          aria-label="I have read and agree to all of the terms above"
        />
        <span>I have read and agree to all of the terms above.</span>
      </label>

      <label className="mt-3 block text-[11px] uppercase tracking-wide text-ink-soft" htmlFor="care-signature">
        Type your full name to sign
      </label>
      <input
        id="care-signature"
        value={name}
        onChange={event => setName(event.target.value)}
        placeholder="Your full name"
        autoComplete="name"
        className="mt-1.5 w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-soft/60"
      />

      <button
        type="button"
        onClick={submit}
        disabled={!ready}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] text-paper disabled:opacity-40"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />}
        Sign the agreement
      </button>
    </section>
  );
}
