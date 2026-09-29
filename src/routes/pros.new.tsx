import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { RATE_KINDS, TRADES, createProPage, saveProPhone } from "@/lib/pros";

export const Route = createFileRoute("/pros/new")({
  staticData: { sitemap: false },
  component: NewPro,
  head: () => ({
    meta: [
      { title: `Set up your professional page · ${BRAND.name}` },
      {
        name: "description",
        content:
          "Tell people what you do, where you work and what you charge. Our team looks at every page before it goes live.",
      },
      { property: "og:title", content: `Set up your professional page · ${BRAND.name}` },
      { property: "og:description", content: "A page for your trade, with the hours you've served on it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function NewPro() {
  const navigate = useNavigate();
  const { userId, signedIn } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [trade, setTrade] = useState<string>("Handyman");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [rate, setRate] = useState("");
  const [rateKind, setRateKind] = useState<string>("hourly");
  const [servesFree, setServesFree] = useState(false);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const pro = await createProPage(userId!, {
        display_name: displayName.trim(),
        trade,
        headline: headline.trim(),
        about: about.trim(),
        service_area: serviceArea.trim(),
        city: city.trim(),
        region: region.trim(),
        rate_cents: Math.max(0, Math.round(Number(rate) || 0) * 100),
        rate_kind: rateKind,
        serves_free: servesFree,
        website: website.trim(),
        photo_url: null,
      });
      if (phone.trim()) await saveProPhone(pro.id, phone);
      return pro;
    },
    onSuccess: () => {
      toast.success("Sent in. Our team will look at it shortly.");
      navigate({ to: "/pros/mine" });
    },
    onError: () => toast.error("We couldn't save that. Try once more."),
  });

  return (
    <div className="px-5 pt-5 pb-14">
      <Link to="/pros" className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
        <ArrowLeft className="h-3.5 w-3.5" /> Professionals
      </Link>

      <header className="mt-4 mb-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Your work</p>
        <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">Set up your page</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Our team reads every page before it goes live, and you'll need an identity check before
          anyone can hire you. Free while we're getting started.
        </p>
      </header>

      {signedIn === false && (
        <div className="mb-6 rounded-2xl border border-brass/30 bg-brass/10 p-4">
          <p className="font-serif text-[15.5px] text-ink">Sign in first</p>
          <a
            href="/login?mode=signup&next=%2Fpros%2Fnew"
            className="mt-3 inline-flex rounded-full bg-primary px-4 py-2 text-[12.5px] text-primary-foreground"
          >
            Create account or sign in
          </a>
        </div>
      )}

      <form
        onSubmit={e => {
          e.preventDefault();
          if (userId) create.mutate();
        }}
        className="space-y-5"
      >
        <Field label="Name people will see">
          <input
            required
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Miller & Sons Roofing"
            className={input}
          />
        </Field>

        <Field label="What you do">
          <select value={trade} onChange={e => setTrade(e.target.value)} className={input}>
            {TRADES.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="One line about your work">
          <input
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder="Twenty years of roofs, and I answer my own phone."
            className={input}
          />
        </Field>

        <Field label="Tell people more">
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            rows={4}
            placeholder="How you work, what you won't cut corners on, who you've helped."
            className={input}
          />
        </Field>

        <div className="grid grid-cols-[1fr_88px] gap-3">
          <Field label="City">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Nashville" className={input} />
          </Field>
          <Field label="State">
            <input value={region} onChange={e => setRegion(e.target.value)} placeholder="TN" className={input} />
          </Field>
        </div>

        <Field label="How far you travel">
          <input
            value={serviceArea}
            onChange={e => setServiceArea(e.target.value)}
            placeholder="45 minutes from downtown"
            className={input}
          />
        </Field>

        <div className="grid grid-cols-[100px_1fr] gap-3">
          <Field label="Price">
            <input
              value={rate}
              onChange={e => setRate(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="75"
              inputMode="numeric"
              className={input}
            />
          </Field>
          <Field label="Charged as">
            <select value={rateKind} onChange={e => setRateKind(e.target.value)} className={input}>
              {RATE_KINDS.map(k => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setServesFree(v => !v)}
          className={`tap-scale block w-full rounded-xl border p-3 text-left ${
            servesFree ? "border-brass/50 bg-brass/10" : "border-border bg-card"
          }`}
        >
          <span className="block text-[13.5px] text-ink">I sometimes give the work away</span>
          <span className="mt-0.5 block text-[11.5px] text-ink-soft">
            Hours you serve for free show on your page as hours, never as dollars.
          </span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(615) 555-0134" className={input} />
          </Field>
          <Field label="Website">
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className={input} />
          </Field>
        </div>

        <button
          type="submit"
          disabled={create.isPending || !displayName.trim() || signedIn !== true}
          className="tap-scale inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-[14px] text-primary-foreground disabled:opacity-50"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send it in
        </button>
      </form>
    </div>
  );
}

const input =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-soft";

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
