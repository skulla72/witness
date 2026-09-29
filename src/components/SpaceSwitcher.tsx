import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, HeartHandshake, LogOut, UserRound, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppSpace, type AppSpace } from "@/hooks/useAppSpace";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type SwitchableIdentity = {
  id: string;
  label: string;
  detail: string;
  space: AppSpace;
  to: "/" | "/spaces/organization" | "/spaces/professional" | "/community/dashboard/$slug" | "/pros/mine" | "/counselors/mine";
  params?: { slug: string };
  Icon: typeof UserRound;
};

async function ownedIdentities(userId: string): Promise<SwitchableIdentity[]> {
  const [profileResult, organizationResult, proResult, counselorResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    supabase.from("organization_members").select("org_id, organizations(id, slug, name, kind)").eq("user_id", userId),
    supabase.from("pro_profiles").select("id, display_name, trade").eq("user_id", userId).maybeSingle(),
    supabase.from("counselor_profiles").select("id, display_name").eq("user_id", userId).maybeSingle(),
  ]);

  const error = profileResult.error ?? organizationResult.error ?? proResult.error ?? counselorResult.error;
  if (error) throw error;

  const profileName = profileResult.data?.display_name?.trim() || "Personal";
  const identities: SwitchableIdentity[] = [{
    id: `personal:${userId}`,
    label: profileName,
    detail: "Personal",
    space: "personal",
    to: "/",
    Icon: UserRound,
  }];

  const seenOrganizations = new Set<string>();
  for (const membership of organizationResult.data ?? []) {
    const organization = membership.organizations as { id: string; slug: string; name: string; kind: string } | null;
    if (!organization || seenOrganizations.has(organization.id)) continue;
    seenOrganizations.add(organization.id);
    identities.push({
      id: `organization:${organization.id}`,
      label: organization.name,
      detail: organization.kind === "church" ? "Church" : organization.kind === "nonprofit" ? "Nonprofit" : "Organization",
      space: "organization",
      to: "/community/dashboard/$slug",
      params: { slug: organization.slug },
      Icon: Building2,
    });
  }

  if (proResult.data) {
    identities.push({
      id: `professional:${proResult.data.id}`,
      label: proResult.data.display_name,
      detail: proResult.data.trade || "Professional",
      space: "professional",
      to: "/pros/mine",
      Icon: Wrench,
    });
  }

  if (counselorResult.data) {
    identities.push({
      id: `counselor:${counselorResult.data.id}`,
      label: counselorResult.data.display_name,
      detail: "Counselor",
      space: "professional",
      to: "/counselors/mine",
      Icon: HeartHandshake,
    });
  }

  return identities;
}

export function SpaceSwitcher({ compact = false }: { compact?: boolean }) {
  const { space, setSpace } = useAppSpace();
  const { userId } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const identities = useQuery({
    queryKey: ["account-identities", userId],
    queryFn: () => ownedIdentities(userId ?? ""),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const choices = identities.data ?? [];
  const canSwitch = choices.length > 1;
  const current = choices.find(item => item.space === space) ?? choices[0];
  const actionLabel = canSwitch ? "Switch user" : "Sign out";

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    setSpace("personal");
    await supabase.auth.signOut();
    queryClient.clear();
    void navigate({ to: "/login" });
  };

  return (
    <div ref={wrap} className="relative">
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon" : "default"}
        onClick={() => setOpen(value => !value)}
        className={`rounded-full bg-card text-ink shadow-soft ${compact ? "" : "min-h-11 w-full justify-start px-3 text-[13px]"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={actionLabel}
        title={compact ? actionLabel : undefined}
      >
        {compact ? (
          <UserRound className="h-4 w-4 text-brass" strokeWidth={1.7} />
        ) : (
          <>
            {current ? <current.Icon className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.7} /> : <UserRound className="h-4 w-4 shrink-0 text-brass" strokeWidth={1.7} />}
            <span className="hidden min-w-0 truncate lg:inline">{current?.label ?? actionLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-ink-soft" />
          </>
        )}
      </Button>
      {open && (
        <div role="menu" className={`absolute z-50 mt-2 min-w-52 overflow-hidden rounded-lg border border-border bg-card p-1.5 shadow-lift ${compact ? "right-0" : "left-0"}`}>
          {canSwitch && (
            <>
              <div className="px-3 pb-1.5 pt-1 text-[10px] uppercase tracking-wide text-ink-soft">Switch user</div>
              {choices.map(({ id, label, detail, space: nextSpace, to, params, Icon }) => (
                <Link
                  key={id}
                  to={to}
                  params={params}
                  onClick={() => { setSpace(nextSpace); setOpen(false); }}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-ink-soft hover:bg-secondary/70 hover:text-ink"
                  role="menuitem"
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink">{label}</span>
                    <span className="block truncate text-[10px]">{detail}</span>
                  </span>
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => void signOut()}
            className="h-auto w-full justify-start gap-3 px-3 py-2.5 text-[13px] font-normal text-ink-soft"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.6} />
            <span>Sign out</span>
          </Button>
        </div>
      )}
    </div>
  );
}
