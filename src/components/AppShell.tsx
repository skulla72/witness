import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Home, Sun, Users, User, Plus, Flame, Bell, BellRing, LogIn, LogOut, MessageCircle, X, Building2, BriefcaseBusiness, CircleDollarSign, Settings, Wrench } from "lucide-react";
import { BRAND } from "@/config/brand";
import { BrandMark } from "@/components/BrandMark";
import { streak } from "@/data/habits";
import { IntroTour, useIntroTour } from "@/components/IntroTour";
import { BetaAccessGate } from "@/components/BetaAccessGate";
import { CovenantGate } from "@/components/CovenantGate";
import { OnboardingGate } from "@/components/OnboardingGate";
import { IncomingCall } from "@/components/calls/IncomingCall";
import { FeedbackInvite } from "@/components/FeedbackInvite";
import { OfflineNotice } from "@/components/OfflineNotice";

import { usePrefs } from "@/hooks/usePrefs";
import { useSession } from "@/hooks/useSession";
import { toneFor } from "@/lib/tone";
import { unreadNotificationCount } from "@/lib/notificationInbox";
import { loadNotificationPrefs } from "@/lib/notifications";
import { dismissReminderToday, shouldShowReminder } from "@/lib/reminder";
import { useAppSpace, type AppSpace } from "@/hooks/useAppSpace";
import { SpaceSwitcher } from "@/components/SpaceSwitcher";

const tabs: Array<{ to: string; label: string; Icon: typeof Home; primary?: boolean }> = [
  { to: "/", label: "Prayer", Icon: Home },
  { to: "/gratitude", label: "Gratitude", Icon: Sun },
  { to: "/record", label: "Share", Icon: Plus, primary: true },
  { to: "/walk", label: "Community", Icon: Users },
  { to: "/profile", label: "You", Icon: User },
];

const spaceTabs: Record<AppSpace, Array<{ to: string; label: string; Icon: typeof Home; primary?: boolean }>> = {
  personal: tabs,
  organization: [
    { to: "/spaces/organization", label: "Home", Icon: Building2 },
    { to: "/community", label: "Directory", Icon: Users },
    { to: "/needs", label: "Needs", Icon: Wrench },
    { to: "/community/new", label: "Add page", Icon: Plus, primary: true },
    { to: "/profile", label: "Account", Icon: User },
  ],
  professional: [
    { to: "/spaces/professional", label: "Home", Icon: BriefcaseBusiness },
    { to: "/pros/leads", label: "Jobs", Icon: Wrench },
    { to: "/pros", label: "Directory", Icon: Users },
    { to: "/pros/payments", label: "Payments", Icon: CircleDollarSign },
    { to: "/pros/mine", label: "Page", Icon: Settings },
  ],
};

export function AppShell() {
  const { pathname } = useLocation();
  const entryPage = pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password" || pathname === "/terms" || pathname === "/privacy";
  // The survey and the recorder are full-screen: no header, no tab bar competing
  // with their own bottom action bar.
  const { signedIn } = useSession();
  // The landing page is its own full screen: no app header, no tab bar.
  const landing = pathname === "/" && signedIn !== true;
  const publicStories = pathname === "/testimonials" && signedIn !== true;
  // The films page carries its own dark frame and its own way back.
  const campaign = pathname === "/campaign";
  const hideChrome =
    entryPage ||
    landing ||
    publicStories ||
    campaign ||
    pathname.startsWith("/record") ||
    pathname.startsWith("/sit/") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/welcome");

  const tour = useIntroTour();
  useFirstRun(pathname, signedIn === true);

  if (typeof window !== "undefined") {
    (window as unknown as { __witnessReplayTour?: () => void }).__witnessReplayTour =
      tour.replay;
  }

  return (
    <div className="min-h-screen bg-paper paper-grain text-ink">
      {!hideChrome && <LargeScreenNav />}
      <div className={`mx-auto min-h-screen bg-paper relative flex flex-col max-w-md md:max-w-none ${!hideChrome ? "md:ml-24 lg:ml-64" : "md:max-w-5xl"}`}>
        <OfflineNotice />
        {!hideChrome && <div className="md:hidden"><Header /></div>}
        <main className={`flex-1 pb-24 md:pb-0 ${!hideChrome ? "md:mx-auto md:w-full md:max-w-6xl md:px-8 lg:px-10" : ""}`}>
          <Outlet />
        </main>
        {!hideChrome && <div className="md:hidden"><TabBar /></div>}

        {!hideChrome && <IntroTour open={tour.open} onClose={tour.close} />}
        <BetaAccessGate />
        <CovenantGate />
        <OnboardingGate />
        <IncomingCall />
        {!hideChrome && <FeedbackInvite />}
      </div>
    </div>
  );
}

function LargeScreenNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { prefs } = usePrefs();
  const { signedIn } = useSession();
  const tone = toneFor(prefs);
  const qc = useQueryClient();
  const { space } = useAppSpace();
  const activeTabs = spaceTabs[space];

  const signOut = async () => {
    await supabase.auth.signOut();
    qc.clear();
    void navigate({ to: "/login" });
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col border-r border-border/70 bg-card/95 px-3 py-5 backdrop-blur-md md:flex lg:w-64 lg:px-5">
      <Link to="/" className="flex min-w-0 items-center justify-center gap-3 lg:justify-start">
        <BrandMark />
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate font-serif text-[20px] text-ink">{BRAND.name}<span className="ml-1 text-brass">·</span></span>
          <span className="block truncate text-[9px] uppercase tracking-[0.18em] text-ink-soft">{BRAND.tagline}</span>
        </span>
      </Link>

      <nav className="mt-10 space-y-1.5" aria-label="Main navigation">
        {activeTabs.map(({ to, label: base, Icon, primary }) => {
          const label = to === "/" ? tone.askTab : base;
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to as "/"}
              className={`group flex min-h-12 items-center justify-center gap-3 rounded-lg px-3 transition-colors lg:justify-start ${
                primary
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : active
                    ? "bg-secondary text-ink"
                    : "text-ink-soft hover:bg-secondary/70 hover:text-ink"
              }`}
              aria-label={label}
              title={label}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2 : 1.6} />
              <span className="hidden text-[13px] font-medium lg:block">{label}</span>
              {active && !primary && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-brass lg:block" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1.5 border-t border-border/70 pt-4">
        {signedIn === true && (
          <>
            <div className="pb-1">
              <SpaceSwitcher />
            </div>
            <Link to="/messages" className={`flex min-h-11 items-center justify-center gap-3 rounded-lg px-3 lg:justify-start ${pathname.startsWith("/messages") ? "bg-secondary text-ink" : "text-ink-soft hover:bg-secondary/70 hover:text-ink"}`} title="Messages">
              <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.6} />
              <span className="hidden text-[13px] lg:block">Messages</span>
            </Link>
            <Link to="/notifications" className={`flex min-h-11 items-center justify-center gap-3 rounded-lg px-3 lg:justify-start ${pathname.startsWith("/notifications") ? "bg-secondary text-ink" : "text-ink-soft hover:bg-secondary/70 hover:text-ink"}`} title="Notifications">
              <Bell className="h-5 w-5 shrink-0" strokeWidth={1.6} />
              <span className="hidden text-[13px] lg:block">Notifications</span>
            </Link>
            <div className="flex min-h-11 items-center justify-center gap-3 px-3 text-ink-soft lg:justify-start" title={`${streak.current} day streak`}>
              <Flame className="h-5 w-5 shrink-0 text-flame" strokeWidth={1.8} />
              <span className="hidden text-[13px] lg:block">{streak.current} day streak</span>
            </div>
            <button type="button" onClick={() => void signOut()} className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg px-3 text-ink-soft hover:bg-secondary/70 hover:text-ink lg:justify-start" title="Sign out">
              <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.6} />
              <span className="hidden text-[13px] lg:block">Sign out</span>
            </button>
          </>
        )}
        {signedIn === false && (
          <Link to="/login" className="flex min-h-11 items-center justify-center gap-3 rounded-lg bg-secondary px-3 text-ink lg:justify-start" title="Sign in">
            <LogIn className="h-5 w-5 shrink-0" />
            <span className="hidden text-[13px] lg:block">Sign in</span>
          </Link>
        )}
      </div>
    </aside>
  );
}

const FIRST_RUN_KEY = "witness.firstRun.v1";

/**
 * The very first open lands on /welcome: the faith question, a short look
 * around, then the survey. Only ever once, and only from the home screen.
 */
