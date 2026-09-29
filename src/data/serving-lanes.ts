// The serving lanes: the kinds of work people actually ask for, each with a
// plain-language range of what neighbors around the country tend to pay. The
// range is a guide, never a price we set — every professional names their own.

export interface ServingLane {
  key: string;
  label: string;
  blurb: string;
  /** Typical going range, in cents. `unit` says what the range is measured in. */
  low: number;
  high: number;
  unit: "hour" | "job";
  /** Trades on existing professional pages that belong in this lane. */
  trades: string[];
}

export const SERVING_LANES: ServingLane[] = [
  {
    key: "yard",
    label: "Yard & lawn",
    blurb: "Mowing, leaves, brush, a fence line that got away from someone.",
    low: 3500,
    high: 8000,
    unit: "job",
    trades: ["Landscaping", "Handyman"],
  },
  {
    key: "handy",
    label: "Handyman & repairs",
    blurb: "Doors that stick, drywall patches, a shelf that needs to hold.",
    low: 4500,
    high: 9500,
    unit: "hour",
    trades: ["Handyman", "Drywall", "Flooring", "Painting"],
  },
  {
    key: "plumbing",
    label: "Plumbing",
    blurb: "Leaks, water heaters, a drain nobody can clear.",
    low: 7500,
    high: 15000,
    unit: "hour",
    trades: ["Plumbing"],
  },
  {
    key: "electrical",
    label: "Electrical",
    blurb: "Outlets, panels, lights that flicker for the wrong reason.",
    low: 8000,
    high: 16000,
    unit: "hour",
    trades: ["Electrical"],
  },
  {
    key: "hvac",
    label: "Heat & air",
    blurb: "A furnace out in January, an unit that quit in July.",
    low: 9000,
    high: 18000,
    unit: "hour",
    trades: ["HVAC"],
  },
  {
    key: "roofing",
    label: "Roofing",
    blurb: "Missing shingles, a tarp that's been up too long, a whole roof.",
    low: 25000,
    high: 150000,
    unit: "job",
    trades: ["Roofing", "Framing"],
  },
  {
    key: "cleaning",
    label: "Cleaning",
    blurb: "A deep clean before a move, or after a hard season.",
    low: 3000,
    high: 6500,
    unit: "hour",
    trades: ["Cleaning"],
  },
  {
    key: "moving",
    label: "Moving & hauling",
    blurb: "A truck, strong hands, and a dump run.",
    low: 4000,
    high: 9000,
    unit: "hour",
    trades: ["Moving", "Hauling"],
  },
  {
    key: "auto",
    label: "Auto repair",
    blurb: "Brakes, a battery, the car someone needs to get to work.",
    low: 7500,
    high: 14000,
    unit: "hour",
    trades: ["Auto repair"],
  },
  {
    key: "childcare",
    label: "Childcare & sitting",
    blurb: "An afternoon covered so a parent can breathe or work.",
    low: 1800,
    high: 3000,
    unit: "hour",
    trades: ["Childcare"],
  },
  {
    key: "meals",
    label: "Meals & food",
    blurb: "Cooking for a family in a hospital week, or a funeral.",
    low: 2500,
    high: 5000,
    unit: "hour",
    trades: ["Cooking"],
  },
  {
    key: "counseling",
    label: "Counseling & care",
    blurb: "Someone trained to sit with grief, addiction or a marriage.",
    low: 6000,
    high: 15000,
    unit: "hour",
    trades: ["Counseling"],
  },
  {
    key: "paperwork",
    label: "Paperwork & money",
    blurb: "Taxes, benefits forms, a budget somebody can live with.",
    low: 5000,
    high: 12000,
    unit: "hour",
    trades: ["Bookkeeping", "Accounting", "Legal help"],
  },
  {
    key: "tech",
    label: "Tech help",
    blurb: "A laptop, a phone, a church sound board nobody can fix.",
    low: 4000,
    high: 9000,
    unit: "hour",
    trades: ["IT"],
  },
  {
    key: "media",
    label: "Photos & video",
    blurb: "Telling a story on camera — a project, a family, a testimony.",
    low: 7500,
    high: 20000,
    unit: "hour",
    trades: ["Photography", "Videography"],
  },
];

export const laneByKey = (key: string) => SERVING_LANES.find(l => l.key === key);

export function laneLabel(key: string): string {
  return laneByKey(key)?.label ?? "Serving";
}

const round = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/** "$45–$95 an hour" / "$350–$1,500 a job" — a guide, not our price. */
export function laneRange(lane: ServingLane): string {
  return `${round(lane.low)}–${round(lane.high)} ${lane.unit === "hour" ? "an hour" : "a job"}`;
}

export const URGENCY = [
  { key: "whenever", label: "Whenever someone can" },
  { key: "this_week", label: "This week" },
  { key: "urgent", label: "Today or tomorrow" },
] as const;

export const urgencyLabel = (key: string) =>
  URGENCY.find(u => u.key === key)?.label ?? "Whenever someone can";

/** Which lane an existing professional page most likely belongs in. */
export function laneForTrade(trade: string): string | null {
  const hit = SERVING_LANES.find(l => l.trades.some(t => t.toLowerCase() === trade.toLowerCase()));
  return hit?.key ?? null;
}
