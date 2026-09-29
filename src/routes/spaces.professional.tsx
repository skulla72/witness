import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, BriefcaseBusiness, ChevronRight, CircleDollarSign, Loader2, Plus, Wrench } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { myProPage, proPlace, rateLine } from "@/lib/pros";
import { ProfileImage } from "@/components/profile-media/ProfileImage";

export const Route = createFileRoute("/spaces/professional")({
  staticData: { sitemap: false },
  component: ProfessionalSpace,
  head: () => ({ meta: [
    { title: `Professional space · ${BRAND.name}` },
    { name: "description", content: "Manage your professional profile, work, reviews, verification, and payments." },
    { property: "og:title", content: `Professional space · ${BRAND.name}` },
    { property: "og:description", content: "Your trade and professional work in one focused place." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function ProfessionalSpace() {
  const { userId, signedIn } = useSession();
  const page = useQuery({ queryKey: ["pros", "mine", userId], queryFn: () => myProPage(userId!), enabled: !!userId });
  const pro = page.data;

  if (signedIn === false) return <div className="px-6 pt-16 text-center"><h1 className="font-serif text-[24px] text-ink">Professional space</h1><p className="mt-2 text-[13px] text-ink-soft">Sign in to open or create your professional page.</p><Link to="/login" search={{ mode: "login", next: "/spaces/professional" }} className="mt-5 inline-flex rounded-md bg-primary px-4 py-2.5 text-[13px] text-primary-foreground">Sign in</Link></div>;

  return (
    <div className="px-5 pb-12 pt-6 md:mx-auto md:max-w-4xl md:px-0 md:pt-10">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Professional space</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Your work</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">Your trade profile, leads, jobs, rates, reviews, and payments live here—not in your personal space.</p>
      </header>
      {page.isLoading ? <div className="grid min-h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-brass" /></div> : !pro ? (
        <section className="mt-7 rounded-lg border border-dashed border-border p-6 text-center">
          <Wrench className="mx-auto h-6 w-6 text-brass" /><h2 className="mt-3 font-serif text-[19px] text-ink">Set up your professional page</h2><p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-soft">Add your trade, service area, rates, and identity check while keeping your personal profile separate.</p><Link to="/pros/new" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] text-primary-foreground"><Plus className="h-4 w-4" /> Create professional page</Link>
        </section>
      ) : (
        <>
          <section className="mt-7 rounded-lg border border-border bg-card p-5 shadow-soft">
             <div className="flex items-start gap-3"><ProfileImage path={pro.photo_url} alt="" className="h-14 w-14 shrink-0" /><div className="min-w-0"><h2 className="font-serif text-[19px] text-ink">{pro.display_name}</h2><p className="text-[11.5px] text-ink-soft">{[pro.trade, proPlace(pro), rateLine(pro)].filter(Boolean).join(" · ")}</p>{pro.id_verified_at && <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-hope"><BadgeCheck className="h-3.5 w-3.5" /> Identity verified</p>}</div></div>
            <Link to="/pros/mine" className="mt-4 flex items-center rounded-md bg-primary px-3 py-2.5 text-[12.5px] text-primary-foreground">Manage professional page <ChevronRight className="ml-auto h-4 w-4" /></Link>
          </section>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SpaceLink to="/pros/leads" Icon={BriefcaseBusiness} title="Leads & jobs" body="See work in your lanes and manage requests." />
            <SpaceLink to="/pros/payments" Icon={CircleDollarSign} title="Payments" body="Track job funds, payouts, and serving hours." />
          </div>
        </>
      )}
    </div>
  );
}

function SpaceLink({ to, Icon, title, body }: { to: "/pros/leads" | "/pros/payments"; Icon: typeof BriefcaseBusiness; title: string; body: string }) {
  return <Link to={to} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-soft"><Icon className="mt-0.5 h-5 w-5 text-brass" /><span><span className="block font-serif text-[16px] text-ink">{title}</span><span className="mt-1 block text-[11.5px] leading-relaxed text-ink-soft">{body}</span></span><ChevronRight className="ml-auto h-4 w-4 text-ink-soft" /></Link>;
}
