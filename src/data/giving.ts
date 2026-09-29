// Giving, refined into lanes.
// Money is one lane of generosity; time, skill, and organizational capacity are
// the others. Every partner carries a readiness tier so a donor can see what
// their gift is walking into.

import type { Category } from "@/data/seed";
import type { Gender, LaneKey, ServeMode } from "@/data/personalize";

export type Tier = "audited" | "growing" | "grassroots";

export interface Lane {
  key: LaneKey;
  label: string;
  /** One line, in the language of the wound, not the sector. */
  line: string;
  /** What the money and hours actually buy. */
  buys: string;
  /** Prayer categories that quietly point here. */
  categories: Category[];
}

export const LANES: Lane[] = [
  {
    key: "recovery",
    label: "Addiction & recovery",
    line: "For the man who keeps going back.",
    buys: "Detox beds, sober housing, sponsor training.",
    categories: ["Health", "Family"],
  },
  {
    key: "fatherlessness",
    label: "Fatherlessness",
    line: "For the boy whose dad never came back.",
    buys: "Mentor matching, background checks, camp weeks.",
    categories: ["Family", "Relationships"],
  },
  {
    key: "grief",
    label: "Grief & loss",
    line: "For the family after the funeral casseroles stop.",
    buys: "Counseling sessions, burial costs, widow care.",
    categories: ["Grief"],
  },
  {
    key: "abuse",
    label: "Abuse survivors",
    line: "For what was done to someone who couldn't stop it.",
    buys: "Trauma therapy, legal advocacy, safe housing.",
    categories: ["Health", "Relationships"],
  },
  {
    key: "foster",
    label: "Foster & adoption",
    line: "For the kid living out of a trash bag.",
    buys: "Placement kits, respite care, adoption legal fees.",
    categories: ["Family"],
  },
  {
    key: "mens_mental_health",
    label: "Men's mental health",
    line: "For the guy who says he's fine.",
    buys: "Subsidized therapy, crisis lines, group facilitation.",
    categories: ["Health", "Faith"],
  },
  {
    key: "hunger",
    label: "Hunger & housing",
    line: "For the week the money runs out on a Tuesday.",
    buys: "Rent gaps, groceries, utility shutoff stops.",
    categories: ["Provision", "Work"],
  },
];

export const findLane = (key: string) => LANES.find(l => l.key === key);

export const tierLabel: Record<Tier, string> = {
  audited: "Audited",
  growing: "Growing",
  grassroots: "Grassroots",
};

export const tierNote: Record<Tier, string> = {
  audited: "Independent audit, board governance, quarterly reporting.",
  growing: "Clean books, part-time finance help, reports twice a year.",
  grassroots: "Volunteer-run. Real impact, thin back office.",
};

export interface Partner {
  id: string;
  lane: LaneKey;
  name: string;
  blurb: string;
  city: string;
  tier: Tier;
  /** Cents of every dollar reaching program work. */
  to_program: number;
  website: string;
}

export const partners: Partner[] = [
  { id: "o1", lane: "recovery", name: "Second Mile Homes", blurb: "Sober living beds for men leaving detox, with a work program.", city: "Denver, CO", tier: "audited", to_program: 87, website: "secondmilehomes.org" },
  { id: "o2", lane: "recovery", name: "The 4AM Club", blurb: "Peer-run recovery meetings before shift work starts.", city: "Toledo, OH", tier: "grassroots", to_program: 96, website: "4amclub.org" },
  { id: "o3", lane: "fatherlessness", name: "Anchor Mentors", blurb: "One vetted man, one boy, three years minimum.", city: "Atlanta, GA", tier: "audited", to_program: 82, website: "anchormentors.org" },
  { id: "o4", lane: "fatherlessness", name: "Saturday Dads", blurb: "Teaches incarcerated fathers to write and call home.", city: "Little Rock, AR", tier: "growing", to_program: 90, website: "saturdaydads.org" },
  { id: "o5", lane: "grief", name: "After the Casseroles", blurb: "Month 2 to month 24 of widow and widower care.", city: "Nashville, TN", tier: "growing", to_program: 88, website: "afterthecasseroles.org" },
  { id: "o6", lane: "abuse", name: "Quiet Courage", blurb: "Trauma therapy and legal advocacy for survivors, no cost.", city: "Phoenix, AZ", tier: "audited", to_program: 79, website: "quietcourage.org" },
  { id: "o7", lane: "foster", name: "No Trash Bags", blurb: "A real suitcase and a week of clothes on placement night.", city: "Kansas City, MO", tier: "growing", to_program: 92, website: "notrashbags.org" },
  { id: "o8", lane: "mens_mental_health", name: "Steady Table", blurb: "Subsidized counseling for men who've never had a session.", city: "Portland, OR", tier: "growing", to_program: 85, website: "steadytable.org" },
  { id: "o9", lane: "mens_mental_health", name: "Third Shift Line", blurb: "Overnight peer line staffed by men in recovery.", city: "Remote", tier: "grassroots", to_program: 94, website: "thirdshiftline.org" },
  { id: "o10", lane: "hunger", name: "Tuesday Fund", blurb: "One-time rent and utility gaps, verified by local pastors.", city: "Columbus, OH", tier: "audited", to_program: 91, website: "tuesdayfund.org" },
];

