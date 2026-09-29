import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  ANONYMOUS_NAME,
  ENGRAVING_MAX,
  LOCK_DAYS,
  SIZES,
  type GiftOption,
  type Ledger,
  type Selection,
  type Tier,
} from "@/lib/perks";

type Env = "sandbox" | "live";
type Db = SupabaseClient<Database>;
const UUID = /^[0-9a-fA-F-]{36}$/;

function assertEnv(environment: unknown): asserts environment is Env {
  if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");
}

export interface GiftPick {
  earnedTier: Tier;
  qualifiedAt: string;
  locksAt: string;
  /** Past the lock: a choice, once made, is final. */
  locked: boolean;
  selection: Selection | null;
}

export interface LedgerView {
  ledger: Ledger;
  total: number;
  /** Highest rung first. */
  picks: GiftPick[];
}

export interface MyStanding {
  tiers: Tier[];
  options: GiftOption[];
  sender: LedgerView;
  goer: LedgerView;
  hoursSelf: number;
  /** A/B options this person already received (or has on order) — never offered twice. */
  receivedOptionIds: string[];
}

interface LedgerTotals {
  total: number;
  /** When the running total first crossed each tier's threshold. */
  crossings: Map<string, string>;
}

/** Walk the ledger in time order and note when each rung was crossed. */
function crossingsFor(ladder: Tier[], events: { at: string; amount: number }[]): LedgerTotals {
  const crossings = new Map<string, string>();
  let running = 0;
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  for (const e of sorted) {
    running += e.amount;
    for (const t of ladder) {
      if (!crossings.has(t.id) && running >= Number(t.threshold)) crossings.set(t.id, e.at);
    }
  }
  // Refunds or edits can pull a total back under a rung; only rungs still met count.
  for (const t of ladder) if (running < Number(t.threshold)) crossings.delete(t.id);
  return { total: running, crossings };
}

async function loadLedgers(supabase: Db, userId: string, environment: Env) {
  const [{ data: tiers }, { data: options }, { data: gifts }, { data: hours }, { data: badge }] = await Promise.all([
    supabase.from("tiers").select("*").order("threshold", { ascending: true }),
    supabase.from("gift_options").select("*"),
    supabase
      .from("donations")
      .select("amount_cents, refunded_cents, created_at")
      .eq("user_id", userId)
      .eq("status", "paid")
      .eq("environment", environment),
    supabase
      .from("service_hours")
      .select("hours, verified_at, created_at")
      .eq("user_id", userId)
      .eq("status", "verified"),
    supabase.from("serving_badges").select("hours_self").eq("user_id", userId).maybeSingle(),
  ]);
  const allTiers = (tiers ?? []) as Tier[];
  const senderLadder = allTiers.filter(t => t.ledger === "sender");
  const goerLadder = allTiers.filter(t => t.ledger === "goer");

  const sender = crossingsFor(
    senderLadder,
    (gifts ?? []).map(g => ({ at: g.created_at, amount: (g.amount_cents - (g.refunded_cents ?? 0)) / 100 })),
  );
  const goer = crossingsFor(
    goerLadder,
    (hours ?? []).map(h => ({ at: h.verified_at ?? h.created_at, amount: Number(h.hours) })),
  );
  return { tiers: allTiers, options: (options ?? []) as GiftOption[], sender, goer, hoursSelf: Number(badge?.hours_self ?? 0) };
}

function locksAtFor(qualifiedAt: string): string {
  return new Date(new Date(qualifiedAt).getTime() + LOCK_DAYS * 86_400_000).toISOString();
}

function buildView(ledger: Ledger, tiers: Tier[], totals: LedgerTotals, selections: Selection[], now: number): LedgerView {
  const picks: GiftPick[] = tiers
    .filter(t => t.ledger === ledger && t.gifts && totals.crossings.has(t.id))
    .map(t => {
      const qualifiedAt = totals.crossings.get(t.id)!;
      const locksAt = locksAtFor(qualifiedAt);
      return {
        earnedTier: t,
        qualifiedAt,
        locksAt,
        locked: new Date(locksAt).getTime() <= now,
        selection: selections.find(s => s.earned_tier_id === t.id) ?? null,
      };
    })
    .sort((a, b) => Number(b.earnedTier.threshold) - Number(a.earnedTier.threshold));
  return { ledger, total: totals.total, picks };
}

