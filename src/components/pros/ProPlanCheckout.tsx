import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { startProPlan } from "@/lib/proplan.functions";

interface Props {
  proId: string;
  returnUrl: string;
  email?: string | undefined;
}

export function ProPlanCheckout({ proId, returnUrl, email }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await startProPlan({
      data: { proId, returnUrl, environment: getStripeEnvironment(), email },
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
