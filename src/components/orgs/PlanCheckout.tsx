import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createPlanCheckout } from "@/lib/orgplan.functions";

interface Props {
  orgId: string;
  plan: string;
  returnUrl: string;
  email?: string | undefined;
}

export function PlanCheckout({ orgId, plan, returnUrl, email }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createPlanCheckout({
      data: { orgId, plan, returnUrl, environment: getStripeEnvironment(), email },
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
