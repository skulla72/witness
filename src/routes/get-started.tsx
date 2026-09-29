import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Church, ChevronRight, HandHeart, HeartHandshake, Hammer, UserRound } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { BRAND } from "@/config/brand";

export const Route = createFileRoute("/get-started")({
  staticData: { sitemap: false },
  component: GetStarted,
  head: () => ({ meta: [
    { title: `Choose how to begin · ${BRAND.name}` },
    { name: "description", content: "Use one Witness account for your personal profile, organization, professional work, or counseling page." },
    { property: "og:title", content: `Choose how to begin · ${BRAND.name}` },
    { property: "og:description", content: "One account, with the pages you need." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

const choices = [
  { path: "/setup", Icon: UserRound, title: "Personal", body: "Share what you're carrying, encourage people, and join circles." },
  { path: "/community/new?kind=community", Icon: Building2, title: "Organization", body: "Create an organization page inside your separate Organization space." },
  { path: "/community/new?kind=nonprofit", Icon: HandHeart, title: "Nonprofit", body: "Create a giving page inside your separate Organization space." },
  { path: "/community/new?kind=church", Icon: Church, title: "Church", body: "Set up groups, events, and needs inside your Organization space." },
  { path: "/pros/new", Icon: Hammer, title: "Subcontractor", body: "Create your trade page inside your separate Professional space." },
  { path: "/counselors/new", Icon: HeartHandshake, title: "Counselor", body: "A licensed counselor page, reviewed before it goes live." },
];

function GetStarted() {
  const { signedIn } = useSession();
  const hrefFor = (path: string) =>
    signedIn === false ? `/login?mode=signup&next=${encodeURIComponent(path)}` : path;
  return (
    <div className="px-5 pb-12 pt-8 md:mx-auto md:max-w-2xl md:px-0">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">One account</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">How would you like to begin?</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">Choose where to begin. One account opens your Personal, Organization, and Professional spaces, while keeping their work separate.</p>
      </header>
      <div className="mt-7 grid gap-3 md:grid-cols-2">
        {choices.map(({ path, Icon, title, body }) => (
          <a key={title} href={hrefFor(path)} className="tap-scale flex min-h-32 items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brass" strokeWidth={1.7} />
            <span className="min-w-0">
              <span className="block font-serif text-[18px] text-ink">{title}</span>
              <span className="mt-1 block text-[12px] leading-relaxed text-ink-soft">{body}</span>
            </span>
            <ChevronRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-ink-soft" />
          </a>
        ))}
      </div>
      <Link to="/" className="mt-7 block text-center text-[12.5px] text-ink-soft underline decoration-border underline-offset-4">Go to my home instead</Link>
    </div>
  );
}