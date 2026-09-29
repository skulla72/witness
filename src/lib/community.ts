import type { Tables } from "@/integrations/supabase/types";

export type Org = Tables<"organizations">;
export type OrgGroup = Tables<"organization_groups">;
export type OrgEvent = Tables<"organization_events">;

/**
 * Columns anyone (signed in or not) may read on an organization.
 * Street address and contact email/phone are deliberately excluded — they are
 * only readable by signed-in people and fetched separately in the contact panel.
 */
export const ORG_PUBLIC_COLUMNS =
  "id, owner_id, slug, name, kind, city, region, description, logo_url, cover_path, website, verified, created_at, updated_at";



export const ORG_KINDS = [
  { key: "church", label: "Church", note: "A congregation that gathers to worship" },
  { key: "ministry", label: "Ministry", note: "A team serving under or alongside a church" },
  { key: "nonprofit", label: "Nonprofit", note: "A registered organization serving a need" },
  { key: "community", label: "Community group", note: "Neighbors organized around a shared need" },
] as const;

export type OrgKind = (typeof ORG_KINDS)[number]["key"];

export function kindLabel(kind: string): string {
  return ORG_KINDS.find(k => k.key === kind)?.label ?? "Organization";
}

export const RHYTHMS = [
  { key: "daily", label: "Most days" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Every other week" },
  { key: "monthly", label: "Monthly" },
  { key: "seasonal", label: "In seasons" },
] as const;

export function rhythmLabel(rhythm: string): string {
  return RHYTHMS.find(r => r.key === rhythm)?.label ?? rhythm;
}

export const OPEN_TO = [
  { key: "anyone", label: "Anyone" },
  { key: "men", label: "Men only" },
  { key: "women", label: "Women only" },
  { key: "members", label: "Members of this organization" },
] as const;

export function openToLabel(openTo: string): string {
  return OPEN_TO.find(o => o.key === openTo)?.label ?? openTo;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function placeLine(org: Pick<Org, "city" | "region">): string {
  return [org.city, org.region].filter(Boolean).join(", ");
}

const DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const TIME = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function eventWhen(startsAt: string): string {
  const d = new Date(startsAt);
  return `${DATE.format(d)} · ${TIME.format(d)}`;
}

export function daysAway(startsAt: string): string {
  const ms = new Date(startsAt).getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const weeks = Math.round(days / 7);
  return weeks === 1 ? "In a week" : `In ${weeks} weeks`;
}

export type OrgService = Tables<"organization_services">;
export type OrgPrayerRequest = Tables<"organization_prayer_requests">;

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function dayLabel(day: number): string {
  return DAYS[day] ?? "Sunday";
}

export function serviceWhen(service: Pick<OrgService, "day_of_week" | "time_text">): string {
  return [dayLabel(service.day_of_week), service.time_text].filter(Boolean).join(" · ");
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}
