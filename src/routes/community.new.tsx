import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { ORG_KINDS, slugify } from "@/lib/community";
import { readChurchDraft } from "@/lib/churchSignup";

export const Route = createFileRoute("/community/new")({
  staticData: { sitemap: false },
  component: NewOrg,
  validateSearch: (s: Record<string, unknown>): { kind?: string } =>
    typeof s.kind === "string" && ["church", "ministry", "nonprofit", "community"].includes(s.kind) ? { kind: s.kind } : {},
  head: () => ({
    meta: [
      { title: "Add your church or organization · Witness" },
      {
        name: "description",
        content:
          "Create a page for your church, ministry, nonprofit or community group, then run groups and post events for people nearby.",
      },
      { property: "og:title", content: "Add your organization · Witness" },
      {
        property: "og:description",
        content: "A page of your own, with groups people can join and events they can come to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function NewOrg() {
  const navigate = useNavigate();
  const { userId, signedIn } = useSession();
  const [name, setName] = useState("");
  const search = Route.useSearch();
  const [kind, setKind] = useState<string>(search.kind ?? "church");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Carried over from the films page, so a church doesn't type it all twice.
  const [needWaiting, setNeedWaiting] = useState(false);

  useEffect(() => {
    const draft = readChurchDraft();
    if (!draft) return;
    if (draft.name) setName(draft.name);
    if (draft.city) setCity(draft.city);
    if (draft.region) setRegion(draft.region);
    if (draft.need.trim()) setNeedWaiting(true);
  }, []);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    const base = slugify(name) || "organization";
    const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: insertError } = await supabase.from("organizations").insert({
      owner_id: userId,
      slug,
      name: name.trim(),
      kind,
      city: city.trim(),
      region: region.trim(),
      description: description.trim(),
      website: website.trim() || null,
    });
    setSaving(false);
    if (insertError) {
      setError("We couldn't save that. Check the details and try once more.");
      return;
    }
    if (needWaiting) {
      // They already wrote down the need; take them straight to posting it.
      navigate({ to: "/hire", search: { lane: undefined } });
      return;
    }
    navigate({ to: "/community/$slug", params: { slug } });
  }

  return (
    <div className="px-5 pt-5 pb-12">
      <Link
        to="/community"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Community
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">A page of your own</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">
          Add your church or organization
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Only what people need to decide whether to walk in. You can add groups and events on the
          next screen.
        </p>
      </header>

      {needWaiting && (
        <div className="mb-6 rounded-2xl border border-hope/40 bg-hope/10 p-4">
          <p className="font-serif text-[15.5px] text-ink">We kept what you wrote</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            Save this page and we'll take you straight to the need you described, already filled in.
          </p>
        </div>
      )}


      {signedIn === false && (
        <div className="mb-6 rounded-2xl border border-brass/30 bg-brass/10 p-4">
          <p className="font-serif text-[15.5px] text-ink">Sign in first</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            We need to know who's responsible for the page.
          </p>
          <a
            href={`/login?mode=signup&next=${encodeURIComponent(`/community/new${search.kind ? `?kind=${search.kind}` : ""}`)}`}
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
          >
            Create account or sign in
          </a>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Grace Chapel"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
          />
        </Field>

        <div>
          <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            What kind of place is this?
          </p>
          <div className="space-y-2">
            {ORG_KINDS.map(k => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`tap-scale block w-full rounded-xl border p-3 text-left ${
                  kind === k.key ? "border-brass/50 bg-brass/10" : "border-border bg-card"
                }`}
              >
                <span className="block text-[13.5px] text-ink">{k.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-ink-soft">{k.note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="City">
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Denver"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
            />
          </Field>
          <Field label="State">
            <input
              value={region}
              onChange={e => setRegion(e.target.value)}
              placeholder="CO"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
            />
          </Field>
        </div>

        <Field label="Website (optional)">
          <input
            value={website}
            onChange={e => setWebsite(e.target.value)}
            placeholder="https://"
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-soft"
          />
        </Field>

        <Field label="In a few sentences, who are you?">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder="When you gather, where, and who tends to show up."
            className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-soft"
          />
        </Field>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving || !name.trim() || signedIn !== true}
          className="tap-scale inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create the page
        </button>

        <p className="text-center text-[11.5px] text-ink-soft">
          You'll be the owner. Verification comes later, after a real person checks the details.
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