/**
 * Both ledgers for the signed-in person: totals, the rungs they've crossed,
 * and what they chose for each. Choices whose 14 days have passed are moved
 * to "ordered" here so the team can act on them.
 */
export const getMyStanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: Env }) => {
    assertEnv(data.environment);
    return data;
  })
  .handler(async ({ data, context }): Promise<MyStanding> => {
    const { supabase, userId } = context;
    const ledgers = await loadLedgers(supabase, userId, data.environment);
    const { data: selRows } = await supabase.from("selections").select("*").eq("user_id", userId);
    let selections = (selRows ?? []) as Selection[];
    const nowIso = new Date().toISOString();
    const now = Date.now();

    const toLock = selections.filter(s => s.status === "pending" && s.locks_at <= nowIso).map(s => s.id);
    if (toLock.length > 0 || ledgers.sender.total > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (toLock.length > 0) {
        await supabaseAdmin.from("selections").update({ status: "ordered" }).in("id", toLock);
        selections = selections.map(s => (toLock.includes(s.id) ? { ...s, status: "ordered" } : s));
      }
      if (ledgers.sender.total > 0) {
        await supabaseAdmin.from("profiles").update({ has_given: true }).eq("user_id", userId).eq("has_given", false);
      }
    }

    return {
      tiers: ledgers.tiers,
      options: ledgers.options,
      sender: buildView("sender", ledgers.tiers, ledgers.sender, selections, now),
      goer: buildView("goer", ledgers.tiers, ledgers.goer, selections, now),
      hoursSelf: ledgers.hoursSelf,
      receivedOptionIds: selections.filter(s => s.slot !== "C" && s.status !== "declined").map(s => s.option_id),
    };
  });

export interface ChooseGiftInput {
  environment: Env;
  earnedTierId: string;
  optionId: string;
  anonymous?: boolean;
  shipping_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  size?: string;
  engraving_text?: string;
}

const clean = (v: string | undefined, max: number) => (v ?? "").trim().slice(0, max);

