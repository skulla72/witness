import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CheckCircle2, CreditCard, Loader2, Zap } from "lucide-react";
import { money } from "@/lib/stripe";
import { getStripeEnvironment } from "@/lib/stripe";
import { giveNowWithSavedMethod } from "@/lib/wallet.functions";
import { methodLine, useSavedMethods } from "@/components/giving/SavedMethods";

interface Props {
  orgSlug: string;
  orgName: string;
  amountCents: number;
  validAmount: boolean;
  coverFees: boolean;
  tip: boolean;
  note?: string | undefined;
  donorName?: string | undefined;
  needId?: string | undefined;
}

function safeEnv(): "sandbox" | "live" {
  try {
    return getStripeEnvironment();
  } catch {
    return "sandbox";
  }
}

/**
 * Give again with something already on file — one tap, nothing to fill in.
 * Only appears once a person has given here before.
 */
export function OneTapGive({
  orgSlug,
  orgName,
  amountCents,
  validAmount,
  coverFees,
  tip,
  note,
  donorName,
  needId,
}: Props) {
  const queryClient = useQueryClient();
  const { data: methods } = useSavedMethods();
  const [chosen, setChosen] = useState<string | null>(null);

  const give = useMutation({
    mutationFn: async (methodId: string) => {
      const result = await giveNowWithSavedMethod({
        data: {
          orgSlug,
          amountCents,
          methodId,
          environment: safeEnv(),
          coverFees,
          tip,
          note,
          donorName,
          needId,
        },
      });
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-gifts"] });
      queryClient.invalidateQueries({ queryKey: ["need"] });
      queryClient.invalidateQueries({ queryKey: ["need-for-gift"] });
    },
  });

  if (!methods || methods.length === 0) return null;
  const pick = chosen ?? methods[0]!.id;
  const picked = methods.find(m => m.id === pick) ?? methods[0]!;

  if (give.isSuccess) {
    return (
      <div className="mt-4 rounded-xl border border-hope/40 bg-hope/10 px-3.5 py-3">
        <p className="inline-flex items-center gap-1.5 text-[13px] text-ink">
          <CheckCircle2 className="h-4 w-4 text-hope" />
          {give.data.status === "paid"
            ? `${money(give.data.chargedCents)} is on its way to ${orgName}.`
            : `${money(give.data.chargedCents)} is on its way — bank gifts take a few business days to clear.`}
        </p>
        <p className="mt-1 text-[11.5px] text-ink-soft">
          Your receipt is on its way by email. Thank you.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-brass/40 bg-brass/5 px-3.5 py-3">
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <Zap className="h-3 w-3" /> One tap
      </p>
      {methods.length > 1 && (
        <div className="mt-2 space-y-1.5">
          {methods.map(m => (
            <label key={m.id} className="flex items-center gap-2 text-[12.5px] text-ink">
              <input
                type="radio"
                checked={pick === m.id}
                onChange={() => setChosen(m.id)}
                className="h-3.5 w-3.5 accent-brass"
              />
              {m.kind === "card" ? (
                <CreditCard className="h-3.5 w-3.5 text-ink-soft" />
              ) : (
                <Building2 className="h-3.5 w-3.5 text-ink-soft" />
              )}
              <span className="truncate">{methodLine(m)}</span>
            </label>
          ))}
        </div>
      )}
      <button
        disabled={!validAmount || give.isPending}
        onClick={() => give.mutate(pick)}
        className="tap-scale mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-brass py-3 text-[14px] font-medium text-ink disabled:opacity-50"
      >
        {give.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Give {validAmount ? money(amountCents) : ""} now
      </button>
      <p className="mt-1.5 text-center text-[11px] leading-snug text-ink-soft">
        Using your {methodLine(picked)}. Nothing to fill in.
      </p>
      {give.isError && (
        <p className="mt-2 text-[11.5px] text-flame">{(give.error as Error).message}</p>
      )}
    </div>
  );
}
