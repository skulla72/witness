import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createNonprofitDonation, type GiftFrequency } from "@/lib/donate.functions";
import type { PayMethod } from "@/lib/fees";

interface Props {
  orgSlug: string;
  amountCents: number;
  frequency: GiftFrequency;
  returnUrl: string;
  email?: string | undefined;
  donorName?: string | undefined;
  note?: string | undefined;
  needId?: string | undefined;
  coverFees?: boolean | undefined;
  payMethod?: PayMethod | undefined;
  tip?: boolean | undefined;
}

export function GiftCheckout({
  orgSlug,
  amountCents,
  frequency,
  returnUrl,
  email,
  donorName,
  note,
  needId,
  coverFees,
  payMethod,
  tip,
}: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createNonprofitDonation({
      data: {
        orgSlug,
        amountCents,
        frequency,
        returnUrl,
        environment: getStripeEnvironment(),
        email,
        donorName,
        note,
        needId,
        coverFees,
        payMethod,
        tip,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("We couldn't open the gift screen.");
    return result.clientSecret;
  };

  return (
    <div id="checkout" className="min-h-[520px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
