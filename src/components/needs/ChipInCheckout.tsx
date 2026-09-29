import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { chipInToJob } from "@/lib/jobfund.functions";

interface Props {
  needId: string;
  amountCents: number;
  returnUrl: string;
  email?: string | undefined;
  donorName?: string | undefined;
  note?: string | undefined;
}

/** The pooled job: many people, small amounts, one payment screen each. */
export function ChipInCheckout({ needId, amountCents, returnUrl, email, donorName, note }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await chipInToJob({
      data: { needId, amountCents, returnUrl, environment: getStripeEnvironment(), email, donorName, note },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("We couldn't open the payment screen.");
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
