import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { BRAND } from "@/config/brand";
import { ORG_PUBLIC_COLUMNS, type Org } from "@/lib/community";

export const Route = createFileRoute("/join/$slug")({
  staticData: { sitemap: false },
  component: Join,
  head: () => ({
    meta: [
      { title: `You're invited · ${BRAND.name}` },
      { name: "description", content: "Join your church or organization on Witness — pray, help and give together." },
      { property: "og:title", content: `You're invited to ${BRAND.name}` },
      { property: "og:description", content: "Join your church or organization on Witness in one step." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Join() {
  const { slug } = Route.useParams();
  const { userId, signedIn } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const org = useQuery({
    queryKey: ["org", slug],
    queryFn: async (): Promise<Org | null> => {
      const { data } = await supabase.from("organizations").select(ORG_PUBLIC_COLUMNS).eq("slug", slug).maybeSingle();
      return (data as Org) ?? null;
    },
  });

  const member = useQuery({
    queryKey: ["org", "role", org.data?.id, userId],
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("role")
        .eq("org_id", org.data!.id).eq("user_id", userId!).maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!org.data?.id && !!userId,
  });

  const join = async () => {
    if (!org.data || !userId) return;
    setBusy(true);
    const { error } = await supabase.from("organization_members")
      .insert({ org_id: org.data.id, user_id: userId, role: "member" });
    setBusy(false);
    if (error && error.code !== "23505") return toast.error("Couldn't join just now. Try again.");
    toast.success(`Welcome to ${org.data.name}.`);
    navigate({ to: "/community/$slug", params: { slug } });
  };

  if (org.isLoading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-4 w-4 animate-spin text-ink-soft" /></div>;
  if (!org.data) return <p className="p-8 text-center text-[13px] text-ink-soft">This invite link isn't active.</p>;

  if (typeof window !== "undefined" && signedIn === false) {
    try { localStorage.setItem("witness.pendingJoin", slug); } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-12 text-center">
      <Users className="mx-auto h-6 w-6 text-brass" />
      <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-ink-soft">You're invited</p>
      <h1 className="mt-2 font-serif text-[28px] leading-tight text-ink">{org.data.name}</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
        Share what you're carrying, stand with the people around you, and see what changes — together.
      </p>
      {signedIn === false && (
        <Link to="/login" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-[13px] text-paper">
          Create an account or sign in
        </Link>
      )}
      {signedIn && member.data && (
        <Link to="/community/$slug" params={{ slug }} className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-[13px] text-paper">
          You're already in — open the page
        </Link>
      )}
      {signedIn && member.isFetched && !member.data && (
        <button onClick={join} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13px] text-paper">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Join {org.data.name}
        </button>
      )}
    </div>
  );
}
