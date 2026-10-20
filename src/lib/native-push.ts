import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

/** Android returns FCM. Apple's built-in plugin returns APNs, NOT FCM. */
export async function enableNativePush(): Promise<"registered" | "not-configured" | "denied" | "signed-out"> {
  if (Capacitor.getPlatform() !== "android" ||
      import.meta.env.VITE_NATIVE_ANDROID_PUSH_ENABLED !== "true") return "not-configured";
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return "signed-out";
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return "denied";
  const token = await new Promise<string>((resolve, reject) => {
    const listeners: Array<Promise<{ remove(): Promise<void> }>> = [];
    const timeout = window.setTimeout(() => finish(new Error("Push registration timed out.")), 20000);
    let finished = false;
    const finish = (error?: Error, token?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      for (const listener of listeners) void listener.then(handle => handle.remove());
      if (error) reject(error);
      else resolve(token!);
    };
    listeners.push(PushNotifications.addListener("registration", result => finish(undefined, result.value)));
    listeners.push(PushNotifications.addListener("registrationError", () => finish(new Error("Push setup is unavailable."))));
    void Promise.all(listeners).then(() => PushNotifications.register()).catch(() => finish(new Error("Push setup is unavailable.")));
  });
  const { data: current } = await supabase.auth.getSession();
  if (current.session?.user.id !== userId) {
    await PushNotifications.unregister();
    return "signed-out";
  }
  const { error } = await supabase.from("push_devices").upsert({
    user_id: userId, token, platform: "android", last_seen_at: new Date().toISOString(),
  }, { onConflict: "token" });
  if (error) throw new Error("Could not save this device's notification registration.");
  window.localStorage.setItem("witness.push.token", token);
  return "registered";
}