export const partnersFor = (lane: LaneKey) => partners.filter(p => p.lane === lane);

/** A recurring pledge split across a lane's vetted partners. */
export interface Pledge {
  lane: LaneKey;
  monthly: number;
  since: string;
  given_total: number;
}

export const myPledges: Pledge[] = [
  { lane: "fatherlessness", monthly: 25, since: "Mar 2026", given_total: 150 },
];

export const laneTotals: Record<LaneKey, { givers: number; quarter: number; distributed: number }> = {
  recovery: { givers: 412, quarter: 38400, distributed: 31200 },
  fatherlessness: { givers: 690, quarter: 61250, distributed: 54100 },
  grief: { givers: 233, quarter: 19800, distributed: 17450 },
  abuse: { givers: 188, quarter: 24600, distributed: 20100 },
  foster: { givers: 355, quarter: 33900, distributed: 29500 },
  mens_mental_health: { givers: 806, quarter: 72300, distributed: 60800 },
  hunger: { givers: 1024, quarter: 88750, distributed: 81200 },
};

/* ---------- Time: real shifts with seats, near you ---------- */

/** What a shift asks you to bring. */
export type Resource =
  | "vehicle"
  | "lifting"
  | "background_check"
  | "training"
  | "bring_family"
  | "nothing";

export const resourceLabel: Record<Resource, string> = {
  vehicle: "A vehicle",
  lifting: "Able to lift",
  background_check: "Background check",
  training: "Training first",
  bring_family: "Kids welcome",
  nothing: "Nothing but you",
};

/** When a shift lands in a week. */
export type DayPart = "weekday" | "evening" | "weekend" | "overnight";

export const dayPartLabel: Record<DayPart, string> = {
  weekday: "Weekday hours",
  evening: "Weeknight",
  weekend: "Weekend",
  overnight: "Overnight",
};

export interface Shift {
  id: string;
  lane: LaneKey;
  org: string;
  title: string;
  where: string;
  when: string;
  /** ZIP + centroid, so distance from you is real. */
  zip: string;
  lat: number;
  lng: number;
  /** Roughly how long you're committed for, in hours. */
  hours: number;
  day_part: DayPart;
  needs: Resource[];
  seats_total: number;
  seats_open: number;
  remote?: boolean;
  /** No experience needed — an honest first step. */
  first_timer_ok: boolean;
}

