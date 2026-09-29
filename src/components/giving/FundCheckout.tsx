import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createFundGift, type FundFrequency } from "@/lib/fund.functions";
import type { PayMethod } from "@/lib/fees";

interface Props {
  scope: "all" | "lane";
  lane?: string | undefined;
  amountCents: number;
  frequency: FundFrequency;
  returnUrl: string;
  email?: string | undefined;
  donorName?: string | undefined;
  note?: string | undefined;
  coverFees?: boolean | undefined;
  payMethod?: PayMethod | undefined;
  tip?: boolean | undefined;
}

export function FundCheckout({
  scope,
  lane,
  amountCents,
  frequency,
  returnUrl,
  email,
  donorName,
  note,
  coverFees,
  payMethod,
  tip,
}: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createFundGift({
      data: {
        scope,
        lane,
        amountCents,
        frequency,
        returnUrl,
        environment: getStripeEnvironment(),
        email,
        donorName,
        note,
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