function useFirstRun(pathname: string, signedIn: boolean) {
  const navigate = useNavigate();
  const { prefs, ready } = usePrefs();

  useEffect(() => {
    if (!ready || !signedIn || pathname !== "/") return;
    if (prefs.done || prefs.faithBased !== null) return;
    try {
      if (window.localStorage.getItem(FIRST_RUN_KEY)) return;
      window.localStorage.setItem(FIRST_RUN_KEY, "1");
      // The welcome flow replaces the pop-up tour on a first open.
      window.localStorage.setItem("witness.tour.v1", "1");
    } catch {
      return;
    }
    void navigate({ to: "/welcome" });
  }, [ready, signedIn, pathname, prefs.done, prefs.faithBased, navigate]);
}


function Header() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const qc = useQueryClient();
  const unread = useQuery({
    queryKey: ["notifications", "unread", userId],
    queryFn: unreadNotificationCount,
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSignedIn(!!data.session); setUserId(data.session?.user.id ?? null); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { setSignedIn(!!session); setUserId(session?.user.id ?? null); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`header-notifications-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, userId]);

  // The daily nudge — only for people who switched it on themselves.
  const prefs = useQuery({
    queryKey: ["notification-prefs", userId],
    queryFn: () => loadNotificationPrefs(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const [waved, setWaved] = useState(false);
  const remind = !waved && signedIn === true && shouldShowReminder(prefs.data ?? null) && tick >= 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-paper/85 backdrop-blur-md">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3">

        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <BrandMark />
          <span className="min-w-0">
            <span className="block truncate font-serif text-[20px] tracking-tight text-ink">
              {BRAND.name}
              <span className="ml-1 text-brass">·</span>
            </span>
            <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              {BRAND.tagline}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {signedIn === false ? (
            <Link
              to="/login"
              className="inline-flex items-center gap-1 rounded-full border border-brass/40 bg-brass/10 px-3 py-1.5 text-[11.5px] text-ink"
            >
              <LogIn className="h-3.5 w-3.5 text-brass" strokeWidth={1.8} />
              Sign in
            </Link>
          ) : (
          <>
              <Link
                to="/messages"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-ink-soft"
                aria-label="Messages"
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.7} />
              </Link>
              <Link
                to="/notifications"
                className={`relative grid h-8 w-8 place-items-center rounded-full border bg-card ${
                  remind ? "border-brass/60 text-brass animate-pulse" : "border-border text-ink-soft"
                }`}
                aria-label="Notifications"
              >
                {remind ? (
                  <BellRing className="h-3.5 w-3.5" strokeWidth={1.8} />
                ) : (
                  <Bell className="h-3.5 w-3.5" strokeWidth={1.7} />
                )}
                {(unread.data ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-brass px-1 text-[9px] font-semibold text-ink">
                    {(unread.data ?? 0) > 99 ? "99+" : unread.data}
                  </span>
                )}
              </Link>
              <SpaceSwitcher compact />
            </>
          )}
        </div>
      </div>

      {remind && (
        <div className="flex items-center gap-2 border-t border-brass/25 bg-brass/10 px-5 py-2">
          <Link to="/" className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink">
            Still here. Say the thing, or carry someone else's for a minute.
          </Link>
          <button
            type="button"
            aria-label="Hide today's reminder"
            onClick={() => {
              dismissReminderToday();
              setWaved(true);
            }}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-soft"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        </div>
      )}
    </header>

  );
}


function TabBar() {
  const { pathname } = useLocation();
  const { prefs } = usePrefs();
  const tone = toneFor(prefs);
  const { space } = useAppSpace();
  const activeTabs = spaceTabs[space];
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
      <div className="mx-3 mb-3 rounded-2xl bg-card border border-border shadow-lift">
        <ul className="grid grid-cols-5 items-end px-2 py-2">
          {activeTabs.map(({ to, label: base, Icon, primary }) => {
            const label = to === "/" ? tone.askTab : base;
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            if (primary) {
              return (
                <li key={to} className="flex justify-center -mt-7">
                  <Link
                    to={to as "/record"}
                    className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-paper transition-transform active:scale-95"
                    aria-label={label}
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </Link>
                </li>
              );
            }
            return (
              <li key={to}>
                <Link
                  to={to as "/"}
                  className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                    active ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-wide">{label}</span>
                  {active && <span className="h-1 w-1 rounded-full bg-brass" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}