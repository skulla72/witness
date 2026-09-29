import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Minus, Plus, ShoppingBag, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { BRAND } from "@/config/brand";
import { money } from "@/lib/stripe";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StoreCheckout } from "@/components/store/StoreCheckout";
import { ORG_PUBLIC_COLUMNS, placeLine, kindLabel, type Org } from "@/lib/community";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"store_products">;

export const Route = createFileRoute("/store/$slug")({
  staticData: { sitemap: false },
  component: StorePage,
  head: () => ({
    meta: [
      { title: `Community store · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Buy branded gear straight from a church or community group. Every order runs through the app and the money stays with them.",
      },
      { property: "og:title", content: `Community store · ${BRAND.name}` },
      {
        property: "og:description",
        content: "Tees, hats and hoodies that back the people who gather near you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <Shell>
      <p className="font-serif text-[18px] text-ink">We couldn't open this store</p>
      <p className="mt-2 text-[13px] text-ink-soft">Try again in a moment.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="font-serif text-[18px] text-ink">No store here yet</p>
      <p className="mt-2 text-[13px] text-ink-soft">This organization hasn't listed anything.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-16 pt-10 text-center">{children}</div>;
}

interface CartItem {
  productId: string;
  name: string;
  size: string;
  quantity: number;
  price_cents: number;
}

function StorePage() {
  const { slug } = Route.useParams();
  const { userId, email } = useSession();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [paying, setPaying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["store", slug],
    queryFn: async () => {
      const { data: org, error } = await supabase
        .from("organizations")
        .select(ORG_PUBLIC_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!org) return { org: null as Org | null, products: [] as Product[] };
      const { data: products, error: pErr } = await supabase
        .from("store_products")
        .select("*")
        .eq("org_id", org.id)
        .eq("active", true)
        .order("sort", { ascending: true });
      if (pErr) throw pErr;
      return { org: org as Org, products: (products ?? []) as Product[] };
    },
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, i) => sum + i.price_cents * i.quantity, 0),
    [cart],
  );

  function add(product: Product) {
    const size = sizes[product.id] ?? product.sizes[0] ?? "One size";
    setCart(prev => {
      const found = prev.find(i => i.productId === product.id && i.size === size);
      if (found) {
        return prev.map(i =>
          i === found ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          size,
          quantity: 1,
          price_cents: product.price_cents,
        },
      ];
    });
  }

  function bump(item: CartItem, delta: number) {
    setCart(prev =>
      prev
        .map(i =>
          i === item ? { ...i, quantity: Math.max(0, Math.min(20, i.quantity + delta)) } : i,
        )
        .filter(i => i.quantity > 0),
    );
  }

  if (isLoading) {
    return (
      <Shell>
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-ink-soft" />
      </Shell>
    );
  }

  const org = data?.org;
  if (!org) {
    return (
      <Shell>
        <p className="font-serif text-[18px] text-ink">No store here yet</p>
        <p className="mt-2 text-[13px] text-ink-soft">
          This organization hasn't listed anything.
        </p>
      </Shell>
    );
  }

  const products = data?.products ?? [];

  if (paying) {
    return (
      <div className="pb-16">
        <PaymentTestModeBanner />
        <div className="px-4 pt-3">
          <button
            onClick={() => setPaying(false)}
            className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
          >
            <ArrowLeft className="h-4 w-4" /> Back to the store
          </button>
        </div>
        <div className="mt-3 px-2">
          <StoreCheckout
            orgSlug={slug}
            lines={cart.map(i => ({
              productId: i.productId,
              size: i.size,
              quantity: i.quantity,
            }))}
            email={email ?? undefined}
            returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <PaymentTestModeBanner />
      <div className="px-4 pt-3">
        <Link
          to="/community/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-[13px] text-ink-soft"
        >
          <ArrowLeft className="h-4 w-4" /> {org.name}
        </Link>
      </div>

      <header className="px-4 pt-4">
        <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-brass">
          <ShoppingBag className="h-3.5 w-3.5" /> Store
        </p>
        <h1 className="mt-1 font-serif text-[26px] leading-tight text-ink">
          {org.name} gear
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          {kindLabel(org.kind)} · {placeLine(org)}. You buy here, they ship it — nothing
          leaves the app and no cut goes to a middleman storefront.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="mt-8 px-4 text-[13px] text-ink-soft">
          Nothing listed yet. Their leaders can add gear from the organization page.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 px-4">
          {products.map(product => (
            <article
              key={product.id}
              className="flex flex-col rounded-2xl border border-border bg-card p-3 shadow-soft"
            >
              <div className="flex h-24 items-center justify-center rounded-xl bg-secondary">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    className="h-24 w-full rounded-xl object-cover"
                  />
                ) : (
                  <Shirt className="h-7 w-7 text-brass" />
                )}
              </div>
              <h2 className="mt-2 text-[14px] font-medium text-ink">{product.name}</h2>
              <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink-soft">
                {product.description}
              </p>
              <p className="mt-2 text-[14px] font-medium text-ink">
                {money(product.price_cents)}
              </p>
              {product.sizes.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {product.sizes.map(size => {
                    const active = (sizes[product.id] ?? product.sizes[0]) === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setSizes(s => ({ ...s, [product.id]: size }))}
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          active
                            ? "border-ink bg-ink text-paper"
                            : "border-border text-ink-soft"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => add(product)}
                className="tap-scale mt-3 rounded-full bg-ink px-3 py-2 text-[12px] font-medium text-paper"
              >
                Add to bag
              </button>
            </article>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-paper/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-24 lg:left-64">
          <div className="mx-auto max-w-md">
            <ul className="max-h-32 space-y-1.5 overflow-y-auto no-scrollbar">
              {cart.map(item => (
                <li
                  key={`${item.productId}-${item.size}`}
                  className="flex items-center justify-between text-[12px] text-ink"
                >
                  <span className="truncate">
                    {item.name}
                    {item.size ? ` · ${item.size}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <button
                      aria-label="Remove one"
                      onClick={() => bump(item, -1)}
                      className="rounded-full border border-border p-1"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-4 text-center">{item.quantity}</span>
                    <button
                      aria-label="Add one"
                      onClick={() => bump(item, 1)}
                      className="rounded-full border border-border p-1"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <span className="w-14 text-right">
                      {money(item.price_cents * item.quantity)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setPaying(true)}
              className="tap-scale mt-2.5 w-full rounded-full bg-brass px-4 py-3 text-[14px] font-medium text-paper"
            >
              Check out · {money(subtotal)} + shipping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
