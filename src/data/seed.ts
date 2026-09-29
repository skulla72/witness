import jamesPortrait from "@/assets/james-portrait.png.asset.json";

export type Status = "open" | "answered_yes" | "answered_differently" | "ongoing" | "declined";
export type Privacy = "private" | "circle" | "church" | "public";
export type Category =
  | "Health" | "Family" | "Provision" | "Faith" | "Relationships"
  | "Work" | "Salvation" | "Grief" | "Other";

export const HEAVY_CATEGORIES: Category[] = ["Health", "Grief", "Relationships", "Salvation", "Family"];

export type GratitudeType = "photo" | "video" | "text" | "voice";

export interface Gratitude {
  id: string;
  user_id: string;
  type: GratitudeType;
  caption: string;
  media_url?: string;
  bg_color?: string; // for text type
  prompt_id?: string;
  linked_prayer_id?: string;
  privacy: Privacy;
  created_at: string;
  amen_count: number;
}

export interface WalkWithGroup {
  id: string;
  topic: string;
  blurb: string;
  members: number;
  facilitator_id: string;
  joined?: boolean;
  tone: "grief" | "prodigal" | "illness" | "marriage" | "addiction" | "caregivers" | "mental" | "mens" | "open";
  /** "faith" = prayer-centered. "open" = no faith language required. */
  kind: "faith" | "open";
  cadence: string;
  next_meet: string;
  seats_total: number;
  seats_open: number;
  /** The house rules a person agrees to at the threshold. */
  covenant: string[];
  /** The one question asked at the door. */
  door_question: string;
}

export interface VerifiedNeed {
  id: string;
  title: string;
  story: string;
  image: string;
  verifier: string;
  target: number;
  raised: number;
  status: "active" | "funded";
}

export interface PartnerMinistry {
  id: string;
  name: string;
  description: string;
  website: string;
  category: string;
}

export interface DailyPrompt {
  id: string;
  text: string;
}

export interface Intercession {
  id: string;
  prayer_id: string;
  user_id: string;
  kind: "video" | "voice" | "tap";
  caption?: string;
  thumbnail?: string;
  duration_sec?: number;
  created_at: string;
  visibility: "asker_only" | "circle";
}

export interface AnswerMontage {
  id: string;
  prayer_id: string;
  thumbnail: string;
  duration_sec: number;
  contributor_count: number;
  created_at: string;
  status: "ready" | "generating";
}

export interface User {
  id: string;
  name: string;
  photo: string;
  bio?: string;
  home_church?: string;
  denomination?: string;
}

export interface Prayer {
  id: string;
  user_id: string;
  ask_caption: string;
  ask_kind?: "video" | "text";
  ask_thumbnail?: string;
  ask_bg?: string; // for text prayers
  ask_created_at: string; // ISO
  category: Category;
  privacy: Privacy;
  is_anonymous: boolean;
  status: Status;
  scripture?: { ref: string; text: string };
  answer_caption?: string;
  answer_thumbnail?: string;
  answer_created_at?: string;
  intercession_count: number;
  comment_count: number;
}

const photo = (seed: string) => `https://i.pravatar.cc/200?u=${seed}`;
const still = (seed: string) =>
  `https://picsum.photos/seed/${seed}/720/1280`;
const square = (seed: string) => `https://picsum.photos/seed/${seed}/800/800`;

export const users: User[] = [
  { id: "u_me", name: "You", photo: photo("me"), bio: "Walking by faith, not sight.", home_church: "Grace Chapel" },
  { id: "u_maria", name: "Maria Alvarez", photo: photo("maria"), bio: "Mother of three. Praying through.", home_church: "Iglesia Renacer" },
  { id: "u_james", name: "James Okoye", photo: jamesPortrait.url, bio: "Engineer. Husband. Lifelong learner.", home_church: "Redeemer East" },
  { id: "u_ruth", name: "Ruth Calder", photo: photo("ruth"), bio: "Nurse. Widow. Held by Him.", home_church: "St. Andrews" },
  { id: "u_dev", name: "Devon Pierce", photo: photo("devon"), bio: "Recovering. One day at a time.", home_church: "The Bridge" },
  { id: "u_priya", name: "Priya Mathew", photo: photo("priya"), bio: "Teacher. Writer. Asking questions out loud.", home_church: "St. Thomas" },
  { id: "u_aiden", name: "Aiden Park", photo: photo("aiden"), bio: "College student. New to all this.", home_church: "Campus Fellowship" },
  { id: "u_lena", name: "Lena Brooks", photo: photo("lena"), bio: "Adoptive mom. Coffee always.", home_church: "Grace Chapel" },
  { id: "u_marcus", name: "Marcus Hill", photo: photo("marcus"), bio: "Pastor in training.", home_church: "Hope City" },
  { id: "u_anon", name: "Anonymous", photo: photo("anon") },
];

const now = Date.now();
const ago = (h: number) => new Date(now - h * 3600_000).toISOString();

