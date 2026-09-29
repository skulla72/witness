// What it costs an organization to be here. Plans never change who sees a prayer.
import { PAYMENT_CATALOG } from "@/lib/paymentCatalog";

export type PlanKey = "page" | "page_giving" | "serving";

export interface Plan {
  key: PlanKey;
  name: string;
  priceId: string;
  cents: number;
  blurb: string;
  carries: string[];
  addOn?: boolean;
}

export const PLANS: Plan[] = [
  {
    key: "page",
    name: "Page",
    priceId: PAYMENT_CATALOG.organization.page.priceId,
    cents: PAYMENT_CATALOG.organization.page.cents,
    blurb: "A page of your own, and a way to speak to your people.",
    carries: [
      "Your page, profile photo and links",
      "Announcements for events and people to pray for",
      "Prayer groups you run",
      "You show up when someone searches for you",
    ],
  },
  {
    key: "page_giving",
    name: "Page + Giving",
    priceId: PAYMENT_CATALOG.organization.page_giving.priceId,
    cents: PAYMENT_CATALOG.organization.page_giving.cents,
    blurb: "Everything above, plus gifts landing in your own account.",
    carries: [
      "Everything in the Page plan",
      "Gifts and monthly giving routed to your account",
      "Your own giving page and fund listing",
      "Givers can cover processing so you keep the full amount",
    ],
  },
  {
    key: "serving",
    name: "Serving",
    priceId: PAYMENT_CATALOG.organization.serving.priceId,
    cents: PAYMENT_CATALOG.organization.serving.cents,
    addOn: true,
    blurb: "Add serving on top of either plan.",
    carries: [
      "Serving posts on the Needs board",
      "Pooled job funds for work that costs money",
      "Connections to identity-verified professionals",
    ],
  },
];

/** What it costs a professional to keep their page active. Small on purpose. */
export const PRO_PAGE_PLAN = {
  name: "Professional page",
  priceId: PAYMENT_CATALOG.professional.page.priceId,
  cents: PAYMENT_CATALOG.professional.page.cents,
  carries: [
    "Your page stays active and findable",
    "Serving posts and job funds you can take on",
    "Stars, reviews and hours on your page",
  ],
};

export const planByKey = (key: string) => PLANS.find(p => p.key === key);

export function planPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}/mo`;
}