export const shifts: Shift[] = [
  { id: "s1", lane: "hunger", org: "Tuesday Fund", title: "Grocery run + delivery", where: "Columbus, OH", when: "Sat 9–11am", zip: "43215", lat: 39.9686, lng: -83.0038, hours: 2, day_part: "weekend", needs: ["vehicle"], seats_total: 8, seats_open: 2, first_timer_ok: true },
  { id: "s2", lane: "fatherlessness", org: "Anchor Mentors", title: "Saturday ball game with a matched kid", where: "Atlanta, GA", when: "Sat 1–4pm", zip: "30303", lat: 33.7525, lng: -84.3915, hours: 3, day_part: "weekend", needs: ["background_check"], seats_total: 6, seats_open: 1, first_timer_ok: false },
  { id: "s3", lane: "foster", org: "No Trash Bags", title: "Pack 40 placement suitcases", where: "Kansas City, MO", when: "Thu 6–8pm", zip: "64108", lat: 39.0863, lng: -94.5836, hours: 2, day_part: "evening", needs: ["bring_family"], seats_total: 12, seats_open: 7, first_timer_ok: true },
  { id: "s4", lane: "mens_mental_health", org: "Third Shift Line", title: "Overnight peer line (trained)", where: "Remote", when: "Fri 11pm–3am", zip: "97209", lat: 45.5272, lng: -122.6844, hours: 4, day_part: "overnight", needs: ["training"], seats_total: 4, seats_open: 1, remote: true, first_timer_ok: false },
  { id: "s5", lane: "recovery", org: "Second Mile Homes", title: "Drive two men to court dates", where: "Denver, CO", when: "Wed 8am–noon", zip: "80202", lat: 39.7496, lng: -104.9962, hours: 4, day_part: "weekday", needs: ["vehicle"], seats_total: 3, seats_open: 3, first_timer_ok: true },
  { id: "s6", lane: "grief", org: "After the Casseroles", title: "Yard work for a widow", where: "Nashville, TN", when: "Sun 2–5pm", zip: "37203", lat: 36.1512, lng: -86.7947, hours: 3, day_part: "weekend", needs: ["lifting"], seats_total: 5, seats_open: 4, first_timer_ok: true },
  { id: "s7", lane: "recovery", org: "Second Mile Homes", title: "Cook dinner for the sober house", where: "Denver, CO", when: "Tue 5–7:30pm", zip: "80202", lat: 39.7496, lng: -104.9962, hours: 2.5, day_part: "evening", needs: ["bring_family"], seats_total: 6, seats_open: 4, first_timer_ok: true },
  { id: "s8", lane: "hunger", org: "Tuesday Fund", title: "Move a family into a new apartment", where: "Aurora, CO", when: "Sat 8am–1pm", zip: "80014", lat: 39.6689, lng: -104.8319, hours: 5, day_part: "weekend", needs: ["vehicle", "lifting"], seats_total: 10, seats_open: 6, first_timer_ok: true },
  { id: "s9", lane: "mens_mental_health", org: "Steady Table", title: "Set up chairs for a men's group", where: "Westminster, CO", when: "Thu 6:30–8pm", zip: "80031", lat: 39.8749, lng: -105.0372, hours: 1.5, day_part: "evening", needs: ["nothing"], seats_total: 4, seats_open: 3, first_timer_ok: true },
  { id: "s10", lane: "foster", org: "No Trash Bags", title: "Sort donated clothes by size", where: "Boulder, CO", when: "Sat 10am–noon", zip: "80301", lat: 40.0362, lng: -105.2295, hours: 2, day_part: "weekend", needs: ["nothing"], seats_total: 14, seats_open: 9, first_timer_ok: true },
  { id: "s11", lane: "fatherlessness", org: "Anchor Mentors", title: "Coach a Saturday scrimmage", where: "Colorado Springs, CO", when: "Sat 9–11:30am", zip: "80904", lat: 38.8500, lng: -104.8556, hours: 2.5, day_part: "weekend", needs: ["background_check"], seats_total: 8, seats_open: 5, first_timer_ok: false },
  { id: "s12", lane: "grief", org: "After the Casseroles", title: "Sit with a widower on his first Christmas", where: "Fort Collins, CO", when: "Sun 3–5pm", zip: "80521", lat: 40.5896, lng: -105.0961, hours: 2, day_part: "weekend", needs: ["nothing"], seats_total: 3, seats_open: 2, first_timer_ok: true },
  { id: "s13", lane: "recovery", org: "The 4AM Club", title: "Open the room and make coffee", where: "Toledo, OH", when: "Mon 4–6am", zip: "43604", lat: 41.6528, lng: -83.5379, hours: 2, day_part: "weekday", needs: ["nothing"], seats_total: 2, seats_open: 1, first_timer_ok: true },
  { id: "s14", lane: "abuse", org: "Quiet Courage", title: "Answer the intake line (trained)", where: "Remote", when: "Wed 7–10pm", zip: "85004", lat: 33.4534, lng: -112.0714, hours: 3, day_part: "evening", needs: ["training"], seats_total: 6, seats_open: 2, remote: true, first_timer_ok: false },
];

export const shiftsFor = (lane: LaneKey) => shifts.filter(s => s.lane === lane);


/* ---------- Skills: what you already know how to do ---------- */

