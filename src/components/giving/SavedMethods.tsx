import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Loader2, Trash2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { getStripeEnvironment } from "@/lib/stripe";
import { listSavedMethods, removeSavedMethod, type SavedMethod } from "@/lib/wallet.functions";

function safeEnv(): "sandbox" | "live" {
  try {
    return getStripeEnvironment();
  } catch {
    return "sandbox";
  }
}

export function useSavedMethods() {
  const { userId } = useSession();
  return useQuery({
    queryKey: ["saved-methods", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<SavedMethod[]> => {
      const result = await listSavedMethods({ data: { environment: safeEnv() } });
      if ("error" in result) throw new Error(result.error);
      return result.methods;
    },
  });
}

export function methodLine(m: SavedMethod): string {
  return m.kind === "card"
    ? `${m.label} ending ${m.last4}${m.expires ? ` · ${m.expires}` : ""}`
    : `${m.label} ending ${m.last4}`;
}

/** Where a person sees, and lets go of, what's kept on file for giving. */
export function SavedMethods() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const { data: methods, isLoading } = useSavedMethods();

  const remove = useMutation({
    mutationFn: async (methodId: string) => {
      const result = await removeSavedMethod({ data: { methodId, environment: safeEnv() } });
      if ("error" in result) throw new Error(result.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-methods"] }),
  });

  if (!userId) return null;
  if (isLoading) return null;
  if (!methods || methods.length === 0) return null;

  return (
    <section className="mx-4 mb-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Ways you give</p>
      <p className="mt-1.5 text-[11.5px] leading-snug text-ink-soft">
        Kept on file so you can give again with one tap. The numbers stay with the payment
        company — we only ever see the last four.
      </p>
      <ul className="mt-3 space-y-2">
        {methods.map(m => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-paper px-3.5 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink">
              {m.kind === "card" ? (
                <CreditCard className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
              ) : (
                <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
              )}
              <span className="truncate">{methodLine(m)}</span>
            </span>
            <button
              onClick={() => remove.mutate(m.id)}
              disabled={remove.isPending}
              className="inline-flex shrink-0 items-center gap-1 text-[11.5px] text-ink-soft disabled:opacity-50"
            >
              {remove.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Remove
            </button>
          </li>
        ))}
      </ul>
      {remove.isError && (
        <p className="mt-2 text-[11.5px] text-flame">{(remove.error as Error).message}</p>
      )}
    </section>
  );
}
