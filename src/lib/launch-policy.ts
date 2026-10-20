/** Local launch controls, not verified age or remote database/auth enforcement. */
export const MINIMUM_USER_AGE = 13;
export const ADULT_CARE_AGE = 18;
export const TEEN_CARE_NOTICE = "Counseling requests are for adults 18+ only in this launch candidate. Teen counseling is deferred until consent and legal arrangements are finalized.";

/** Use current whole-year age transiently; do not collect a full birth date. */
export function requireAge(raw: unknown, minimum = MINIMUM_USER_AGE): number {
  if (typeof raw !== "string" && typeof raw !== "number") throw new Error("Enter your current age in whole years.");
  if (!/^(0|[1-9]\d{0,2})$/.test(String(raw))) throw new Error("Enter your current age in whole years.");
  const age = Number(raw);
  if (age > 120) throw new Error("Enter your current age in whole years.");
  if (age < minimum) throw new Error(minimum === ADULT_CARE_AGE ? TEEN_CARE_NOTICE : `You must be at least ${minimum} to create an account or continue with Google or Apple.`);
  return age;
}

/** Callback must not execute before validation, including non-UI callers. */
export async function withRegistrationAge<T>(age: unknown, action: () => Promise<T>): Promise<T> {
  requireAge(age);
  return action();
}

/** Pre-auth drafts are never persisted or reused as a signed-in confirmation. */
export async function withProviderAgeAttempt<T>(age: unknown, clear: () => void, action: (age: number) => Promise<T>): Promise<T> {
  const years = requireAge(age);
  clear();
  try { return await action(years); } finally { clear(); }
}

export async function withAdultCareAge<T>(age: unknown, action: () => Promise<T>): Promise<T> {
  requireAge(age, ADULT_CARE_AGE);
  return action();
}

export function isAdultCareAge(age: unknown): boolean {
  try { requireAge(age, ADULT_CARE_AGE); return true; } catch { return false; }
}

export function assertCounselorLaunchSpecialties(specialties: string[], existing: string[] = []) {
  if (specialties.includes("Teens") && !existing.includes("Teens")) throw new Error(TEEN_CARE_NOTICE);
}
