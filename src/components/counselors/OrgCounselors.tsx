import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { linkOrgCounselor, listCounselors, orgCounselors, unlinkOrgCounselor } from "@/lib/counselors";

/** Public list of the counselors an organization points people to. */
export function OrgCounselorList({ orgId }: { orgId: string }) {
  const q = useQuery({ queryKey: ["org", "counselors", orgId], queryFn: () => orgCounselors(orgId) });
  if (!q.data?.length) return null;
  return (
    <section>
      <h2 className="px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">Counselors we trust</h2>
      <div className="mt-2 space-y-2">
        {q.data.map(c => (
          <Link key={c.id} to="/counselor/$slug" params={{ slug: c.slug }} className="tap-scale block rounded-2xl border border-border bg-card p-3">
            <p className="font-serif text-[15px] text-ink">{c.display_name}</p>
            <p className="inline-flex items-center gap-1 text-[11px] text-hope"><BadgeCheck className="h-3 w-3" /> {c.license_type} · License verified</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Owner tool: add or remove verified counselors on the organization page. */
export function OrgCounselorManager({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const linked = useQuery({ queryKey: ["org", "counselors", orgId], queryFn: () => orgCounselors(orgId) });
  const found = useQuery({ queryKey: ["counselors", "pick", term], queryFn: () => listCounselors({ term }), enabled: term.trim().length > 1 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["org", "counselors", orgId] });
  const ids = new Set((linked.data ?? []).map(c => c.id));

  return (
    <div className="mt-3 space-y-2">
      {(linked.data ?? []).map(c => (
        <div key={c.id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-[12.5px] text-ink">
          {c.display_name}
          <button onClick={async () => { try { await unlinkOrgCounselor(orgId, c.id); await refresh(); } catch { toast.error("Couldn't remove."); } }} className="text-[11.5px] text-ink-soft underline">Remove</button>
        </div>
      ))}
      <input value={term} onChange={e => setTerm(e.target.value)} placeholder="Find a verified counselor by name" className="w-full rounded-xl border border-border bg-paper px-3 py-2 text-[12.5px] text-ink placeholder:text-ink-soft" />
      {(found.data ?? []).filter(c => !ids.has(c.id)).map(c => (
        <button key={c.id} onClick={async () => { try { await linkOrgCounselor(orgId, c.id); await refresh(); setTerm(""); toast.success("Added to your page."); } catch { toast.error("Couldn't add."); } }} className="block w-full rounded-xl border border-border px-3 py-2 text-left text-[12.5px] text-ink">
          + {c.display_name} · {c.license_type}, {c.license_state}
        </button>
      ))}
      <p className="text-[11px] text-ink-soft">Your own counselor isn't listed? Send them to <Link to="/counselors/new" className="text-brass underline">create a page</Link> — once our team checks their license, you can add them here.</p>
    </div>
  );
}
