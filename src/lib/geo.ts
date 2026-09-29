// Where you are, and how far you're willing to go.
// Design-first: a small table of ZIP centroids stands in for a geocoder, and
// distance is straight-line miles. Nothing leaves the device.

export interface Place {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

/** ZIP centroids for the metros the seed shifts live in, plus common ones. */
export const PLACES: Place[] = [
  { zip: "80202", city: "Denver", state: "CO", lat: 39.7496, lng: -104.9962 },
  { zip: "80014", city: "Aurora", state: "CO", lat: 39.6689, lng: -104.8319 },
  { zip: "80031", city: "Westminster", state: "CO", lat: 39.8749, lng: -105.0372 },
  { zip: "80301", city: "Boulder", state: "CO", lat: 40.0362, lng: -105.2295 },
  { zip: "80904", city: "Colorado Springs", state: "CO", lat: 38.8500, lng: -104.8556 },
  { zip: "80521", city: "Fort Collins", state: "CO", lat: 40.5896, lng: -105.0961 },
  { zip: "30303", city: "Atlanta", state: "GA", lat: 33.7525, lng: -84.3915 },
  { zip: "30060", city: "Marietta", state: "GA", lat: 33.9463, lng: -84.5499 },
  { zip: "43215", city: "Columbus", state: "OH", lat: 39.9686, lng: -83.0038 },
  { zip: "43604", city: "Toledo", state: "OH", lat: 41.6528, lng: -83.5379 },
  { zip: "64108", city: "Kansas City", state: "MO", lat: 39.0863, lng: -94.5836 },
  { zip: "37203", city: "Nashville", state: "TN", lat: 36.1512, lng: -86.7947 },
  { zip: "85004", city: "Phoenix", state: "AZ", lat: 33.4534, lng: -112.0714 },
  { zip: "97209", city: "Portland", state: "OR", lat: 45.5272, lng: -122.6844 },
  { zip: "72201", city: "Little Rock", state: "AR", lat: 34.7465, lng: -92.2896 },
  { zip: "75201", city: "Dallas", state: "TX", lat: 32.7876, lng: -96.7995 },
  { zip: "77002", city: "Houston", state: "TX", lat: 29.7566, lng: -95.3648 },
  { zip: "60601", city: "Chicago", state: "IL", lat: 41.8858, lng: -87.6229 },
  { zip: "10001", city: "New York", state: "NY", lat: 40.7506, lng: -73.9972 },
  { zip: "90012", city: "Los Angeles", state: "CA", lat: 34.0614, lng: -118.2385 },
  { zip: "98101", city: "Seattle", state: "WA", lat: 47.6106, lng: -122.3348 },
  { zip: "33131", city: "Miami", state: "FL", lat: 25.7657, lng: -80.1918 },
  { zip: "84101", city: "Salt Lake City", state: "UT", lat: 40.7581, lng: -111.8917 },
  { zip: "55401", city: "Minneapolis", state: "MN", lat: 44.9856, lng: -93.2696 },
  { zip: "28202", city: "Charlotte", state: "NC", lat: 35.2270, lng: -80.8431 },
];

export const findPlace = (zip: string) => PLACES.find(p => p.zip === zip.trim());

export const placeLabel = (p: Place) => `${p.city}, ${p.state}`;

/** Straight-line miles between two points. */
export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Closest known place to a raw coordinate — stands in for reverse geocoding. */
export function nearestPlace(coords: { lat: number; lng: number }): Place {
  let best = PLACES[0]!;
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = milesBetween(coords, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Ask the browser where we are, then snap to the nearest known place. */
export function locateMe(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location isn't available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve(
          nearestPlace({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ),
      () => reject(new Error("We couldn't get your location.")),
      { timeout: 8000, maximumAge: 300000 },
    );
  });
}

export const RADIUS_STEPS = [5, 10, 25, 50, 100, 250] as const;

export const radiusLabel = (m: number) =>
  m >= 250 ? "Anywhere" : `${m} mi`;

export const distanceLabel = (mi: number) =>
  mi < 1 ? "under a mile" : `${Math.round(mi)} mi away`;
