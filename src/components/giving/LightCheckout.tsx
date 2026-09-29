import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createLightGift, type LightFrequency } from "@/lib/light.functions";
import type { PayMethod } from "@/lib/fees";

interface Props {
  amountCents: number;
  frequency: LightFrequency;
  returnUrl: string;
  email?: string | undefined;
  donorName?: string | undefined;
  note?: string | undefined;
  payMethod: PayMethod;
}

/** A gift to Witness itself — keeping the light lit. */
export function LightCheckout({ amountCents, frequency, returnUrl, email, donorName, note, payMethod }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createLightGift({
      data: { amountCents, frequency, returnUrl, environment: getStripeEnvironment(), email, donorName, note, payMethod },
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
