import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myRoles } from "@/lib/prayers";
import { money } from "@/lib/stripe";
import {
  SPONSORS,
  allGrants,
  deleteGrant,
  grantOrgs,
  grantTotals,
  grantorName,
  saveGrant,
  statusLabel,
  type Grant,
  type GrantStatus,
} from "@/lib/grants";

export const Route = createFileRoute("/admin/grants")({
  staticData: { sitemap: false },
  component: AdminGrants,
  head: () => ({
    meta: [
      { title: `DAF grants (team) · ${BRAND.name}` },
      {
        name: "description",
        content: "Team tools: record each donor-advised fund grant so it counts as real support on the nonprofit's page.",
      },
      { property: "og:title", content: `DAF grants (team) · ${BRAND.name}` },
      { property: "og:description", content: "Record donor-advised fund grants and see them per nonprofit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const field =
  "mt-1 w-full rounded-xl border border-border bg-paper px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft/60";
const label = "text-[10px] uppercase tracking-[0.16em] text-ink-soft";
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function AdminGrants() {
  const { userId, signedIn } = useSession();
  const rolesQ = useQuery({ queryKey: ["roles", userId], queryFn: () => myRoles(userId!), enabled: !!userId });
  const isAdmin = (rolesQ.data ?? []).includes("admin");

  const grantsQ = useQuery({ queryKey: ["daf-grants"], queryFn: allGrants, enabled: isAdmin });
  const orgsQ = useQuery({ queryKey: ["grant-orgs"], queryFn: grantOrgs, enabled: isAdmin });

  const [editing, setEditing] = useState<Grant | "new" | null>(null);
  const [orgFilter, setOrgFilter] = useState<string>("all");

  const orgName = useMemo(() => {
    const map = new Map<string, string>();
    (orgsQ.data ?? []).forEach(o => map.set(o.id, o.name));
    return map;
  }, [orgsQ.data]);

  if (signedIn === false || (rolesQ.isSuccess && !isAdmin)) {
    return (
      <div className="px-6 pt-16 text-center">
        <p className="font-serif text-[22px] text-ink">Team only.</p>
        <Link to="/giving" className="mt-5 inline-block text-[13px] text-brass">
          Back to giving
        </Link>
      </div>
    );
  }

  const rows = (grantsQ.data ?? []).filter(g => orgFilter === "all" || g.org_id === orgFilter);
  const totals = grantTotals(rows);

  return (
    <div className="pb-16">
      <div className="px-4 pt-3">
        <Link to="/giving" className="inline-flex items-center gap-1 text-[13px] text-ink-soft">
          <ArrowLeft className="h-4 w-4" /> Giving
        </Link>
      </div>

      <header className="px-5 pt-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Team</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Donor-advised fund grants</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Grants arrive by check or transfer from a sponsor, not through checkout. Record each one here and it shows up as
          real support on that nonprofit's giving page once it's marked received.
        </p>
      </header>

      <section className="mt-5 px-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Received" value={money(totals.receivedCents)} />
          <Stat label="Expected" value={money(totals.expectedCents)} />
          <Stat label="Grants" value={String(totals.count)} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} className={`${field} mt-0 flex-1`}>
            <option value="all">All nonprofits</option>
            {(orgsQ.data ?? []).map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setEditing("new")}
            className="tap-scale inline-flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[13px] font-medium text-paper"
          >
            <Plus className="h-4 w-4" /> Record
          </button>
        </div>
      </section>

      {grantsQ.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-6 px-5 text-[13px] leading-relaxed text-ink-soft">
          No grants recorded yet. Add the first one and it will count on the nonprofit's page.
        </p>
      ) : (
        <section className="mt-4 space-y-2 px-4">
          {rows.map(g => (
            <GrantRow key={g.id} grant={g} orgName={orgName.get(g.org_id) ?? "Unknown"} onEdit={() => setEditing(g)} />
          ))}
        </section>
      )}

      {editing && (
        <GrantForm
          grant={editing === "new" ? null : editing}
          orgs={orgsQ.data ?? []}
          defaultOrg={orgFilter === "all" ? "" : orgFilter}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Stat({ label: l, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-2.5 text-center">
      <p className="font-serif text-[16px] text-ink">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-ink-soft">{l}</p>
    </div>
  );
}

function GrantRow({ grant, orgName, onEdit }: { grant: Grant; orgName: string; onEdit: () => void }) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteGrant(grant.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf-grants"] });
      qc.invalidateQueries({ queryKey: ["org-grants", grant.org_id] });
      toast.success("Grant removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-serif text-[17px] text-ink">{money(grant.amount_cents)}</p>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">{orgName}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
            grant.status === "received" ? "bg-hope/15 text-hope" : "bg-secondary text-ink-soft"
          }`}
        >
          {statusLabel[grant.status as GrantStatus] ?? grant.status}
        </span>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-soft">
        {grant.sponsor || "Sponsor not noted"}
        {grant.fund_name ? ` · ${grant.fund_name}` : ""} · {grantorName(grant)} ·{" "}
        {DATE.format(new Date(`${grant.granted_on}T12:00:00`))}
      </p>
      {grant.reference && <p className="mt-1 text-[11.5px] text-ink-soft">Ref {grant.reference}</p>}
      {grant.note && <p className="mt-1.5 text-[12px] italic leading-snug text-ink">{grant.note}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-paper px-3 py-1.5 text-[12.5px] text-ink"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        <button
          onClick={() => remove.mutate()}
          disabled={remove.isPending}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-paper px-3 py-1.5 text-[12.5px] text-ink-soft"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}

function GrantForm({
  grant,
  orgs,
  defaultOrg,
  onClose,
}: {
  grant: Grant | null;
  orgs: Array<{ id: string; name: string }>;
  defaultOrg: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState(grant?.org_id ?? defaultOrg);
  const [sponsor, setSponsor] = useState(grant?.sponsor ?? SPONSORS[0]);
  const [fundName, setFundName] = useState(grant?.fund_name ?? "");
  const [donorName, setDonorName] = useState(grant?.donor_name ?? "");
  const [anonymous, setAnonymous] = useState(grant?.anonymous ?? false);
  const [publicCredit, setPublicCredit] = useState(grant?.public_credit ?? false);
  const [amount, setAmount] = useState(grant ? (grant.amount_cents / 100).toFixed(2) : "");
  const [grantedOn, setGrantedOn] = useState(grant?.granted_on ?? today());
  const [status, setStatus] = useState<GrantStatus>((grant?.status as GrantStatus) ?? "received");
  const [note, setNote] = useState(grant?.note ?? "");
  const [reference, setReference] = useState(grant?.reference ?? "");

  const save = useMutation({
    mutationFn: () => {
      const cents = Math.round(Number(amount) * 100);
      if (!orgId) throw new Error("Pick which nonprofit the grant is for.");
      if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter the grant amount.");
      return saveGrant({
        id: grant?.id,
        org_id: orgId,
        sponsor,
        fund_name: fundName.trim(),
        donor_name: donorName.trim(),
        anonymous,
        public_credit: publicCredit && !anonymous,
        amount_cents: cents,
        granted_on: grantedOn,
        status,
        note: note.trim(),
        reference: reference.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf-grants"] });
      qc.invalidateQueries({ queryKey: ["org-grants", orgId] });
      toast.success(grant ? "Grant updated" : "Grant recorded");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="font-serif text-[20px] text-ink">{grant ? "Edit grant" : "Record a grant"}</p>
          <button onClick={onClose} aria-label="Close" className="rounded-full border border-border p-1.5 text-ink-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className={label}>Nonprofit</p>
            <select value={orgId} onChange={e => setOrgId(e.target.value)} className={field}>
              <option value="">Pick one</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={label}>Amount (USD)</p>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="1000.00"
                className={field}
              />
            </div>
            <div>
              <p className={label}>Date granted</p>
              <input type="date" value={grantedOn} onChange={e => setGrantedOn(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <p className={label}>Sponsor</p>
            <select value={sponsor} onChange={e => setSponsor(e.target.value)} className={field}>
              {SPONSORS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={label}>Fund name</p>
            <input
              value={fundName}
              onChange={e => setFundName(e.target.value)}
              placeholder="The Skalla Family Fund"
              className={field}
            />
          </div>

          <div>
            <p className={label}>Advisor / donor name</p>
            <input
              value={donorName}
              onChange={e => setDonorName(e.target.value)}
              disabled={anonymous}
              placeholder="Michael Skalla"
              className={`${field} ${anonymous ? "opacity-50" : ""}`}
            />
            <label className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-soft">
              <input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} />
              Keep the donor quiet on the nonprofit's page
            </label>
            <label className="mt-2 flex items-start gap-2 text-[12.5px] text-ink-soft">
              <input
                type="checkbox"
                checked={publicCredit}
                disabled={anonymous}
                onChange={e => setPublicCredit(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                This donor said we may name them publicly. Leave it off and only the
                nonprofit's leaders see who gave.
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className={label}>Status</p>
              <select value={status} onChange={e => setStatus(e.target.value as GrantStatus)} className={field}>
                <option value="received">Received</option>
                <option value="expected">Expected</option>
              </select>
            </div>
            <div>
              <p className={label}>Check / grant ref</p>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="#40219" className={field} />
            </div>
          </div>

          <div>
            <p className={label}>Note (team only)</p>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={field} />
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-soft">
            Only grants marked received are counted on the nonprofit's page. The tax deduction happened when the donor
            funded their sponsor account, so no receipt is sent from here.
          </p>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="tap-scale w-full rounded-xl bg-ink py-2.5 text-[13px] font-medium text-paper disabled:opacity-60"
          >
            {save.isPending ? "Saving…" : grant ? "Save changes" : "Record grant"}
          </button>
        </div>
      </div>
    </div>
  );
}
