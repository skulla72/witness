import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, money } from "@/lib/stripe";
import { refundStoreOrder } from "@/lib/store.functions";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"store_products">;

interface OrderItem {
  name: string;
  size: string | null;
  quantity: number;
  unit_cents: number;
}

interface Order {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  email: string | null;
  created_at: string;
  fulfillment: string;
  tracking_number: string | null;
  shipping_name: string | null;
  shipping_address: Record<string, string | null> | null;
  refunded_cents: number | null;
  store_order_items: OrderItem[];
}

const STAGES = ["new", "packing", "shipped", "delivered"] as const;

function addressLines(order: Order): string[] {
  const a = order.shipping_address;
  if (!a) return [];
  return [
    order.shipping_name ?? "",
    a['line1'] ?? "",
    a['line2'] ?? "",
    [a['city'], a['state'], a['postal_code']].filter(Boolean).join(", "),
    a['country'] ?? "",
  ].filter(Boolean);
}

const ORDER_STATUS_STYLE: Record<string, string> = {
  paid: "bg-hope/15 text-hope",
  pending: "bg-secondary text-ink-soft",
  failed: "bg-flame/10 text-flame",
  refunded: "bg-flame/10 text-flame",
  abandoned: "bg-secondary text-ink-soft",
};

interface Props {
  orgId: string;
  orgSlug: string;
  isLeader: boolean;
}

