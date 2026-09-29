import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createStoreCheckout, type CartLine } from "@/lib/store.functions";

interface Props {
  orgSlug: string;
  lines: CartLine[];
  email?: string | undefined;
  returnUrl: string;
}

export function StoreCheckout({ orgSlug, lines, email, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createStoreCheckout({
      data: { orgSlug, lines, returnUrl, environment: getStripeEnvironment(), email },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Checkout could not be opened.");
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
