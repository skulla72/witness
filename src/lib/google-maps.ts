/// <reference types="google.maps" />

let promise: Promise<typeof google.maps> | null = null;

/**
 * Loads the Google Maps JavaScript API once, asynchronously.
 * Resolves with the google.maps namespace.
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (promise) return promise;

  promise = new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    if (w["google"] && (w["google"] as typeof google).maps?.Map) {
      resolve((w["google"] as typeof google).maps);
      return;
    }

    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] ?? "";
    if (!key) {
      reject(new Error("Missing Google Maps browser key"));
      return;
    }

    const cbName = "__witnessInitMap";
    w[cbName] = () => resolve((w["google"] as typeof google).maps);

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${cbName}&channel=${channel}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });

  return promise;
}