/** The gear an organization sells, plus the leader tools to keep it honest. */
export function StorePanel({ orgId, orgSlug, isLeader }: Props) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "28", sizes: "S, M, L, XL, 2XL" });

  const productsQuery = useQuery({
    queryKey: ["store", "products", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("*")
        .eq("org_id", orgId)
        .order("sort", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["store", "orders", orgId],
    enabled: isLeader,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, status, amount_cents, currency, email, created_at, fulfillment, tracking_number, shipping_name, shipping_address, refunded_cents, store_order_items(name, size, quantity, unit_cents)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const addProduct = useMutation({
    mutationFn: async () => {
      const cents = Math.round(Number(form.price) * 100);
      if (!form.name.trim()) throw new Error("Give the item a name");
      if (!Number.isFinite(cents) || cents < 100) throw new Error("Price must be at least $1");
      const { error } = await supabase.from("store_products").insert({
        org_id: orgId,
        name: form.name.trim().slice(0, 80),
        description: form.description.trim().slice(0, 400),
        price_cents: cents,
        sizes: form.sizes
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
          .slice(0, 12),
        sort: (productsQuery.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", description: "", price: "28", sizes: "S, M, L, XL, 2XL" });
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["store"] });
    },
  });

  const setStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("store_orders")
        .update({
          fulfillment: stage,
          ...(stage === "shipped" ? { shipped_at: new Date().toISOString() } : {}),
          ...(stage === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", "orders"] }),
  });

  const setTracking = useMutation({
    mutationFn: async ({ id, tracking }: { id: string; tracking: string }) => {
      const { error } = await supabase
        .from("store_orders")
        .update({ tracking_number: tracking.trim().slice(0, 60) || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", "orders"] }),
  });

  const refund = useMutation({
    mutationFn: async (orderId: string) => {
      const result = await refundStoreOrder({
        data: { orderId, environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store", "orders"] }),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["store"] }),
  });

  const products = productsQuery.data ?? [];

  return (
    <section className="space-y-4">
      <p className="text-[12.5px] leading-relaxed text-ink-soft">
        Branded gear sold inside the app. People check out here, the money goes to this
        organization, and they ship it themselves — no outside storefront.
      </p>

      {products.length > 0 && (
        <Link
          to="/store/$slug"
          params={{ slug: orgSlug }}
          className="tap-scale flex items-center justify-between rounded-2xl bg-ink px-4 py-3.5 text-paper"
        >
          <span className="flex items-center gap-2 text-[14px] font-medium">
            <ShoppingBag className="h-4 w-4" /> Shop {products.length} items
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {productsQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}

      <ul className="space-y-2">
        {products.map(product => (
          <li
            key={product.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-ink">{product.name}</span>
              <span className="mt-0.5 block text-[11.5px] text-ink-soft">
                {money(product.price_cents)}
                {product.sizes.length > 0 ? ` · ${product.sizes.join(", ")}` : ""}
              </span>
            </span>
            {isLeader && (
              <button
                type="button"
                aria-label={`Remove ${product.name}`}
                onClick={() => removeProduct.mutate(product.id)}
                className="rounded-full border border-border p-1.5 text-ink-soft"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {products.length === 0 && !productsQuery.isLoading && (
        <p className="text-[12.5px] text-ink-soft">Nothing listed yet.</p>
      )}

      {isLeader && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="tap-scale inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[12.5px] text-ink"
        >
          <Plus className="h-3.5 w-3.5" /> Add an item
        </button>
      )}

      {isLeader && adding && (
        <form
          onSubmit={e => {
            e.preventDefault();
            addProduct.mutate();
          }}
          className="space-y-2.5 rounded-2xl border border-border bg-card p-3.5"
        >
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Logo tee"
            className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What it is, and where the money goes."
            rows={2}
            className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink"
          />
          <div className="flex gap-2">
            <label className="flex-1 text-[11.5px] text-ink-soft">
              Price (USD)
              <input
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink"
              />
            </label>
            <label className="flex-[2] text-[11.5px] text-ink-soft">
              Sizes (comma separated)
              <input
                value={form.sizes}
                onChange={e => setForm(f => ({ ...f, sizes: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink"
              />
            </label>
          </div>
          {addProduct.isError && (
            <p className="text-[12px] text-flame">{(addProduct.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={addProduct.isPending}
              className="tap-scale rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground disabled:opacity-60"
            >
              {addProduct.isPending ? "Adding…" : "Add item"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-full border border-border px-4 py-2 text-[12.5px] text-ink-soft"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLeader && (
        <section className="space-y-2.5 pt-2">
          <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Package className="h-3.5 w-3.5 text-brass" /> Orders
          </h3>
          {ordersQuery.isLoading && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}
          {!ordersQuery.isLoading && (ordersQuery.data?.length ?? 0) === 0 && (
            <p className="text-[12.5px] text-ink-soft">No orders yet.</p>
          )}
          <ul className="space-y-2">
            {(ordersQuery.data ?? []).map(order => (
              <li key={order.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-ink">
                    {money(order.amount_cents)}
                    <span className="ml-2 text-[11.5px] font-normal text-ink-soft">
                      {new Date(order.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {order.email ? ` · ${order.email}` : ""}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize ${ORDER_STATUS_STYLE[order.status] ?? "bg-secondary text-ink-soft"}`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-ink-soft">
                  {order.store_order_items
                    .map(i => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""}`)
                    .join(", ")}
                </p>

                {addressLines(order).length > 0 && (
                  <p className="mt-1.5 whitespace-pre-line text-[11.5px] leading-snug text-ink">
                    {addressLines(order).join("\n")}
                  </p>
                )}

                {order.status === "paid" && (
                  <>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {STAGES.map(stage => (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => setStage.mutate({ id: order.id, stage })}
                          className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${
                            order.fulfillment === stage
                              ? "bg-ink text-paper"
                              : "border border-border bg-paper text-ink-soft"
                          }`}
                        >
                          {stage === "new" ? "To pack" : stage}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        defaultValue={order.tracking_number ?? ""}
                        placeholder="Tracking number"
                        onBlur={e => {
                          if (e.target.value !== (order.tracking_number ?? "")) {
                            setTracking.mutate({ id: order.id, tracking: e.target.value });
                          }
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-paper px-2.5 py-1.5 text-[12px] text-ink"
                      />
                      <button
                        type="button"
                        onClick={() => refund.mutate(order.id)}
                        disabled={refund.isPending}
                        className="rounded-full border border-border px-2.5 py-1.5 text-[11.5px] text-ink-soft disabled:opacity-50"
                      >
                        Refund
                      </button>
                    </div>
                  </>
                )}
                {(order.refunded_cents ?? 0) > 0 && (
                  <p className="mt-1.5 text-[11.5px] text-flame">
                    {money(order.refunded_cents ?? 0)} refunded
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
