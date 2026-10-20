import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { parseNativeCallback, safeAuthNext } from "@/lib/auth-links";
import { toast } from "sonner";

/** Email confirmation/recovery only; no direct-provider social OAuth handoff. */
export function NativeSupport() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let disposed = false;
    const seen = new Set<string>();
    const receive = async (raw: string) => {
      const callback = parseNativeCallback(raw);
      if (!callback || disposed || seen.has(raw)) return;
      seen.add(raw);
      try {
        if (callback.error) throw new Error("The provider did not complete sign-in. Please try again.");
        if (!callback.code) throw new Error("This sign-in link is incomplete. Please start again.");
        const { error } = await supabase.auth.exchangeCodeForSession(callback.code);
        if (error) throw new Error("This sign-in link expired or was opened on another device. Start again on this device.");
        await Browser.close().catch(() => {});
        const next = safeAuthNext(window.sessionStorage.getItem("witness.auth.next"));
        window.sessionStorage.removeItem("witness.auth.next");
        if (!disposed) void navigate({ to: callback.recovery ? "/reset-password" : next });
      } catch (error) {
        if (!disposed) toast.error(error instanceof Error ? error.message : "Could not restore sign-in.");
      }
    };
    const urlListener = App.addListener("appUrlOpen", ({ url }) => { void receive(url); });
    const stateListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    const tapListener = import("@capacitor/push-notifications").then(({ PushNotifications }) =>
      PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const path = safeAuthNext(typeof notification.data?.path === "string" ? notification.data.path : null);
        if (!disposed) void navigate({ to: path });
      }));
    void App.getLaunchUrl().then(result => { if (result?.url) void receive(result.url); })
      .catch(() => { if (!disposed) toast.error("Could not check this app's sign-in link. Please try sign-in again."); });
    supabase.auth.startAutoRefresh();
    return () => {
      disposed = true;
      void urlListener.then(listener => listener.remove());
      void stateListener.then(listener => listener.remove());
      void tapListener.then(listener => listener.remove());
    };
  }, [navigate]);
  return null;
}
