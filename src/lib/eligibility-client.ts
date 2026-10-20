import { supabase } from "@/integrations/supabase/client";
import { COMMUNITY_ACKNOWLEDGEMENT_FIELD } from "./community-acknowledgement";
import {
  EligibilityController, ELIGIBILITY_FIELD, assertActualAdultClient,
  readEligibility, type EligibilityUser,
} from "./eligibility";

export async function getEligibilityUser(): Promise<EligibilityUser> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in and resolve account eligibility before continuing.");
  return data.user;
}

export async function requireEligibleActor(expectedId?: string) {
  const user = await getEligibilityUser();
  if ((expectedId && user.id !== expectedId) || !readEligibility(user)) throw new Error("Account eligibility is missing or invalid. Confirm 13+ self-attestation for the current account.");
  return user;
}

export async function requireAdultClient(clientId: string) {
  const user = await requireEligibleActor();
  assertActualAdultClient(user, clientId);
  return user;
}

export const eligibilityController = new EligibilityController({
  session: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },
  user: async token => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw new Error("Could not resolve account.");
    return data.user;
  },
  update: async (token, value) => {
    const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Account confirmation service is unavailable.");
    // Standard authenticated user-metadata update, no privileged key or OAuth proxy.
    // Captured token binds this write to the account explicitly confirmed by the user.
    const response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { [ELIGIBILITY_FIELD]: value } }),
    });
    if (!response.ok) throw new Error("Could not save self-attestation. Protected access remains closed.");
    return await response.json() as EligibilityUser;
  },
  updateCommunity: async (token, value) => {
    const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Account confirmation service is unavailable.");
    // Separate metadata key preserves existing age, birthday and adult declarations.
    const response = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { [COMMUNITY_ACKNOWLEDGEMENT_FIELD]: value } }),
    });
    if (!response.ok) throw new Error("Acknowledgement could not be saved. Please retry.");
    return await response.json() as EligibilityUser;
  },
  watch: onChange => {
    const { data } = supabase.auth.onAuthStateChange(onChange);
    return () => data.subscription.unsubscribe();
  },
});
