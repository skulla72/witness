import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, CircleDollarSign, Loader2, Plus, Settings, Users } from "lucide-react";
import { BRAND } from "@/config/brand";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { ORG_PUBLIC_COLUMNS, kindLabel, placeLine, type Org } from "@/lib/community";
import { ProfileImage } from "@/components/profile-media/ProfileImage";

export const Route = createFileRoute("/spaces/organization")({
  staticData: { sitemap: false },
  component: OrganizationSpace,
  head: () => ({ meta: [
    { title: `Organization space · ${BRAND.name}` },
    { name: "description", content: "Manage your organization pages, people, needs, giving, and payments." },
    { property: "og:title", content: `Organization space · ${BRAND.name}` },
    { property: "og:description", content: "Your organization work in one focused place." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type OrgMembership = { role: string; organizations: Org | null };

function OrganizationSpace() {
  const { userId, signedIn } = useSession();
  const pages = useQuery({
    queryKey: ["organization-space", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`role, organizations(${ORG_PUBLIC_COLUMNS})`)
        .eq("user_id", userId!);
      if (error) throw error;
      return (data as unknown as OrgMembership[]).filter(row => row.organizations);
    },
    enabled: !!userId,
  });

  if (signedIn === false) return <SignedOut />;

  return (
    <div className="px-5 pb-12 pt-6 md:mx-auto md:max-w-4xl md:px-0 md:pt-10">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Organization space</p>
        <h1 className="mt-2 font-serif text-[30px] leading-tight text-ink">Your organizations</h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-soft">Pages, groups, needs, giving, people, and payments stay together here—separate from your personal space.</p>
      </header>

      {pages.isLoading ? (
        <div className="grid min-h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-brass" /></div>
      ) : (pages.data?.length ?? 0) === 0 ? (
        <section className="mt-7 rounded-lg border border-dashed border-border p-6 text-center">
          <Building2 className="mx-auto h-6 w-6 text-brass" />
          <h2 className="mt-3 font-serif text-[19px] text-ink">Set up an organization page</h2>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-soft">Create a page for an organization, nonprofit, church, or ministry. Your personal account stays connected.</p>
          <Link to="/community/new" className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] text-primary-foreground"><Plus className="h-4 w-4" /> Create a page</Link>
        </section>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {pages.data?.map(({ role, organizations: org }) => org && (
            <article key={org.id} className="rounded-lg border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                 <ProfileImage path={org.logo_url} alt="" organization className="h-14 w-14 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[18px] text-ink">{org.name}</p>
                  <p className="text-[11px] text-ink-soft">{kindLabel(org.kind)}{placeLine(org) ? ` · ${placeLine(org)}` : ""} · {role}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/community/dashboard/$slug" params={{ slug: org.slug }} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2.5 text-[12px] text-primary-foreground"><CircleDollarSign className="h-4 w-4" /> Dashboard</Link>
                <Link to="/community/manage/$slug" params={{ slug: org.slug }} className="flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-[12px] text-ink"><Settings className="h-4 w-4" /> Manage</Link>
                <Link to="/community/$slug" params={{ slug: org.slug }} className="col-span-2 flex items-center gap-2 rounded-md border border-border px-3 py-2.5 text-[12px] text-ink"><Users className="h-4 w-4" /> View public page <ChevronRight className="ml-auto h-4 w-4" /></Link>
              </div>
            </article>
          ))}
          <Link to="/community/new" className="grid min-h-44 place-items-center rounded-lg border border-dashed border-border p-5 text-center text-ink-soft"><span><Plus className="mx-auto h-5 w-5 text-brass" /><span className="mt-2 block text-[13px]">Add another organization</span></span></Link>
        </div>
      )}
    </div>
  );
}

function SignedOut() {
  return <div className="px-6 pt-16 text-center"><h1 className="font-serif text-[24px] text-ink">Organization space</h1><p className="mt-2 text-[13px] text-ink-soft">Sign in to open or create your organization pages.</p><Link to="/login" search={{ mode: "login", next: "/spaces/organization" }} className="mt-5 inline-flex rounded-md bg-primary px-4 py-2.5 text-[13px] text-primary-foreground">Sign in</Link></div>;
}
