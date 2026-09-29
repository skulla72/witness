import { useQuery } from "@tanstack/react-query";
import { Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { money } from "@/lib/stripe";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

interface OrderRow {
  id: string;
  status: string;
  amount_cents: number;
  created_at: string;
  fulfillment: string;
  tracking_number: string | null;
  refunded_cents: number | null;
  organizations: { name: string } | null;
  store_order_items: { name: string; size: string | null; quantity: number }[];
}

const STAGE_LABEL: Record<string, string> = {
  new: "Being prepared",
  packing: "Being packed",
  shipped: "On the way",
  delivered: "Delivered",
  canceled: "Cancelled",
};

/** What someone bought and where it is right now. */
export function MyOrders({ embedded = false }: { embedded?: boolean }) {
  const { userId } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("store_orders")
        .select(
          "id, status, amount_cents, created_at, fulfillment, tracking_number, refunded_cents, organizations(name), store_order_items(name, size, quantity)",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  if (!userId) return null;
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
      </div>
    );
  }
  const orders = (data ?? []).filter(o => o.status !== "pending" && o.status !== "abandoned");
  if (orders.length === 0) return null;

  return (
    <section className={embedded ? "border-t border-border px-3 py-4" : "mx-4 mt-8 rounded-2xl border border-border bg-card p-4 shadow-soft"}>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brass">
        <Package className="h-3 w-3" /> Your orders
      </p>
      <div className="mt-3 space-y-2">
        {orders.map(o => (
          <div key={o.id} className="rounded-xl border border-border bg-paper p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] text-ink">{money(o.amount_cents)}</p>
              <span className="text-[11px] text-ink-soft">
                {DATE.format(new Date(o.created_at))}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {o.organizations?.name ?? "Store"} ·{" "}
              {o.store_order_items
                .map(i => `${i.quantity}× ${i.name}${i.size ? ` (${i.size})` : ""}`)
                .join(", ")}
            </p>
            <p className="mt-1.5 text-[11.5px] text-hope">
              {o.status === "refunded"
                ? `Refunded ${money(o.refunded_cents ?? o.amount_cents)}`
                : (STAGE_LABEL[o.fulfillment] ?? "Being prepared")}
              {o.tracking_number ? ` · ${o.tracking_number}` : ""}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
