import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/useSession";
import { usePrefs } from "@/hooks/usePrefs";

/**
 * The way in is one road: create the account, agree to the terms, answer the
 * survey. Anyone signed in who hasn't finished the survey is taken back to it
 * before the rest of the app opens.
 */
const OPEN_PATHS = [
  "/setup",
  "/welcome",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/help",
];

export function OnboardingGate() {
  const { pathname } = useLocation();
  const { signedIn } = useSession();
  const { prefs, ready } = usePrefs();
  const navigate = useNavigate();

  const exempt = OPEN_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
  // Answers saved on another device arrive a moment after the page does.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready || !settled || signedIn !== true || exempt) return;
    if (prefs.done) return;
    void navigate({ to: "/setup", replace: true });
  }, [ready, settled, signedIn, exempt, prefs.done, navigate]);

  return null;
}
