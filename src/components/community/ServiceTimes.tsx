import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DAYS, serviceWhen, type OrgService } from "@/lib/community";

export function useServices(orgId: string | undefined) {
  return useQuery({
    queryKey: ["community", "services", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_services")
        .select("*")
        .eq("org_id", orgId!)
        .order("day_of_week")
        .order("sort");
      if (error) throw error;
      return data as OrgService[];
    },
  });
}

export function ServiceTimes({ orgId, isLeader }: { orgId: string; isLeader: boolean }) {
  const services = useServices(orgId);
  const qc = useQueryClient();

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("organization_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "services"] }),
  });

  return (
    <section className="space-y-3">
      {isLeader && <NewServiceForm orgId={orgId} />}

      {services.isLoading && <p className="text-[13px] text-ink-soft">Loading…</p>}

      {(services.data ?? []).map(s => (
        <div key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <p className="font-serif text-[16px] leading-tight text-ink">{s.label}</p>
              <p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-soft">
                <Clock className="h-3.5 w-3.5" /> {serviceWhen(s)}
              </p>
              {s.note && (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{s.note}</p>
              )}
            </div>
            {isLeader && (
              <button
                type="button"
                onClick={() => remove.mutate(s.id)}
                aria-label={`Remove ${s.label}`}
                className="ml-auto shrink-0 rounded-full border border-border p-1.5 text-ink-soft"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {!services.isLoading && (services.data?.length ?? 0) === 0 && (
        <p className="text-[13px] text-ink-soft">No service times listed yet.</p>
      )}
    </section>
  );
}

function NewServiceForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("organization_services").insert({
        org_id: orgId,
        label: label.trim(),
        day_of_week: day,
        time_text: time.trim(),
        note: note.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      setTime("");
      setNote("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["community", "services"] });
    },
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-scale flex w-full items-center gap-2 rounded-2xl border border-brass/30 bg-brass/10 p-4 text-left"
      >
        <Plus className="h-4 w-4 text-brass" />
        <span className="text-[13.5px] text-ink">Add a service time</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        create.mutate();
      }}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <input
        required
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Sunday Worship"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={day}
          onChange={e => setDay(Number(e.target.value))}
          aria-label="Day of the week"
          className="rounded-xl border border-border bg-paper px-3 py-2.5 text-[12.5px] text-ink"
        >
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
        <input
          required
          value={time}
          onChange={e => setTime(e.target.value)}
          placeholder="9:00 AM"
          aria-label="Time"
          className="rounded-xl border border-border bg-paper px-3 py-2.5 text-[12.5px] text-ink outline-none placeholder:text-ink-soft"
        />
      </div>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Anything people should know"
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-soft"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={create.isPending || !label.trim() || !time.trim()}
          className="tap-scale inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Add time
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-border px-4 py-2 text-[13px] text-ink-soft"
        >
          Cancel
        </button>
      </div>
      {create.isError && <p className="text-[12px] text-destructive">That didn't save. Try again.</p>}
    </form>
  );
}