export const SKILLS = [
  "Framing / carpentry", "Plumbing", "Electrical", "Auto repair", "CDL / driving",
  "Welding", "HVAC", "Tax prep", "Bookkeeping", "Legal", "IT / networking",
  "Web / software", "Grant writing", "Marketing", "Counseling (licensed)",
  "Coaching youth sports", "Cooking at scale", "Photography", "Spanish / translation",
] as const;

export interface SkillRequest {
  id: string;
  lane: LaneKey;
  org: string;
  skill: string;
  need: string;
  commitment: string;
  urgent?: boolean;
}

export const skillRequests: SkillRequest[] = [
  { id: "k1", lane: "recovery", org: "Second Mile Homes", skill: "Framing / carpentry", need: "Finish two bedrooms so four more beds open by winter.", commitment: "Three Saturdays", urgent: true },
  { id: "k2", lane: "hunger", org: "Tuesday Fund", skill: "Bookkeeping", need: "Reconcile 9 months of donations before the audit.", commitment: "6 hrs/mo, remote" },
  { id: "k3", lane: "foster", org: "No Trash Bags", skill: "CDL / driving", need: "Move donated furniture from a warehouse twice a month.", commitment: "2 days/mo" },
  { id: "k4", lane: "abuse", org: "Quiet Courage", skill: "Legal", need: "Protective order filings — supervised, pro bono.", commitment: "4 hrs/mo, remote" },
  { id: "k5", lane: "fatherlessness", org: "Saturday Dads", skill: "Grant writing", need: "One state grant application, first attempt.", commitment: "One-time, ~15 hrs" },
  { id: "k6", lane: "mens_mental_health", org: "Steady Table", skill: "Web / software", need: "Intake form that doesn't scare men off page one.", commitment: "One-time, remote" },
];

/* ---------- Capacity Corps: run it like a business ---------- */

export interface CapacityEngagement {
  id: string;
  org: string;
  lane: LaneKey;
  role: "Fractional CFO" | "Operations" | "Grant strategy" | "Board governance";
  stage: "applied" | "matched" | "in_progress" | "graduated";
  /** Funding is released as capacity milestones land, not all at once. */
  milestones: Array<{ label: string; done: boolean }>;
  tranche_released: number;
  tranche_total: number;
  operator?: string;
}

export const capacityEngagements: CapacityEngagement[] = [
  {
    id: "c1", org: "The 4AM Club", lane: "recovery", role: "Fractional CFO", stage: "in_progress",
    operator: "Ray M., CPA (pro bono, 8 hrs/mo)",
    milestones: [
      { label: "Chart of accounts rebuilt", done: true },
      { label: "Monthly close under 10 days", done: true },
      { label: "12-month cash forecast", done: false },
      { label: "First independent review", done: false },
    ],
    tranche_released: 20000, tranche_total: 60000,
  },
  {
    id: "c2", org: "No Trash Bags", lane: "foster", role: "Operations", stage: "matched",
    operator: "Dana K., ops lead",
    milestones: [
      { label: "Volunteer intake documented", done: true },
      { label: "Warehouse inventory system", done: false },
      { label: "Two paid staff hired", done: false },
    ],
    tranche_released: 10000, tranche_total: 45000,
  },
  {
    id: "c3", org: "Third Shift Line", lane: "mens_mental_health", role: "Board governance", stage: "applied",
    milestones: [
      { label: "Bylaws reviewed", done: false },
      { label: "Three independent board seats filled", done: false },
    ],
    tranche_released: 0, tranche_total: 30000,
  },
];

/** Story matching: a prayer category quietly points at a lane. */
export function lanesForCategory(cat: Category): Lane[] {
  return LANES.filter(l => l.categories.includes(cat));
}

export const serveLabel: Record<ServeMode, string> = {
  money: "Fund it",
  time: "Show up",
  skills: "Lend a skill",
  capacity: "Build the org",
};

/**
 * The fatherless lane, said in the language of the person reading it.
 * Everything else keeps its own line.
 */
const GENDERED_LANE_LINES: Partial<Record<LaneKey, Record<Gender, string>>> = {
  fatherlessness: {
    female: "For the girl whose father didn't show up.",
    male: "For the boy whose father didn't show up.",
    unspecified: "For the child whose father didn't show up.",
  },
};

export function laneLine(lane: Lane, gender: Gender = "unspecified") {
  return GENDERED_LANE_LINES[lane.key]?.[gender] ?? lane.line;
}