/** Pick (or change) the thank-you gift for one rung. Every rule is checked here, not in the browser. */
export const chooseGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ChooseGiftInput) => {
    assertEnv(data.environment);
    if (!UUID.test(data.earnedTierId) || !UUID.test(data.optionId)) throw new Error("Invalid choice");
    if ((data.engraving_text ?? "").length > ENGRAVING_MAX) throw new Error(`Engraving is limited to ${ENGRAVING_MAX} characters`);
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true; selection: Selection } | { error: string }> => {
    const { supabase, userId } = context;
    const ledgers = await loadLedgers(supabase, userId, data.environment);
    const earned = ledgers.tiers.find(t => t.id === data.earnedTierId);
    if (!earned || !earned.gifts) return { error: "That rung doesn't carry a gift." };
    const ledger = earned.ledger as Ledger;
    const crossedAt = ledgers[ledger].crossings.get(earned.id);
    if (!crossedAt) return { error: "You haven't reached that rung yet." };

    const option = ledgers.options.find(o => o.id === data.optionId);
    const optionTier = option ? ledgers.tiers.find(t => t.id === option.tier_id) : undefined;
    if (!option || !optionTier) return { error: "That gift isn't available." };
    if (optionTier.ledger !== ledger || Number(optionTier.threshold) > Number(earned.threshold)) {
      return { error: "You can choose a gift from this rung or any rung below it." };
    }
    if (option.slot !== "C" && !option.active) return { error: "That gift hasn't been announced yet." };

    const { data: selRows } = await supabase.from("selections").select("*").eq("user_id", userId);
    const selections = (selRows ?? []) as Selection[];
    const existing = selections.find(s => s.earned_tier_id === earned.id) ?? null;
    const locksAt = locksAtFor(crossedAt);
    const locked = new Date(locksAt).getTime() <= Date.now();
    if (existing && (existing.status === "ordered" || existing.status === "shipped" || (locked && existing.status !== "declined"))) {
      return { error: "This choice is locked — the team is already on it." };
    }
    if (option.slot !== "C") {
      const already = selections.some(s => s.option_id === option.id && s.status !== "declined" && s.earned_tier_id !== earned.id);
      if (already) return { error: "You already received that one. Pick the other gift, or send it to the mission." };
    }

    const row: Database["public"]["Tables"]["selections"]["Insert"] = {
      user_id: userId,
      ledger,
      earned_tier_id: earned.id,
      tier_id: optionTier.id,
      option_id: option.id,
      slot: option.slot,
      anonymous: !!data.anonymous,
      shipping_name: null, address_1: null, address_2: null, city: null, state: null, zip: null,
      size: null, engraving_text: null,
      fmv_at_selection: option.slot === "C" ? 0 : Number(option.fmv),
      status: locked ? "ordered" : "pending",
      qualified_at: crossedAt,
      locks_at: locksAt,
    };

    if (option.slot !== "C") {
      if (option.requires_shipping) {
        row.shipping_name = clean(data.shipping_name, 80);
        row.address_1 = clean(data.address_1, 120);
        row.address_2 = clean(data.address_2, 120) || null;
        row.city = clean(data.city, 80);
        row.state = clean(data.state, 40);
        row.zip = clean(data.zip, 16);
        if (!row.shipping_name || !row.address_1 || !row.city || !row.state || !row.zip) {
          return { error: "We need a name and full address to send it." };
        }
      }
      if (option.requires_size) {
        const size = clean(data.size, 6);
        if (!(SIZES as readonly string[]).includes(size)) return { error: "Pick a size." };
        row.size = size;
      }
      if (option.requires_engraving) {
        const text = clean(data.engraving_text, ENGRAVING_MAX);
        if (!text) return { error: "Tell us what to engrave." };
        row.engraving_text = text;
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: saved, error } = await supabaseAdmin
      .from("selections")
      .upsert(row, { onConflict: "user_id,earned_tier_id" })
      .select("*")
      .single();
    if (error || !saved) return { error: "We couldn't save that choice. Try again." };

    // The public wall: a lit candle for the mission, a plain mark for a gift.
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle();
    const name = row.anonymous ? ANONYMOUS_NAME : profile?.display_name?.trim() || ANONYMOUS_NAME;
    await supabaseAdmin.from("gift_wall").upsert(
      { selection_id: saved.id, user_id: userId, display_name: name, ledger, kind: option.slot === "C" ? "candle" : "gift" },
      { onConflict: "selection_id" },
    );

    // Senders get the FMV / no-goods tax receipt by email. Goers never do —
    // service hours are not deductible. Email failure never blocks the choice.
    if (ledger === "sender") {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const email = authUser.user?.email;
        if (email) {
          const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
          await sendTemplateEmail("gift-receipt", email, {
            templateData: {
              donorName: name === ANONYMOUS_NAME ? "Friend" : name,
              tierName: earned.name,
              giftLabel: option.slot === "C" ? "" : option.label,
              slot: option.slot,
              fmv: Number(row.fmv_at_selection ?? 0),
            },
            idempotencyKey: `gift-receipt-${saved.id}`,
          });
        }
      } catch (err) {
        console.error("Gift receipt email failed:", err);
      }
    }

    return { ok: true, selection: saved as Selection };
  });

/** Pass on a rung's gift entirely. Allowed while the choice is still open. */
export const passOnGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { selectionId: string }) => {
    if (!UUID.test(data.selectionId)) throw new Error("Invalid choice");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase, userId } = context;
    const { data: sel } = await supabase.from("selections").select("*").eq("id", data.selectionId).maybeSingle();
    if (!sel || sel.user_id !== userId) return { error: "We couldn't find that choice." };
    if (sel.status !== "pending" || sel.locks_at <= new Date().toISOString()) return { error: "This choice is locked." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("selections").update({ status: "declined" }).eq("id", sel.id);
    await supabaseAdmin.from("gift_wall").delete().eq("selection_id", sel.id);
    return { ok: true };
  });

// ===== Team (admin) =====

async function requireAdmin(supabase: Db, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

export interface AdminSelection extends Selection {
  name: string;
  tier_name: string;
  tier_threshold: number;
  option_label: string;
}

export const adminGiftCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ tiers: Tier[]; options: GiftOption[]; selections: AdminSelection[] }> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const [{ data: tiers }, { data: options }, { data: sels }] = await Promise.all([
      supabase.from("tiers").select("*").order("threshold", { ascending: true }),
      supabase.from("gift_options").select("*"),
      supabase.from("selections").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    const ids = Array.from(new Set((sels ?? []).map(s => s.user_id)));
    const { data: people } = ids.length
      ? await supabase.rpc("member_cards", { _ids: ids })
      : { data: [] as { user_id: string; display_name: string | null }[] };
    const names = new Map((people ?? []).map(p => [p.user_id, p.display_name?.trim() || "Member"]));
    const tierById = new Map((tiers ?? []).map(t => [t.id, t]));
    const optById = new Map((options ?? []).map(o => [o.id, o]));
    return {
      tiers: (tiers ?? []) as Tier[],
      options: (options ?? []) as GiftOption[],
      selections: ((sels ?? []) as Selection[]).map(s => ({
        ...s,
        name: names.get(s.user_id) ?? "Member",
        tier_name: tierById.get(s.tier_id)?.name ?? "",
        tier_threshold: Number(tierById.get(s.tier_id)?.threshold ?? 0),
        option_label: optById.get(s.option_id)?.label ?? "",
      })),
    };
  });

