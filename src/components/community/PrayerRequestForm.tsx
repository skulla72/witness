import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, HeartHandshake, Loader2, Lock, Trash2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import type { OrgPrayerRequest } from "@/lib/community";

const schema = z.object({
  name: z.string().trim().max(120, "That name is too long."),
  contact: z.string().trim().max(200, "That contact detail is too long."),
  request: z
    .string()
    .trim()
    .nonempty("Write a line or two so they know how to pray.")
    .max(2000, "Please keep it under 2000 characters."),
});

export function PrayerRequestForm({ orgId, orgName }: { orgId: string; orgName: string }) {
  const { userId } = useSession();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [request, setRequest] = useState("");
  const [keepPrivate, setKeepPrivate] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ name, contact, request });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Please check what you wrote.");
      }
      const { error: insertError } = await supabase.from("organization_prayer_requests").insert({
        org_id: orgId,
        user_id: userId ?? null,
        name: parsed.data.name,
        contact: parsed.data.contact,
        request: parsed.data.request,
        keep_private: keepPrivate,
      });
      if (insertError) throw new Error("We couldn't send that. Try once more.");
    },
    onSuccess: () => {
      setName("");
      setContact("");
      setRequest("");
      setError(null);
      setSent(true);
    },
    onError: (e: Error) => setError(e.message),
  });

  if (sent) {
    return (
      <div className="rounded-2xl border border-hope/40 bg-hope/10 p-5 text-center">
        <Check className="mx-auto h-5 w-5 text-hope" />
        <p className="mt-2 font-serif text-[16px] text-ink">It's with them now</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
          Someone at {orgName} will read this and pray. You don't have to carry it alone.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-[12.5px] text-brass"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        send.mutate();
      }}
      className="space-y-3"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-brass/30 bg-brass/10 p-4">
        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-brass" />
        <p className="text-[12.5px] leading-relaxed text-ink-soft">
          Ask {orgName} to pray. It goes only to the people who lead there — not to the feed.
        </p>
      </div>

      <textarea
        value={request}
        onChange={e => setRequest(e.target.value)}
        rows={5}
        maxLength={2000}
        placeholder="What would you like them to pray for?"
        aria-label="Your prayer request"
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        maxLength={120}
        placeholder="Your name (or leave blank)"
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        value={contact}
        onChange={e => setContact(e.target.value)}
        maxLength={200}
        placeholder="Email or phone, if you'd like a reply"
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />

      <label className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={keepPrivate}
          onChange={e => setKeepPrivate(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--brass-deep)]"
        />
        <span className="text-[12.5px] leading-relaxed text-ink-soft">
          Keep this between me and the leaders. Uncheck if they may share it with the wider prayer
          team.
        </span>
      </label>

      {error && <p className="text-[12.5px] text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={send.isPending || !request.trim()}
        className="tap-scale inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] text-primary-foreground disabled:opacity-50"
      >
        {send.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Send the request
      </button>
    </form>
  );
}

export function PrayerRequestInbox({ orgId }: { orgId: string }) {
  const qc = useQueryClient();

  const requests = useQuery({
    queryKey: ["community", "prayer-requests", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_prayer_requests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrgPrayerRequest[];
    },
  });

  const markPrayed = useMutation({
    mutationFn: async ({ id, prayed }: { id: string; prayed: boolean }) => {
      const { error } = await supabase
        .from("organization_prayer_requests")
        .update({ prayed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "prayer-requests"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organization_prayer_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "prayer-requests"] }),
  });

  const rows = requests.data ?? [];

  return (
    <section className="mt-8 space-y-3">
      <h2 className="px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">
        Requests sent to you · {rows.length}
      </h2>

      {requests.isLoading && <p className="text-[13px] text-ink-soft">Loading…</p>}

      {rows.map(r => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <p className="text-[12.5px] text-ink">{r.name || "Someone"}</p>
            {r.keep_private && (
              <span className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-soft">
                <Lock className="h-3 w-3" /> Private
              </span>
            )}
            {r.prayed && (
              <span className="ml-auto text-[10.5px] uppercase tracking-[0.14em] text-hope">
                Prayed for
              </span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
            {r.request}
          </p>
          {r.contact && <p className="mt-2 text-[11.5px] text-ink-soft">Reply to: {r.contact}</p>}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => markPrayed.mutate({ id: r.id, prayed: !r.prayed })}
              className={`tap-scale inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] ${
                r.prayed
                  ? "border border-border bg-secondary text-ink-soft"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              {r.prayed ? "Marked prayed for" : "We prayed"}
            </button>
            <button
              type="button"
              onClick={() => remove.mutate(r.id)}
              aria-label="Delete request"
              className="rounded-full border border-border p-1.5 text-ink-soft"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {!requests.isLoading && rows.length === 0 && (
        <p className="text-[13px] text-ink-soft">Nothing has come in yet.</p>
      )}
    </section>
  );
}
