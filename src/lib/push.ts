import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as
  | string
  | undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string,
  appId: appId as string,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "signed-out";

export function pushConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      appId &&
      vapidKey &&
      firebaseConfig.messagingSenderId,
  );
}

/** Whether this browser already granted notifications. */
export function pushGranted() {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission === "granted"
    : false;
}

/** Call from a click: browsers ignore permission requests without a tap. */
export async function enablePush(): Promise<PushStatus> {
  if (!pushConfigured()) return "not-configured";
  if (!("Notification" in window) || !(await isSupported())) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return "signed-out";

  const query = new URLSearchParams(firebaseConfig).toString();
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) return "denied";

  await supabase
    .from("push_devices")
    .upsert(
      { user_id: userId, token, platform: "web", last_seen_at: new Date().toISOString() },
      { onConflict: "token" },
    );

  // A notification arriving while the app is open shouldn't interrupt — it is
  // handled quietly by whoever mounts this listener.
  onMessage(messaging, () => {});
  return "registered";
}

/** Stop notifications on this device. */
export async function disablePush(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    if (registration.active?.scriptURL.includes("firebase-messaging-sw.js")) {
      await registration.unregister();
    }
  }
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (userId) await supabase.from("push_devices").delete().eq("user_id", userId);
}

/** What to tell someone after asking their phone for notifications. */
export const pushStatusCopy: Record<PushStatus, string> = {
  registered: "You'll get nudges on this device.",
  "not-configured": "Notifications aren't set up yet. Check back soon.",
  unsupported: "This device can't show notifications.",
  "open-in-new-tab": "Open the app in its own tab or from your home screen, then try again.",
  denied: "Notifications are blocked. Allow them for this site in your phone or browser settings.",
  "signed-out": "Sign in first, then turn notifications on.",
};