export interface OptionPatch {
  id: string;
  label?: string;
  description?: string;
  image_url?: string | null;
  fmv?: number;
  est_cost_to_org?: number;
  impact_copy?: string;
  requires_shipping?: boolean;
  requires_size?: boolean;
  requires_engraving?: boolean;
  active?: boolean;
}

export const adminSaveOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: OptionPatch) => {
    if (!UUID.test(data.id)) throw new Error("Invalid option");
    if (data.label !== undefined && data.label.length > 80) throw new Error("Name is too long");
    if (data.description !== undefined && data.description.length > 600) throw new Error("Description is too long");
    if (data.impact_copy !== undefined && data.impact_copy.length > 300) throw new Error("Impact copy is too long");
    for (const k of ["fmv", "est_cost_to_org"] as const) {
      const v = data[k];
      if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 10_000_000)) throw new Error("Amount is out of range");
    }
    if (data.image_url && !/^https:\/\/[^\s]{1,500}$/.test(data.image_url)) throw new Error("Photo must be an https link");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { id } = data;
    // Only these fields can ever be written here — anything else in the
    // request is dropped.
    const patch: Omit<OptionPatch, "id"> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.description !== undefined) patch.description = data.description;
    if (data.image_url !== undefined) patch.image_url = data.image_url;
    if (data.fmv !== undefined) patch.fmv = data.fmv;
    if (data.est_cost_to_org !== undefined) patch.est_cost_to_org = data.est_cost_to_org;
    if (data.impact_copy !== undefined) patch.impact_copy = data.impact_copy;
    if (data.requires_shipping !== undefined) patch.requires_shipping = data.requires_shipping;
    if (data.requires_size !== undefined) patch.requires_size = data.requires_size;
    if (data.requires_engraving !== undefined) patch.requires_engraving = data.requires_engraving;
    if (data.active !== undefined) patch.active = data.active;
    const { data: current } = await supabase.from("gift_options").select("slot").eq("id", id).maybeSingle();
    if (!current) throw new Error("Option not found");
    // C is fixed: always present, always on, never a shipped item.
    if (current.slot === "C") {
      delete patch.active; delete patch.requires_shipping; delete patch.requires_size; delete patch.requires_engraving; delete patch.fmv;
    }
    const { error } = await supabase.from("gift_options").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id?: string; ledger: Ledger; threshold: number; name: string; gifts: boolean }) => {
    if (data.id && !UUID.test(data.id)) throw new Error("Invalid tier");
    if (data.ledger !== "sender" && data.ledger !== "goer") throw new Error("Invalid ledger");
    if (!Number.isFinite(data.threshold) || data.threshold <= 0 || data.threshold > 1_000_000_000) throw new Error("Threshold is out of range");
    if (data.name.length > 60) throw new Error("Name is too long");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    if (data.id) {
      const { error } = await supabase.from("tiers").update({ name: data.name.trim(), threshold: data.threshold }).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { count } = await supabase.from("tiers").select("id", { count: "exact", head: true }).eq("ledger", data.ledger);
      const { error } = await supabase.from("tiers").insert({
        ledger: data.ledger, threshold: data.threshold, name: data.name.trim(), gifts: data.gifts, sort_order: (count ?? 0) + 1,
      });
      if (error) throw new Error(error.code === "23505" ? "There's already a rung at that number." : error.message);
    }
    return { ok: true };
  });

export const adminSetSelectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; status: Selection["status"] }) => {
    if (!UUID.test(data.id)) throw new Error("Invalid selection");
    if (!["pending", "ordered", "shipped", "declined"].includes(data.status)) throw new Error("Invalid status");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("selections").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.status === "declined") await supabaseAdmin.from("gift_wall").delete().eq("selection_id", data.id);
    return { ok: true };
  });