export const prayers: Prayer[] = [
  {
    id: "p1",
    user_id: "u_maria",
    ask_caption: "My son starts chemo Thursday. He's six. I don't have words tonight — just please pray.",
    ask_thumbnail: still("p1a"),
    ask_created_at: ago(36),
    category: "Health",
    privacy: "public",
    is_anonymous: false,
    status: "ongoing",
    scripture: { ref: "Psalm 34:18", text: "The Lord is close to the brokenhearted." },
    answer_caption: "First round done. He smiled today. Small mercy, huge to me.",
    answer_thumbnail: still("p1b"),
    answer_created_at: ago(4),
    intercession_count: 412,
    comment_count: 38,
  },
  {
    id: "p2",
    user_id: "u_james",
    ask_caption: "Job interview tomorrow. Eight months unemployed. Need this one.",
    ask_thumbnail: still("p2a"),
    ask_created_at: ago(72),
    category: "Provision",
    privacy: "public",
    is_anonymous: false,
    status: "answered_yes",
    answer_caption: "I got it. I'm shaking. Thank you to everyone who held me up.",
    answer_thumbnail: still("p2b"),
    answer_created_at: ago(18),
    intercession_count: 289,
    comment_count: 64,
  },
  {
    id: "p3",
    user_id: "u_anon",
    ask_caption: "My marriage is in trouble and I haven't told anyone. Please pray for us.",
    ask_thumbnail: still("p3a"),
    ask_created_at: ago(12),
    category: "Relationships",
    privacy: "circle",
    is_anonymous: true,
    status: "open",
    intercession_count: 47,
    comment_count: 9,
  },
  {
    id: "p4",
    user_id: "u_ruth",
    ask_caption: "It's been a year since I lost him. I'm asking for peace today.",
    ask_thumbnail: still("p4a"),
    ask_created_at: ago(96),
    category: "Grief",
    privacy: "public",
    is_anonymous: false,
    scripture: { ref: "Matthew 5:4", text: "Blessed are those who mourn, for they shall be comforted." },
    status: "answered_differently",
    answer_caption: "The grief didn't go. But I felt held today. That's enough.",
    answer_thumbnail: still("p4b"),
    answer_created_at: ago(24),
    intercession_count: 156,
    comment_count: 22,
  },
  {
    id: "p5",
    user_id: "u_dev",
    ask_caption: "Day one. Again. Pray I don't pick up tonight.",
    ask_thumbnail: still("p5a"),
    ask_created_at: ago(8),
    category: "Other",
    privacy: "circle",
    is_anonymous: false,
    status: "open",
    intercession_count: 33,
    comment_count: 7,
  },
  {
    id: "p6",
    user_id: "u_priya",
    ask_caption: "My dad doesn't believe. Twenty years I've prayed. I'm still praying.",
    ask_thumbnail: still("p6a"),
    ask_created_at: ago(120),
    category: "Salvation",
    privacy: "public",
    is_anonymous: false,
    status: "ongoing",
    intercession_count: 201,
    comment_count: 31,
  },
  {
    id: "p7",
    user_id: "u_aiden",
    ask_caption: "First time posting. I don't know what I believe yet but I'm asking anyway.",
    ask_thumbnail: still("p7a"),
    ask_created_at: ago(20),
    category: "Faith",
    privacy: "public",
    is_anonymous: false,
    status: "open",
    intercession_count: 88,
    comment_count: 19,
  },
  {
    id: "p8",
    user_id: "u_lena",
    ask_caption: "Court date for our foster placement is Friday. Praying she gets to stay.",
    ask_thumbnail: still("p8a"),
    ask_created_at: ago(48),
    category: "Family",
    privacy: "church",
    is_anonymous: false,
    status: "declined",
    answer_caption: "She's going back. I don't understand. But God is still good. I'm still trusting.",
    answer_thumbnail: still("p8b"),
    answer_created_at: ago(2),
    intercession_count: 174,
    comment_count: 41,
  },
  {
    id: "p9",
    user_id: "u_marcus",
    ask_caption: "Preaching for the first time on Sunday. Pray the words aren't mine.",
    ask_thumbnail: still("p9a"),
    ask_created_at: ago(60),
    category: "Faith",
    privacy: "public",
    is_anonymous: false,
    status: "answered_yes",
    answer_caption: "Two people stayed after. One cried. I cried. He showed up.",
    answer_thumbnail: still("p9b"),
    answer_created_at: ago(30),
    intercession_count: 92,
    comment_count: 14,
  },
  {
    id: "p10",
    user_id: "u_me",
    ask_caption: "Asking for clarity on a decision I've been sitting with for weeks.",
    ask_thumbnail: still("p10a"),
    ask_created_at: ago(6),
    category: "Work",
    privacy: "circle",
    is_anonymous: false,
    status: "open",
    intercession_count: 12,
    comment_count: 3,
  },
  {
    id: "p11",
    user_id: "u_me",
    ask_caption: "Mom's scan came back clear last week. Wanted to mark it.",
    ask_thumbnail: still("p11a"),
    ask_created_at: ago(200),
    category: "Health",
    privacy: "public",
    is_anonymous: false,
    status: "answered_yes",
    answer_caption: "Clear. Three years out. I keep weeping when I say it out loud.",
    answer_thumbnail: still("p11b"),
    answer_created_at: ago(190),
    intercession_count: 67,
    comment_count: 12,
  },
  {
    id: "p12",
    user_id: "u_priya",
    ask_caption: "Hard week at school. Pray for the kid in third period — he's carrying so much.",
    ask_thumbnail: still("p12a"),
    ask_created_at: ago(14),
    category: "Other",
    privacy: "public",
    is_anonymous: false,
    status: "open",
    intercession_count: 24,
    comment_count: 5,
  },
  {
    id: "p13",
    user_id: "u_aiden",
    ask_caption: "Couldn't get the words out on camera. I just need peace before finals.",
    ask_kind: "text",
    ask_bg: "oklch(0.86 0.06 250)",
    ask_created_at: ago(3),
    category: "Faith",
    privacy: "public",
    is_anonymous: false,
    status: "open",
    intercession_count: 14,
    comment_count: 2,
  },
  {
    id: "p14",
    user_id: "u_anon",
    ask_caption: "Anxiety has been heavy this week. Asking for stillness.",
    ask_kind: "text",
    ask_bg: "oklch(0.84 0.05 140)",
    ask_created_at: ago(10),
    category: "Other",
    privacy: "public",
    is_anonymous: true,
    status: "open",
    intercession_count: 31,
    comment_count: 4,
  },
];

