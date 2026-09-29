import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";
import { getMyBetaAccess, redeemBetaInvitation } from "@/lib/beta-access.functions";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/config/brand";

export function BetaAccessGate() {
  const { pathname } = useLocation();
  const { userId, signedIn } = useSession();
  const [status, setStatus] = useState<"checking" | "active" | "blocked">("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!BRAND.inviteOnly) return;
    if (signedIn === undefined) return;
    if (!userId) {
      setStatus("blocked");
      return;
    }
    let live = true;
    const check = async () => {
      try {
        const access = await getMyBetaAccess();
        if (access.active) {
          if (live) setStatus("active");
          return;
        }
        const token = window.localStorage.getItem("witness_beta_invite");
        if (token) {
          const result = await redeemBetaInvitation({ data: { token } });
          if (result.ok) {
            window.localStorage.removeItem("witness_beta_invite");
            if (live) setStatus("active");
            return;
          }
          if (live) setMessage(result.error);
        }
        if (live) setStatus("blocked");
      } catch {
        if (live) {
          setMessage("We could not confirm your beta access. Please try again.");
          setStatus("blocked");
        }
      }
    };
    void check();
    return () => { live = false; };
  }, [signedIn, userId]);

  const publicAuthPage = pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/terms" || pathname === "/privacy";
  if (!BRAND.inviteOnly || publicAuthPage || status === "active") return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-paper px-5">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brass/15">
          <LockKeyhole className="h-5 w-5 text-brass" />
        </span>
        <h1 className="mt-5 font-serif text-[25px] text-ink">{signedIn ? "Private beta access" : "Welcome to the private beta"}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          {signedIn
            ? "Witness is currently open only to invited members. Open your invitation link using this account."
            : "Witness is currently open only to invited members. Sign in or open the invitation link you received."}
        </p>
        {message && <p className="mt-3 text-[12px] text-destructive">{message}</p>}
        <Button asChild className="mt-6 w-full">
          <Link to="/login">{signedIn ? "Use another account" : "Sign in with an invitation"}</Link>
        </Button>
        <button className="mt-4 text-[12px] text-ink-soft underline" onClick={() => window.location.reload()}>
          Check again
        </button>
      </div>
    </div>
  );
}