import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { STATUS_LABEL, formatMoney, formatThreshold, tiersFor, type GiftOption, type Ledger, type Tier } from "@/lib/perks";
import { adminGiftCatalog, adminSaveOption, adminSaveTier, adminSetSelectionStatus, type AdminSelection, type OptionPatch } from "@/lib/perks.functions";

export const Route = createFileRoute("/admin/gifts")({
  staticData: { sitemap: false },
  component: AdminGifts,
  head: () => ({
    meta: [
      { title: `Gift catalog (team) · ${BRAND.name}` },
      { name: "description", content: "Team tools: fill in the thank-you gifts for each rung and work the order queue." },
      { property: "og:title", content: `Gift catalog (team) · ${BRAND.name}` },
      { property: "og:description", content: "Team-only gift catalog and order queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const field = "mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60";

function AdminGifts() {
  const { userId, signedIn } = useSession();
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isAdmin = (rolesQ.data ?? []).includes("admin");
  const catalogQ = useQuery({ queryKey: ["gift-catalog"], queryFn: () => adminGiftCatalog(), enabled: isAdmin });
  const [ledger, setLedger] = useState<Ledger>("sender");

  if (signedIn === false || (rolesQ.isSuccess && !isAdmin)) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Team only.</p>
        <Link to="/perks" className="mt-5 inline-block text-[13px] text-brass">Back to thank-you gifts</Link>
      </div>
    );
  }

  const cat = catalogQ.data;
  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/perks" className="inline-flex items-center gap-1 text-[13px] text-ink-soft"><ArrowLeft className="h-4 w-4" /> Thank-you gifts</Link>
      </div>
      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Team</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Gift catalog &amp; orders</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Fill in Gift A and Gift B for each rung and switch them on. Option C is fixed. Choices lock 14 days after the qualifying gift and land here as orders.
        </p>
      </header>

      {!cat ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-ink-soft" /></div>
      ) : (
        <>
          <OrderQueue rows={cat.selections} />

          <section className="mt-8 px-4">
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["sender", "goer"] as const).map(l => (
                <button key={l} onClick={() => setLedger(l)} className={`rounded-xl py-2 text-[13px] font-medium ${ledger === l ? "bg-ink text-paper" : "border border-border bg-paper text-ink-soft"}`}>
                  {l === "sender" ? "Sender tiers (dollars)" : "Goer tiers (hours)"}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {tiersFor(cat.tiers, ledger).map(t => (
                <TierEditor key={t.id} tier={t} options={cat.options.filter(o => o.tier_id === t.id)} />
              ))}
            </div>
            <AddTier ledger={ledger} />
          </section>
        </>
      )}
    </div>
  );
}

function OrderQueue({ rows }: { rows: AdminSelection[] }) {
  const qc = useQueryClient();
  const set = useMutation({
    mutationFn: (v: { id: string; status: AdminSelection["status"] }) => adminSetSelectionStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gift-catalog"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const open = rows.filter(r => r.status === "ordered" || r.status === "pending");
  const done = rows.filter(r => r.status === "shipped").slice(0, 12);
  const line = (r: AdminSelection) => (
    <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13.5px] text-ink"><span className="font-medium">{r.name}</span> · {r.option_label}{r.slot === "C" ? " (mission)" : ""}</p>
          <p className="text-[11px] text-ink-soft">
            {r.ledger === "sender" ? "Sender" : "Goer"} · {r.tier_name} {formatThreshold(r.ledger as Ledger, r.tier_threshold)} · {STATUS_LABEL[r.status]} · locks {new Date(r.locks_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {r.ledger === "sender" && r.slot !== "C" ? ` · FMV ${formatMoney(Number(r.fmv_at_selection))}` : ""}
          </p>
          {r.slot !== "C" && (
            <p className="mt-1 text-[12px] text-ink">
              {r.shipping_name ? `${r.shipping_name}, ${r.address_1}${r.address_2 ? `, ${r.address_2}` : ""}, ${r.city}, ${r.state} ${r.zip}` : "No shipping needed"}
              {r.size ? ` · size ${r.size}` : ""}{r.engraving_text ? ` · engrave "${r.engraving_text}"` : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {r.status !== "shipped" && r.slot !== "C" && <button onClick={() => set.mutate({ id: r.id, status: "shipped" })} className="rounded-full bg-ink px-3 py-1 text-[11px] text-paper">Shipped</button>}
          {r.status === "pending" && <button onClick={() => set.mutate({ id: r.id, status: "ordered" })} className="rounded-full border border-border px-3 py-1 text-[11px] text-ink-soft">Order now</button>}
          {r.status === "shipped" && <button onClick={() => set.mutate({ id: r.id, status: "ordered" })} className="text-[11px] text-brass">Undo</button>}
        </div>
      </div>
    </div>
  );
  return (
    <section className="mt-6 px-4">
      <h2 className="mb-1 px-1 font-serif text-[13px] uppercase tracking-[0.18em] text-ink-soft">Orders</h2>
      <p className="mb-3 px-1 text-[11.5px] text-ink-soft">"Choice open" can still change until it locks. Mission choices need no shipping.</p>
      {open.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-[12.5px] text-ink-soft">Nothing waiting.</p>
      ) : (
        <div className="space-y-2">{open.map(line)}</div>
      )}
      {done.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">Recently shipped</p>
          <div className="space-y-2">{done.map(line)}</div>
        </div>
      )}
    </section>
  );
}

function TierEditor({ tier, options }: { tier: Tier; options: GiftOption[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(tier.name);
  const ledger = tier.ledger as Ledger;
  const saveTier = useMutation({
    mutationFn: () => adminSaveTier({ data: { id: tier.id, ledger, threshold: Number(tier.threshold), name, gifts: tier.gifts } }),
    onSuccess: () => { toast.success("Saved."); qc.invalidateQueries({ queryKey: ["gift-catalog"] }); qc.invalidateQueries({ queryKey: ["tiers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const ready = options.filter(o => o.slot !== "C" && o.active).length;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between gap-2 text-left">
        <span>
          <span className="font-serif text-[16px] text-ink">{tier.name || "Unnamed"} <span className="text-ink-soft">· {formatThreshold(ledger, Number(tier.threshold))}</span></span>
          <span className="block text-[11px] text-ink-soft">{tier.gifts ? `${ready} of 2 gifts ready · C always on` : "Recognition only — no gift"}</span>
        </span>
        <span className="text-[12px] text-brass">{open ? "Close" : "Edit"}</span>
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          <label className="block"><span className="text-[11px] text-ink-soft">Rung name</span>
            <div className="flex gap-2">
              <input value={name} onChange={e => setName(e.target.value.slice(0, 60))} className={field} />
              <button onClick={() => saveTier.mutate()} className="mt-1 shrink-0 rounded-xl bg-ink px-3 text-[12px] text-paper">Save</button>
            </div>
          </label>
          {tier.gifts && ["A", "B", "C"].map(slot => {
            const o = options.find(x => x.slot === slot);
            return o ? <OptionEditor key={o.id} option={o} ledger={ledger} /> : null;
          })}
        </div>
      )}
    </div>
  );
}

function OptionEditor({ option, ledger }: { option: GiftOption; ledger: Ledger }) {
  const qc = useQueryClient();
  const isC = option.slot === "C";
  const [f, setF] = useState({
    label: option.label, description: option.description, image_url: option.image_url ?? "",
    fmv: String(option.fmv), est_cost_to_org: String(option.est_cost_to_org), impact_copy: option.impact_copy,
    requires_shipping: option.requires_shipping, requires_size: option.requires_size, requires_engraving: option.requires_engraving, active: option.active,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      const patch: OptionPatch = {
        id: option.id, label: f.label.trim(), description: f.description.trim(), image_url: f.image_url.trim() || null,
        fmv: Number(f.fmv) || 0, est_cost_to_org: Number(f.est_cost_to_org) || 0, impact_copy: f.impact_copy.trim(),
        requires_shipping: f.requires_shipping, requires_size: f.requires_size, requires_engraving: f.requires_engraving, active: f.active,
      };
      return adminSaveOption({ data: patch });
    },
    onSuccess: () => { toast.success(`Option ${option.slot} saved.`); qc.invalidateQueries({ queryKey: ["gift-catalog"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className={`rounded-xl border p-3 ${isC ? "border-brass/40 bg-brass/5" : "border-border bg-paper"}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-brass">Option {option.slot}{isC ? " · fixed" : ""}</p>
      {!isC && (
        <>
          <label className="mt-2 block"><span className="text-[11px] text-ink-soft">Name</span><input value={f.label} onChange={e => set("label", e.target.value.slice(0, 80))} className={field} /></label>
          <label className="mt-2 block"><span className="text-[11px] text-ink-soft">Photo (https link)</span><input value={f.image_url} onChange={e => set("image_url", e.target.value.slice(0, 500))} className={field} placeholder="https://…" /></label>
        </>
      )}
      <label className="mt-2 block"><span className="text-[11px] text-ink-soft">Description</span><textarea value={f.description} onChange={e => set("description", e.target.value.slice(0, 600))} rows={2} className={`${field} resize-none`} /></label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {!isC && <label className="block"><span className="text-[11px] text-ink-soft">Fair market value ($)</span><input value={f.fmv} onChange={e => set("fmv", e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className={field} /></label>}
        <label className="block"><span className="text-[11px] text-ink-soft">Cost to the mission ($)</span><input value={f.est_cost_to_org} onChange={e => set("est_cost_to_org", e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" className={field} /></label>
      </div>
      <label className="mt-2 block">
        <span className="text-[11px] text-ink-soft">{isC ? `Impact copy shown on the C card${ledger === "goer" ? " (no dollar figures for Goers)" : " (blank = written from Gift A/B cost)"}` : "Impact copy (optional)"}</span>
        <textarea value={f.impact_copy} onChange={e => set("impact_copy", e.target.value.slice(0, 300))} rows={2} className={`${field} resize-none`} />
      </label>
      {!isC && (
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-ink">
          {([["requires_shipping", "Needs shipping"], ["requires_size", "Needs a size"], ["requires_engraving", "Engravable"], ["active", "Live (shown to people)"]] as const).map(([k, l]) => (
            <label key={k} className="inline-flex items-center gap-1.5"><input type="checkbox" checked={f[k]} onChange={e => set(k, e.target.checked)} /> {l}</label>
          ))}
        </div>
      )}
      <button onClick={() => save.mutate()} disabled={save.isPending} className="mt-3 rounded-full bg-ink px-3.5 py-1.5 text-[12px] text-paper disabled:opacity-50">Save option {option.slot}</button>
    </div>
  );
}

function AddTier({ ledger }: { ledger: Ledger }) {
  const qc = useQueryClient();
  const [threshold, setThreshold] = useState("");
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: () => adminSaveTier({ data: { ledger, threshold: Number(threshold), name, gifts: true } }),
    onSuccess: () => { toast.success("Rung added with its three slots."); setThreshold(""); setName(""); qc.invalidateQueries({ queryKey: ["gift-catalog"] }); qc.invalidateQueries({ queryKey: ["tiers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-border p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Add a rung above the top</p>
      <div className="mt-2 flex gap-2">
        <input value={threshold} onChange={e => setThreshold(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder={ledger === "sender" ? "Dollars" : "Hours"} className={field} />
        <input value={name} onChange={e => setName(e.target.value.slice(0, 60))} placeholder="Name" className={field} />
        <button onClick={() => add.mutate()} disabled={!threshold || add.isPending} className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-xl bg-ink px-3 text-[12px] text-paper disabled:opacity-50"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
      <p className="mt-2 text-[11px] text-ink-soft">The ladder never caps — add the next rung whenever someone gets close.</p>
    </div>
  );
}