export const churchGroups: Array<{
  id: string; name: string; members: number; leader_id: string;
  kind: "church" | "mens" | "open"; note: string;
}> = [
  { id: "c1", name: "Grace Chapel — Tuesday Group", members: 24, leader_id: "u_marcus", kind: "church", note: "Your home church small group" },
  { id: "c2", name: "Redeemer East — Men's Circle", members: 11, leader_id: "u_james", kind: "mens", note: "Men only · 6am, Tuesdays" },
  { id: "c3", name: "Elm Street Neighbors", members: 18, leader_id: "u_aiden", kind: "open", note: "Not church related · anyone welcome" },
];

export const circle = [
  "u_maria", "u_james", "u_ruth", "u_lena", "u_dev",
];

export const comments = [
  { id: "c1", prayer_id: "p1", user_id: "u_ruth", text: "Standing with you tonight. Won't stop.", scripture: "Isaiah 41:10", created_at: ago(34) },
  { id: "c2", prayer_id: "p1", user_id: "u_lena", text: "I'm a mom. I can't imagine. Praying right now.", created_at: ago(30) },
  { id: "c3", prayer_id: "p1", user_id: "u_marcus", text: "Lifting your son by name this morning.", created_at: ago(12) },
  { id: "c4", prayer_id: "p2", user_id: "u_priya", text: "He sees you. He knows the count of months.", created_at: ago(60) },
  { id: "c5", prayer_id: "p5", user_id: "u_me", text: "One hour at a time. I'm here.", created_at: ago(6) },
];

export const findUser = (id: string) => users.find(u => u.id === id) ?? users[users.length - 1];
export const findPrayer = (id: string) => prayers.find(p => p.id === id);
export const myPrayers = () => prayers.filter(p => p.user_id === "u_me");

export const intercessions: Intercession[] = [
  { id: "i1", prayer_id: "p1", user_id: "u_ruth",   kind: "video", caption: "Praying Psalm 91 over your boy tonight.", thumbnail: "https://picsum.photos/seed/i1/720/1280", duration_sec: 42, created_at: ago(33), visibility: "asker_only" },
  { id: "i2", prayer_id: "p1", user_id: "u_lena",   kind: "voice", caption: "A whispered prayer at 2am.", duration_sec: 58, created_at: ago(28), visibility: "asker_only" },
  { id: "i3", prayer_id: "p1", user_id: "u_marcus", kind: "video", caption: "Our whole small group, around the table.", thumbnail: "https://picsum.photos/seed/i3/720/1280", duration_sec: 67, created_at: ago(14), visibility: "circle" },
  { id: "i4", prayer_id: "p2", user_id: "u_priya",  kind: "video", caption: "Standing on Jeremiah 29:11 with you.", thumbnail: "https://picsum.photos/seed/i4/720/1280", duration_sec: 33, created_at: ago(70), visibility: "asker_only" },
  { id: "i5", prayer_id: "p5", user_id: "u_me",     kind: "voice", caption: "Praying through the night with you.", duration_sec: 22, created_at: ago(7),  visibility: "asker_only" },
  { id: "i6", prayer_id: "p10",user_id: "u_lena",   kind: "video", caption: "Asking the Lord for clarity. Take your time.", thumbnail: "https://picsum.photos/seed/i6/720/1280", duration_sec: 29, created_at: ago(5),  visibility: "asker_only" },
];

