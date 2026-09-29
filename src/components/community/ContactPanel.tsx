import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { placeLine, telHref, type Org } from "@/lib/community";

export function ContactPanel({ org, isLeader }: { org: Org; isLeader: boolean }) {
  const [editing, setEditing] = useState(false);
  const { signedIn } = useSession();

  // Street address plus contact email/phone are only readable by signed-in people.
  const contactQuery = useQuery({
    queryKey: ["community", "org-contact", org.id],
    enabled: signedIn === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("contact_email, contact_phone, address")
        .eq("id", org.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? { contact_email: null, contact_phone: null, address: null };
    },
  });

  const contactPhone = contactQuery.data?.contact_phone ?? null;
  const contactEmail = contactQuery.data?.contact_email ?? null;
  const address = contactQuery.data?.address ?? null;

  const rows = [
    address || placeLine(org)
      ? {
          key: "where",
          icon: <MapPin className="h-4 w-4 text-brass" />,
          label: "Where to find us",
          value: address || placeLine(org),
          href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            [org.name, address, placeLine(org)].filter(Boolean).join(" "),
          )}`,
        }
      : null,

    contactPhone
      ? {
          key: "phone",
          icon: <Phone className="h-4 w-4 text-brass" />,
          label: "Call",
          value: contactPhone,
          href: telHref(contactPhone),
        }
      : null,
    contactEmail
      ? {
          key: "email",
          icon: <Mail className="h-4 w-4 text-brass" />,
          label: "Email",
          value: contactEmail,
          href: `mailto:${contactEmail}`,
        }
      : null,

    org.website
      ? {
          key: "web",
          icon: <Globe className="h-4 w-4 text-brass" />,
          label: "Website",
          value: org.website.replace(/^https?:\/\//, ""),
          href: org.website,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    href: string;
  }[];

  if (editing) {
    return (
      <ContactForm
        org={org}
        initialAddress={address}
        initialPhone={contactPhone}
        initialEmail={contactEmail}
        onDone={() => setEditing(false)}
      />
    );
  }



  return (
    <section className="space-y-3">
      {rows.map(r => (
        <a
          key={r.key}
          href={r.href}
          target={r.href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer noopener"
          className="tap-scale flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <span className="mt-0.5 shrink-0">{r.icon}</span>
          <span className="min-w-0">
            <span className="block text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              {r.label}
            </span>
            <span className="mt-1 block break-words text-[13.5px] text-ink">{r.value}</span>
          </span>
        </a>
      ))}

      {rows.length === 0 && signedIn !== true && (
        <p className="text-[13px] text-ink-soft">Sign in to see how to reach this community.</p>
      )}

      {rows.length === 0 && signedIn === true && (
        <p className="text-[13px] text-ink-soft">No contact details listed yet.</p>
      )}

      {isLeader && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="tap-scale flex w-full items-center gap-2 rounded-2xl border border-brass/30 bg-brass/10 p-4 text-left"
        >
          <Pencil className="h-4 w-4 text-brass" />
          <span className="text-[13.5px] text-ink">Edit contact details</span>
        </button>
      )}
    </section>
  );
}

function ContactForm({
  org,
  initialAddress,
  initialPhone,
  initialEmail,
  onDone,
}: {
  org: Org;
  initialAddress: string | null;
  initialPhone: string | null;
  initialEmail: string | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [address, setAddress] = useState(initialAddress ?? "");

  const [phone, setPhone] = useState(initialPhone ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [website, setWebsite] = useState(org.website ?? "");


  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("organizations")
        .update({
          address: address.trim(),
          contact_phone: phone.trim() || null,
          contact_email: email.trim() || null,
          website: website.trim() || null,
        })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community"] });
      onDone();
    },
  });

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-3 rounded-2xl border border-border bg-card p-4"
    >
      <input
        value={address}
        onChange={e => setAddress(e.target.value)}
        placeholder="Street address"
        maxLength={200}
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Phone"
        maxLength={40}
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        maxLength={200}
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <input
        value={website}
        onChange={e => setWebsite(e.target.value)}
        placeholder="https://"
        maxLength={300}
        className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="tap-scale inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] text-primary-foreground disabled:opacity-60"
        >
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-border px-4 py-2 text-[13px] text-ink-soft"
        >
          Cancel
        </button>
      </div>
      {save.isError && <p className="text-[12px] text-destructive">That didn't save. Try again.</p>}
    </form>
  );
}
