/** One source of truth for every recurring charge and platform fee. */
export const PAYMENT_CATALOG = {
  organization: {
    page: { name: "Organization Page", priceId: "org_page_monthly", cents: 2_900 },
    page_giving: { name: "Organization Page + Giving", priceId: "org_page_giving_monthly", cents: 7_900 },
    serving: { name: "Organization Serving Add-on", priceId: "org_serving_monthly", cents: 3_900 },
  },
  professional: {
    page: { name: "Professional Page", priceId: "pro_page_monthly", cents: 900 },
  },
  fees: {
    donationBps: 200,
    paidJobBps: 1_000,
  },
} as const;

export type OrganizationPlanKey = keyof typeof PAYMENT_CATALOG.organization;