export const answerMontages: AnswerMontage[] = [
  { id: "m_p2", prayer_id: "p2", thumbnail: "https://picsum.photos/seed/mp2/720/1280", duration_sec: 48, contributor_count: 14, created_at: ago(17), status: "ready" },
  { id: "m_p11", prayer_id: "p11", thumbnail: "https://picsum.photos/seed/mp11/720/1280", duration_sec: 39, contributor_count: 9, created_at: ago(189), status: "ready" },
];

export const intercessionsFor = (prayerId: string) =>
  intercessions.filter(i => i.prayer_id === prayerId);
export const montageFor = (prayerId: string) =>
  answerMontages.find(m => m.prayer_id === prayerId);

export const statusLabel: Record<Status, string> = {
  open: "Open",
  answered_yes: "Answered — Yes",
  answered_differently: "Answered — Differently",
  ongoing: "Ongoing",
  declined: "He said no",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo} months`;
}

export const dailyPrompts: DailyPrompt[] = [
  { id: "dp1", text: "What's one small mercy from today?" },
  { id: "dp2", text: "Who showed up for you this week?" },
  { id: "dp3", text: "Where did you see God in the ordinary?" },
  { id: "dp4", text: "What's a hard thing that became holy?" },
  { id: "dp5", text: "What did your body get to do today?" },
  { id: "dp6", text: "Name a comfort you almost overlooked." },
  { id: "dp7", text: "What's a prayer He answered quietly?" },
];

export const gratitudes: Gratitude[] = [
  { id: "g1", user_id: "u_lena", type: "photo", caption: "Thank you for this sunrise. I almost slept through it.", media_url: square("g1"), privacy: "public", created_at: ago(2), amen_count: 34 },
  { id: "g2", user_id: "u_james", type: "text", caption: "Eight months. He held me. He held my family. I'm employed.", bg_color: "oklch(0.88 0.06 75)", privacy: "public", linked_prayer_id: "p2", prompt_id: "dp7", created_at: ago(5), amen_count: 82 },
  { id: "g3", user_id: "u_ruth", type: "photo", caption: "My granddaughter called. Out of nowhere. Just to talk.", media_url: square("g3"), privacy: "circle", created_at: ago(9), amen_count: 21 },
  { id: "g4", user_id: "u_priya", type: "video", caption: "Coffee with my dad. We didn't fight.", media_url: square("g4"), privacy: "public", created_at: ago(14), amen_count: 47 },
  { id: "g5", user_id: "u_me", type: "text", caption: "Slept through the night.", bg_color: "oklch(0.85 0.08 140)", privacy: "circle", created_at: ago(20), amen_count: 8 },
  { id: "g6", user_id: "u_marcus", type: "photo", caption: "My wife brought me lunch at the church office. I didn't ask.", media_url: square("g6"), privacy: "public", created_at: ago(26), amen_count: 29 },
  { id: "g7", user_id: "u_dev", type: "text", caption: "30 days. Not by my strength.", bg_color: "oklch(0.78 0.1 40)", privacy: "circle", created_at: ago(30), amen_count: 91 },
  { id: "g8", user_id: "u_aiden", type: "voice", caption: "Walked into the chapel. Just sat there. It was enough.", media_url: square("g8"), privacy: "public", created_at: ago(40), amen_count: 18 },
  { id: "g9", user_id: "u_maria", type: "photo", caption: "He ate a whole meal today. Thank you, thank you.", media_url: square("g9"), linked_prayer_id: "p1", privacy: "public", created_at: ago(50), amen_count: 156 },
  { id: "g10", user_id: "u_lena", type: "photo", caption: "Foster placement #2. A different little one. She fell asleep on me.", media_url: square("g10"), privacy: "circle", created_at: ago(60), amen_count: 42 },
  { id: "g11", user_id: "u_priya", type: "text", caption: "A student said thank you. The one I'd been praying for.", bg_color: "oklch(0.9 0.04 75)", privacy: "public", created_at: ago(72), amen_count: 23 },
  { id: "g12", user_id: "u_james", type: "photo", caption: "First paycheck. We tithed the first dollar.", media_url: square("g12"), privacy: "public", created_at: ago(80), amen_count: 67 },
  { id: "g13", user_id: "u_ruth", type: "photo", caption: "I laughed today. A real one. I forgot I could.", media_url: square("g13"), privacy: "public", created_at: ago(90), amen_count: 38 },
  { id: "g14", user_id: "u_me", type: "photo", caption: "Mom's clear scan, three years out. Still weeping.", media_url: square("g14"), linked_prayer_id: "p11", privacy: "public", created_at: ago(100), amen_count: 54 },
  { id: "g15", user_id: "u_aiden", type: "text", caption: "I prayed and meant it.", bg_color: "oklch(0.82 0.06 250)", privacy: "circle", created_at: ago(110), amen_count: 19 },
  { id: "g16", user_id: "u_dev", type: "photo", caption: "Sponsor texted first. I didn't have to ask.", media_url: square("g16"), privacy: "circle", created_at: ago(120), amen_count: 27 },
  { id: "g17", user_id: "u_marcus", type: "video", caption: "Baptized two kids. Their mom in the back, crying.", media_url: square("g17"), privacy: "public", created_at: ago(130), amen_count: 88 },
  { id: "g18", user_id: "u_lena", type: "text", caption: "Cold coffee, warm baby. I'm fine.", bg_color: "oklch(0.86 0.05 60)", privacy: "public", created_at: ago(140), amen_count: 31 },
  { id: "g19", user_id: "u_priya", type: "photo", caption: "Rain after weeks. The garden drank.", media_url: square("g19"), privacy: "public", created_at: ago(150), amen_count: 22 },
  { id: "g20", user_id: "u_maria", type: "text", caption: "He smiled at the nurse. She said he was her favorite.", bg_color: "oklch(0.84 0.07 75)", privacy: "public", linked_prayer_id: "p1", created_at: ago(160), amen_count: 73 },
  { id: "g21", user_id: "u_ruth", type: "photo", caption: "His chair. Still there. Less heavy today.", media_url: square("g21"), privacy: "public", created_at: ago(170), amen_count: 49 },
  { id: "g22", user_id: "u_aiden", type: "voice", caption: "A friend prayed over me. Out loud. I didn't run.", media_url: square("g22"), privacy: "circle", created_at: ago(180), amen_count: 12 },
  { id: "g23", user_id: "u_marcus", type: "text", caption: "Two people stayed after to ask about Jesus.", bg_color: "oklch(0.83 0.08 75)", linked_prayer_id: "p9", privacy: "public", created_at: ago(190), amen_count: 102 },
  { id: "g24", user_id: "u_james", type: "photo", caption: "Bills paid. Pantry full. Wife asleep on the couch.", media_url: square("g24"), privacy: "public", created_at: ago(200), amen_count: 41 },
  { id: "g25", user_id: "u_dev", type: "photo", caption: "My kid hugged me. Said dad. Meant it.", media_url: square("g25"), privacy: "circle", created_at: ago(210), amen_count: 64 },
  { id: "g26", user_id: "u_me", type: "text", caption: "The decision came quiet. I think I know.", bg_color: "oklch(0.86 0.04 250)", privacy: "circle", created_at: ago(220), amen_count: 6 },
  { id: "g27", user_id: "u_lena", type: "photo", caption: "My husband washed every dish. Without a word.", media_url: square("g27"), privacy: "circle", created_at: ago(230), amen_count: 28 },
  { id: "g28", user_id: "u_priya", type: "text", caption: "Forgave her, finally. Felt the weight lift.", bg_color: "oklch(0.8 0.07 140)", privacy: "public", created_at: ago(240), amen_count: 35 },
  { id: "g29", user_id: "u_ruth", type: "voice", caption: "Sang at his graveside. Off-key. He'd have laughed.", media_url: square("g29"), privacy: "public", created_at: ago(250), amen_count: 56 },
  { id: "g30", user_id: "u_aiden", type: "photo", caption: "Sun through a stained glass window. I just stood there.", media_url: square("g30"), privacy: "public", created_at: ago(260), amen_count: 33 },
];

export const walkWithGroups: WalkWithGroup[] = [
  { id: "w1", topic: "Walking through grief", blurb: "For those holding loss. Quiet, gentle, no fixing.", members: 11, facilitator_id: "u_ruth", joined: true, tone: "grief", kind: "faith", cadence: "Wednesdays, 8pm", next_meet: "Wednesday", seats_total: 14, seats_open: 3, covenant: ["What's said here stays here.", "No fixing. We sit before we solve.", "You may pass at any point, always."], door_question: "Who or what are you carrying right now?" },
  { id: "w2", topic: "Praying for a prodigal", blurb: "Parents and spouses of those far from faith.", members: 9, facilitator_id: "u_priya", tone: "prodigal", kind: "faith", cadence: "Sundays, 7pm", next_meet: "Sunday", seats_total: 12, seats_open: 3, covenant: ["No names of the ones we're praying for outside this room.", "Hope out loud, even on the flat days.", "No advice unless it's asked for."], door_question: "Who are you still praying for?" },
  { id: "w3", topic: "Marriage in crisis", blurb: "Confidential. Couples and individuals welcome.", members: 7, facilitator_id: "u_marcus", tone: "marriage", kind: "faith", cadence: "Mondays, 8:30pm", next_meet: "Monday", seats_total: 10, seats_open: 3, covenant: ["We speak about ourselves, not about our spouse.", "Nothing here becomes evidence.", "Either of you may come alone."], door_question: "What would a good week look like?" },
  { id: "w4", topic: "Battling illness", blurb: "For the diagnosed and their caregivers.", members: 12, facilitator_id: "u_maria", joined: true, tone: "illness", kind: "faith", cadence: "Thursdays, 12pm", next_meet: "Thursday", seats_total: 16, seats_open: 4, covenant: ["No medical advice. Presence only.", "Bad days are welcome here.", "Cameras optional, always."], door_question: "What do you need people to understand?" },
  { id: "w5", topic: "Recovery & addiction", blurb: "One day at a time. Anonymity respected.", members: 10, facilitator_id: "u_dev", tone: "addiction", kind: "faith", cadence: "Daily, 6am", next_meet: "tomorrow, 6am", seats_total: 12, seats_open: 2, covenant: ["First names only if that's safer.", "Relapse is not exile.", "Show up honest or show up quiet — just show up."], door_question: "What's your day one, or your day today?" },
  { id: "w6", topic: "Caregivers' rest", blurb: "For those carrying someone else's weight.", members: 8, facilitator_id: "u_lena", tone: "caregivers", kind: "faith", cadence: "Saturdays, 9am", next_meet: "Saturday", seats_total: 12, seats_open: 4, covenant: ["You're allowed to be tired here.", "No guilt talk — yours or anyone's.", "Leave early if you need to. No explanation."], door_question: "Who are you caring for, and who cares for you?" },
  { id: "w7", topic: "Men, unedited", blurb: "Men only. Plain talk about work, fathers, temptation, and fear — without the performance.", members: 13, facilitator_id: "u_james", tone: "mens", kind: "faith", cadence: "Tuesdays, 6am", next_meet: "Tuesday, 6am", seats_total: 16, seats_open: 3, covenant: ["Say the real thing or say nothing.", "No competing. No fixing. No posturing.", "What's said at this table stays at this table."], door_question: "What's the thing you'd normally keep to yourself?" },
  { id: "w8", topic: "The Tuesday Table", blurb: "Neighbors sitting with hard weeks — anyone welcome, just as you are.", members: 15, facilitator_id: "u_aiden", tone: "open", kind: "open", cadence: "Tuesdays, 7pm", next_meet: "Tuesday", seats_total: 20, seats_open: 5, covenant: ["No preaching, no converting, no pressure.", "Everyone gets uninterrupted time.", "Confidential by default."], door_question: "What's been heavy lately?" },
];

export const verifiedNeeds: VerifiedNeed[] = [
  { id: "vn1", title: "Medical bills — the Anderson family", story: "Three rounds of chemo for their daughter. Insurance covered part. Their church verified the gap.", image: square("vn1"), verifier: "Pastor Cole, Hope City Church", target: 18000, raised: 11420, status: "active" },
  { id: "vn2", title: "Funeral costs — the Okafor family", story: "Unexpected loss of a young father of two. Funds go directly to the funeral home.", image: square("vn2"), verifier: "Pastor Adeyemi, Redeemer East", target: 9500, raised: 9500, status: "funded" },
  { id: "vn3", title: "Rent assistance — single mom in recovery", story: "Six months stable. Lost shifts last month. Funds go directly to the landlord.", image: square("vn3"), verifier: "The Bridge Recovery Ministry", target: 4200, raised: 1840, status: "active" },
];

export const partnerMinistries: PartnerMinistry[] = [
  { id: "pm1", name: "Show Hope", description: "Caring for orphans worldwide through adoption support and medical care.", website: "showhope.org", category: "Orphan care" },
  { id: "pm2", name: "Adult & Teen Challenge", description: "Faith-based addiction recovery centers across the country.", website: "teenchallengeusa.org", category: "Recovery" },
  { id: "pm3", name: "Embrace Grace", description: "Walking with single, pregnant young women through the local church.", website: "embracegrace.com", category: "Family" },
  { id: "pm4", name: "Preemptive Love", description: "Frontline relief for families in conflict zones.", website: "preemptivelove.org", category: "Relief" },
  { id: "pm5", name: "Compassion International", description: "Child sponsorship and community development in 25+ countries.", website: "compassion.com", category: "Missions" },
];

export const benevolenceFund = {
  raised_this_quarter: 142880,
  givers: 1947,
  distributed: 128400,
  families_served: 73,
  next_report: "April 1",
};

export const findGratitude = (id: string) => gratitudes.find(g => g.id === id);
export const findWalkGroup = (id: string) => walkWithGroups.find(g => g.id === id);

export function isHeavyPrayer(p: Prayer): boolean {
  return HEAVY_CATEGORIES.includes(p.category);
}

// ============================================================
//  Positivity / Empathy / Helping — new core models
// ============================================================

export type EncouragementTone = "uplift" | "empathy" | "perspective" | "celebration";

export interface Encouragement {
  id: string;
  user_id: string;
  text: string;
  tone: EncouragementTone;
  created_at: string;
  hearts: number;
  reshared: number;
  // optional pointer to a prayer / help / kindness it responds to
  in_response_to?: { kind: "prayer" | "help" | "kindness"; id: string };
}

export type KindnessKind =
  | "stranger" | "neighbor" | "family" | "coworker" | "anonymous" | "self";

export interface KindnessAct {
  id: string;
  user_id: string;
  kind: KindnessKind;
  caption: string;
  image?: string;
  cost_minutes?: number;     // honest effort, not money
  inspired_by_id?: string;   // ripple — another kindness this one came from
  created_at: string;
  cheers: number;
  ripple_count: number;      // how many later acts said they were inspired by this
}

export type HelpCategory =
  | "Meals" | "Rides" | "Childcare" | "Errands" | "Listening ear"
  | "Moving hands" | "Skills" | "Financial" | "Other";

export type HelpStatus = "open" | "matched" | "fulfilled" | "closed";

export interface HelpRequest {
  id: string;
  user_id: string;
  title: string;
  story: string;
  category: HelpCategory;
  location_hint?: string;     // "Austin, TX" — never precise address
  by_when?: string;           // ISO
  privacy: Privacy;
  is_anonymous: boolean;
  status: HelpStatus;
  offers_count: number;
  created_at: string;
}

export interface HelpOffer {
  id: string;
  help_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export const encouragements: Encouragement[] = [
  { id: "e1", user_id: "u_ruth", text: "You're allowed to be tired and still be brave. Both can be true today.", tone: "empathy", created_at: ago(3), hearts: 218, reshared: 41 },
  { id: "e2", user_id: "u_marcus", text: "Small consistent kindness beats one grand gesture. Keep showing up.", tone: "perspective", created_at: ago(11), hearts: 142, reshared: 23 },
  { id: "e3", user_id: "u_priya", text: "If no one has told you today: what you carry is real, and you are not invisible.", tone: "uplift", created_at: ago(22), hearts: 389, reshared: 88, in_response_to: { kind: "prayer", id: "p3" } },
  { id: "e4", user_id: "u_james", text: "Eight months unemployed taught me — people who check in change everything. Be that person.", tone: "perspective", created_at: ago(40), hearts: 96, reshared: 12 },
  { id: "e5", user_id: "u_lena", text: "Cheering for every parent rocking a baby at 3am tonight. You're doing holy, ordinary work.", tone: "celebration", created_at: ago(55), hearts: 174, reshared: 31 },
  { id: "e6", user_id: "u_dev", text: "Day one counts. Day two counts. Nobody's keeping score the way you think.", tone: "uplift", created_at: ago(70), hearts: 312, reshared: 64 },
  { id: "e7", user_id: "u_aiden", text: "Asking for help is not weakness. It's how strangers become a village.", tone: "perspective", created_at: ago(96), hearts: 87, reshared: 19 },
];

export const kindnessActs: KindnessAct[] = [
  { id: "k1", user_id: "u_lena", kind: "stranger", caption: "Paid for the coffee of the woman behind me. She'd been crying in her car.", cost_minutes: 2, created_at: ago(4), cheers: 84, ripple_count: 6 },
  { id: "k2", user_id: "u_james", kind: "neighbor", caption: "Shoveled the elderly couple's driveway across the street before work.", image: square("k2"), cost_minutes: 25, created_at: ago(14), cheers: 47, ripple_count: 3 },
  { id: "k3", user_id: "u_dev", kind: "anonymous", caption: "Left a note on a coworker's desk that said 'I see how hard you're trying.' Didn't sign it.", cost_minutes: 5, inspired_by_id: "k1", created_at: ago(20), cheers: 132, ripple_count: 9 },
  { id: "k4", user_id: "u_priya", kind: "stranger", caption: "Stayed 20 extra minutes with a student who was scared to go home.", cost_minutes: 20, created_at: ago(28), cheers: 201, ripple_count: 14 },
  { id: "k5", user_id: "u_ruth", kind: "neighbor", caption: "Made too much soup on purpose. Brought a jar to the widow next door.", image: square("k5"), cost_minutes: 40, created_at: ago(36), cheers: 78, ripple_count: 4 },
  { id: "k6", user_id: "u_marcus", kind: "stranger", caption: "Gave up my seat on the bus and meant it. Smiled. Said good morning.", cost_minutes: 1, inspired_by_id: "k3", created_at: ago(48), cheers: 33, ripple_count: 2 },
  { id: "k7", user_id: "u_aiden", kind: "self", caption: "Took the walk instead of doom-scrolling. Counts. The world gets a kinder me.", cost_minutes: 30, created_at: ago(60), cheers: 52, ripple_count: 7 },
  { id: "k8", user_id: "u_maria", kind: "family", caption: "Wrote my brother the letter I've owed him for two years. Mailed it before I could chicken out.", cost_minutes: 35, created_at: ago(72), cheers: 114, ripple_count: 11 },
  { id: "k9", user_id: "u_me", kind: "coworker", caption: "Covered a shift for someone whose kid was sick. No big speech.", cost_minutes: 240, created_at: ago(96), cheers: 41, ripple_count: 3 },
  { id: "k10", user_id: "u_lena", kind: "stranger", caption: "Held the door, helped fold the stroller, made the eye contact. Tiny things.", cost_minutes: 3, inspired_by_id: "k4", created_at: ago(120), cheers: 28, ripple_count: 5 },
];

export const helpRequests: HelpRequest[] = [
  { id: "h1", user_id: "u_maria", title: "Meals for our family during chemo weeks", story: "Three kids, one in treatment. Anything dropped off helps — even pizza nights. Tuesdays and Thursdays are hardest.", category: "Meals", location_hint: "Houston, TX", by_when: ago(-14 * 24), privacy: "public", is_anonymous: false, status: "matched", offers_count: 11, created_at: ago(30) },
  { id: "h2", user_id: "u_ruth", title: "Ride to grief group on Wednesdays", story: "I stopped driving after the accident. The group is 20 minutes away. Anyone heading that direction?", category: "Rides", location_hint: "Asheville, NC", privacy: "circle", is_anonymous: false, status: "open", offers_count: 2, created_at: ago(8) },
  { id: "h3", user_id: "u_anon", title: "Just need someone to listen for 20 minutes", story: "Not in crisis. Just lonely and a little lost. Voice or text is fine.", category: "Listening ear", privacy: "public", is_anonymous: true, status: "open", offers_count: 14, created_at: ago(3) },
  { id: "h4", user_id: "u_dev", title: "Help moving a one-bedroom on Saturday", story: "Two flights up. I'll feed you. Sobriety friendly — no alcohol on site.", category: "Moving hands", location_hint: "Portland, OR", by_when: ago(-5 * 24), privacy: "public", is_anonymous: false, status: "open", offers_count: 4, created_at: ago(18) },
  { id: "h5", user_id: "u_priya", title: "After-school pickup for two weeks", story: "Surgery recovery. 3pm pickup, 10 minute drive. Kids are easy.", category: "Childcare", location_hint: "Boston, MA", privacy: "circle", is_anonymous: false, status: "matched", offers_count: 6, created_at: ago(50) },
  { id: "h6", user_id: "u_aiden", title: "Anyone good at résumés? First real job hunt.", story: "First-gen college kid. No idea what I'm doing. Twenty minutes of your time would change mine.", category: "Skills", privacy: "public", is_anonymous: false, status: "open", offers_count: 9, created_at: ago(40) },
  { id: "h7", user_id: "u_lena", title: "Diapers, size 4 — between paychecks", story: "Embarrassed to ask. Won't be again. Two weeks until things settle.", category: "Financial", location_hint: "Nashville, TN", privacy: "circle", is_anonymous: false, status: "fulfilled", offers_count: 3, created_at: ago(96) },
  { id: "h8", user_id: "u_james", title: "Hands for a neighborhood cleanup Saturday", story: "Not for me — for the block. Coffee and donuts on me. Kids welcome.", category: "Other", location_hint: "Newark, NJ", by_when: ago(-6 * 24), privacy: "public", is_anonymous: false, status: "open", offers_count: 7, created_at: ago(12) },
];

export const helpOffers: HelpOffer[] = [
  { id: "ho1", help_id: "h1", user_id: "u_lena", message: "Putting you on our family's Tuesday rotation. Lasagna ok?", created_at: ago(28) },
  { id: "ho2", help_id: "h1", user_id: "u_ruth", message: "I make a soup that freezes well — dropping two quarts this week.", created_at: ago(20) },
  { id: "ho3", help_id: "h3", user_id: "u_marcus", message: "Free tonight after 8. Voice call good?", created_at: ago(2) },
  { id: "ho4", help_id: "h4", user_id: "u_aiden", message: "I'm strong and free Saturday. Just text the address.", created_at: ago(10) },
  { id: "ho5", help_id: "h6", user_id: "u_james", message: "Hiring manager for 15 years. DM me your draft tonight.", created_at: ago(36) },
];

export const findEncouragement = (id: string) => encouragements.find(e => e.id === id);
export const findKindness = (id: string) => kindnessActs.find(k => k.id === id);
export const findHelp = (id: string) => helpRequests.find(h => h.id === id);
export const offersFor = (helpId: string) => helpOffers.filter(o => o.help_id === helpId);

// Aggregate "ripple" stats for the community pulse banner.
export function communityPulse() {
  const cheers = kindnessActs.reduce((s, k) => s + k.cheers, 0);
  const ripples = kindnessActs.reduce((s, k) => s + k.ripple_count, 0);
  const helped = helpRequests.filter(h => h.status === "matched" || h.status === "fulfilled").length;
  const openNeeds = helpRequests.filter(h => h.status === "open").length;
  return { cheers, ripples, helped, openNeeds, acts: kindnessActs.length };
}

export const helpCategoryColor: Record<HelpCategory, string> = {
  Meals: "var(--terracotta)",
  Rides: "var(--brass)",
  Childcare: "var(--sage)",
  Errands: "var(--brass-deep)",
  "Listening ear": "var(--olive)",
  "Moving hands": "var(--ink-soft)",
  Skills: "var(--brass)",
  Financial: "var(--terracotta)",
  Other: "var(--ink-soft)",
};