import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { authorizePurchase, ELIGIBILITY_RETRY, type PurchaseKind } from "./action-eligibility";

export async function checkoutAccount(expectedId?: string, kind: PurchaseKind = "community") {
  return (await authorizePurchase(async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const header = getRequest()?.headers.get("authorization");
    if (!url || !key || !header?.startsWith("Bearer ")) throw new Error(ELIGIBILITY_RETRY);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(header.slice(7));
    if (error || !data.user) throw new Error(ELIGIBILITY_RETRY);
    return data.user;
  }, expectedId, kind)).id;
}

export function checkoutRefusal(error: unknown) {
  return { error: error instanceof Error ? error.message : ELIGIBILITY_RETRY };
}
