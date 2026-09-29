import { createServerFn } from "@tanstack/react-start";
import { assertReturnUrl } from "@/lib/returnUrl";
import {
  type StripeEnv,
  createStripeClient,
  getStripeErrorMessage,
  resolveOrCreateCustomer,
} from "@/lib/stripe.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CartLine {
  productId: string;
  size: string;
  quantity: number;
}

interface CheckoutInput {
  orgSlug: string;
  lines: CartLine[];
  returnUrl: string;
  environment: StripeEnv;
  email?: string;
}

type CheckoutResult = { clientSecret: string } | { error: string };

const UUID = /^[0-9a-fA-F-]{36}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;
/** General tangible goods — merch ships, so it isn't a digital tax category. */
const TAX_CODE = "txcd_99999999";
const SHIPPING_CENTS = 600;

export const createStoreCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => {
    data.returnUrl = assertReturnUrl(data.returnUrl);
    if (!SLUG.test(data.orgSlug)) throw new Error("Invalid store");
    if (!Array.isArray(data.lines) || data.lines.length === 0 || data.lines.length > 20) {
      throw new Error("Your cart is empty");
    }
    for (const line of data.lines) {
      if (!UUID.test(line.productId)) throw new Error("Invalid item");
      if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) {
        throw new Error("Invalid quantity");
      }
      if (typeof line.size !== "string" || line.size.length > 40) throw new Error("Invalid size");
    }
    return data;
  })
  .handler(async ({ data }): Promise<CheckoutResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getOptionalUserId } = await import("@/lib/optional-auth.server");
    // Identity comes from the verified session only — never from the request body.
    const userId = await getOptionalUserId();

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", data.orgSlug)
      .maybeSingle();
    if (!org) return { error: "We couldn't find that store." };

    const ids = [...new Set(data.lines.map(l => l.productId))];
    const { data: products } = await supabaseAdmin
      .from("store_products")
      .select("id, name, description, price_cents, image_url, active, org_id, stripe_price_id")
      .in("id", ids)
      .eq("org_id", org.id)
      .eq("active", true);
    if (!products || products.length === 0) return { error: "Those items are no longer listed." };

    const byId = new Map(products.map(p => [p.id, p]));
    const priced = data.lines.map(line => {
      const product = byId.get(line.productId);
      if (!product) throw new Error("unlisted");
      return { line, product };
    });
    if (priced.some(p => !p.product)) return { error: "Those items are no longer listed." };

    const subtotal = priced.reduce(
      (sum, p) => sum + p.product.price_cents * p.line.quantity,
      0,
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("store_orders")
      .insert({
        org_id: org.id,
        user_id: userId,
        email: data.email ?? null,
        status: "pending",
        amount_cents: subtotal + SHIPPING_CENTS,
        shipping_cents: SHIPPING_CENTS,
        environment: data.environment,
      })
      .select("id")
      .single();
    if (orderError || !order) return { error: "We couldn't start this order. Try again." };

    await supabaseAdmin.from("store_order_items").insert(
      priced.map(p => ({
        order_id: order.id,
        product_id: p.product.id,
        name: p.product.name,
        size: p.line.size || null,
        quantity: p.line.quantity,
        unit_cents: p.product.price_cents,
      })),
    );

    try {
      const stripe = createStripeClient(data.environment);

      // Items registered with the payment provider charge their catalog price
      // (resolved by lookup key); anything else falls back to an inline price.
      const lookupKeys = [
        ...new Set(
          priced
            .map(p => (p.product as { stripe_price_id?: string | null }).stripe_price_id)
            .filter((k): k is string => Boolean(k)),
        ),
      ];
      const catalogPrices = new Map<string, string>();
      if (lookupKeys.length > 0) {
        const found = await stripe.prices.list({ lookup_keys: lookupKeys, limit: 100 });
        for (const price of found.data) {
          if (price.lookup_key) catalogPrices.set(price.lookup_key, price.id);
        }
      }

      const line_items = priced.map(p => {
        const key = (p.product as { stripe_price_id?: string | null }).stripe_price_id;
        const catalogId = key ? catalogPrices.get(key) : undefined;
        if (catalogId) return { quantity: p.line.quantity, price: catalogId };
        return {
          quantity: p.line.quantity,
          price_data: {
            currency: "usd",
            unit_amount: p.product.price_cents,
            product_data: {
              name: p.line.size ? `${p.product.name} — ${p.line.size}` : p.product.name,
              ...(p.product.description ? { description: p.product.description } : {}),
              ...(p.product.image_url ? { images: [p.product.image_url] } : {}),
              tax_code: TAX_CODE,
            },
          },
        };
      });

      // One saved payer record per person, so repeat buyers keep one history.
      const customerId = await resolveOrCreateCustomer(stripe, {
        email: data.email,
        userId: userId ?? undefined,
      });

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        line_items,
        shipping_address_collection: { allowed_countries: ["US", "CA"] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              display_name: "Standard shipping",
              fixed_amount: { amount: SHIPPING_CENTS, currency: "usd" },
              delivery_estimate: {
                minimum: { unit: "business_day", value: 3 },
                maximum: { unit: "business_day", value: 8 },
              },
            },
          },
        ],
        // Sales tax stays off until Stripe Tax is activated for the account —
        // products already carry a tax code so it can be switched on later.



        payment_intent_data: {
          description: `${org.name} store order`,
          // Stripe emails the buyer a receipt — the order confirmation.
          ...(data.email ? { receipt_email: data.email } : {}),
        },
        ...(customerId
          ? {
              customer: customerId,
              customer_update: { shipping: "auto", address: "auto", name: "auto" },
            }
          : {}),
        metadata: {
          orderId: order.id,
          orgSlug: org.slug,
          ...(userId ? { userId } : {}),
        },
      });

      await supabaseAdmin
        .from("store_orders")
        .update({ stripe_session_id: session.id, stripe_customer_id: customerId ?? null })
        .eq("id", order.id);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      await supabaseAdmin
        .from("store_orders")
        .update({ status: "failed" })
        .eq("id", order.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Refund a paid order. Only owners and leaders of the selling organization. */
export const refundStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; environment: StripeEnv }) => {
    if (!UUID.test(data.orderId)) throw new Error("Invalid order");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;

    const { data: order } = await supabase
      .from("store_orders")
      .select("id, org_id, status, amount_cents, refunded_cents, stripe_payment_intent_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { error: "We couldn't find that order." };

    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", order.org_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || !["owner", "leader"].includes(membership.role)) {
      return { error: "Only leaders of this organization can refund an order." };
    }
    if (!order.stripe_payment_intent_id) return { error: "This order has no payment to refund." };
    if ((order.refunded_cents ?? 0) >= order.amount_cents) {
      return { error: "This order is already refunded." };
    }

    try {
      const stripe = createStripeClient(data.environment);
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
      });
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("store_orders")
        .update({
          refunded_cents: refund.amount ?? order.amount_cents,
          status: "refunded",
          fulfillment: "canceled",
        })
        .eq("id", order.id);
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
