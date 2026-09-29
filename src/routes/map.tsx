import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { prayers, findUser } from "@/data/seed";
import { PrayerGlobe, type GlobeCity } from "@/components/map/PrayerGlobe";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/map")({
  staticData: { sitemap: false },
  component: MapPage,
  head: () => ({
    meta: [
      { title: "Live Prayer Map — Prayers around the world" },
      {
        name: "description",
        content:
          "See prayers arrive across a quiet world map, or see where people are praying for you.",
      },
      { property: "og:title", content: "Live Prayer Map — See prayers rising worldwide" },
      {
        property: "og:description",
        content: "Watch prayers arrive around the world, and see who is standing with you tonight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type City = GlobeCity & { prayerId: string };

const CITIES: City[] = [
  { id: "la", name: "Los Angeles", country: "USA", lon: -118.2437, lat: 34.0522, prayerId: "p1", praying: 412 },
  { id: "van", name: "Vancouver", country: "Canada", lon: -123.1207, lat: 49.2827, prayerId: "p5", praying: 96 },
  { id: "mex", name: "Mexico City", country: "Mexico", lon: -99.1332, lat: 19.4326, prayerId: "p3", praying: 288 },
  { id: "nyc", name: "New York", country: "USA", lon: -74.006, lat: 40.7128, prayerId: "p10", praying: 356 },
  { id: "sao", name: "São Paulo", country: "Brazil", lon: -46.6333, lat: -23.5505, prayerId: "p2", praying: 501 },
  { id: "lon", name: "London", country: "UK", lon: -0.1276, lat: 51.5072, prayerId: "p4", praying: 233 },
  { id: "lag", name: "Lagos", country: "Nigeria", lon: 3.3792, lat: 6.5244, prayerId: "p6", praying: 618 },
  { id: "acc", name: "Accra", country: "Ghana", lon: -0.1969, lat: 5.6037, prayerId: "p9", praying: 141 },
  { id: "cai", name: "Cairo", country: "Egypt", lon: 31.2357, lat: 30.0444, prayerId: "p7", praying: 174 },
  { id: "nai", name: "Nairobi", country: "Kenya", lon: 36.8219, lat: -1.2921, prayerId: "p8", praying: 208 },
  { id: "mum", name: "Mumbai", country: "India", lon: 72.8777, lat: 19.076, prayerId: "p3", praying: 447 },
  { id: "man", name: "Manila", country: "Philippines", lon: 120.9842, lat: 14.5995, prayerId: "p6", praying: 322 },
  { id: "seo", name: "Seoul", country: "Korea", lon: 126.978, lat: 37.5665, prayerId: "p4", praying: 189 },
  { id: "syd", name: "Sydney", country: "Australia", lon: 151.2093, lat: -33.8688, prayerId: "p2", praying: 127 },
];

type Ping = { key: number; cityId: string; text: string; who: string; at: number };

function MapPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [pings, setPings] = useState<Ping[]>([]);
  const [count, setCount] = useState(2147);
  const [now, setNow] = useState(() => Date.now());

  const visible = CITIES;

  const active = visible.find(c => c.id === activeId) ?? null;

  const reset = () => {
    setActiveId(null);
    setResetKey(key => key + 1);
  };

  /* live incoming prayers */
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      const c = visible[Math.floor(Math.random() * visible.length)];
      if (!c) return;
      const p = prayers.find(pr => pr.id === c.prayerId) ?? prayers[0];
      const u = findUser(p.user_id);
      setPings(prev =>
        [
          {
            key: ++n + Date.now(),
            cityId: c.id,
            text: `${p.category} · "${p.ask_caption}"`,
            who: p.is_anonymous ? "Someone" : u.name.split(" ")[0],
            at: Date.now(),
          },
          ...prev,
        ].slice(0, 14),
      );
      setCount(x => x + 1 + Math.floor(Math.random() * 3));
    }, 1900);
    return () => clearInterval(id);
  }, []);

  /* keeps the pulse window fresh */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const hotIds = useMemo(() => {
    const s = new Set<string>();
    pings.forEach(p => {
      if (now - p.at < 6000) s.add(p.cityId);
    });
    return s;
  }, [pings, now]);

  const activePrayer = active && prayers.find(p => p.id === active.prayerId);
  const activeUser = activePrayer && findUser(activePrayer.user_id);

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-map-ocean px-4 pb-8 pt-3 text-map-text">
      <div className="flex items-center justify-between">
        <Link to="/" className="rounded-full border border-map-border bg-map-surface p-2 tap-scale" aria-label="Back">
          <ArrowLeft className="h-4 w-4 text-map-text" />
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-map-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-hope animate-pulse" />
          {count.toLocaleString()} praying now
        </div>
        <div className="w-8" />
      </div>

      <h1 className="mt-3 font-serif text-[25px] leading-tight text-map-text">Prayers of the world</h1>
      <p className="mt-1 text-[12.5px] text-map-muted">
        Watch prayers arrive. Tap a light or zoom closer to pray with someone.
      </p>

      {/* map */}
      <div className="relative mt-4 aspect-[5/4] overflow-hidden rounded-2xl border border-map-border bg-map-ocean shadow-lift">
        <PrayerGlobe
          cities={visible}
          hotIds={hotIds}
          activeId={activeId}
          onSelect={setActiveId}
          resetKey={resetKey}
        />

        {/* vignette */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_36px_var(--map-ocean)]" />

        {/* city quick jump */}
        <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 overflow-x-auto bg-gradient-to-t from-map-ocean via-map-ocean/90 to-transparent px-3 pb-3 pt-8 [scrollbar-width:none]">
          {visible.map(c => (
            <Button
              key={c.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveId(c.id)}
              className={`h-7 shrink-0 rounded-full border px-2.5 text-[10.5px] tracking-wide transition-colors ${
                activeId === c.id
                  ? "border-map-prayer bg-map-prayer text-map-ocean hover:bg-map-prayer"
                  : "border-map-border bg-map-surface text-map-muted hover:bg-map-land hover:text-map-text"
              }`}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* active city card */}
      {active && activePrayer && activeUser && (
        <div className="mt-3 rounded-2xl border border-map-border bg-map-surface p-4 shadow-soft backdrop-blur-xl rise-in">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-map-prayer">
              {active.name}, {active.country} · {active.praying} praying
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={reset} className="h-6 px-2 text-[11px] text-map-muted hover:bg-map-land hover:text-map-text">
              close
            </Button>
          </div>
          <p className="mt-2 font-serif text-[16px] leading-snug text-map-text line-clamp-3">"{activePrayer.ask_caption}"</p>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={activeUser.photo} alt="" className="h-7 w-7 rounded-full" />
              <span className="text-[12px] text-map-muted">
                {activePrayer.is_anonymous ? "Anonymous" : activeUser.name}
              </span>
            </div>
            <Link
              to="/sit/$id"
              params={{ id: activePrayer.id }}
              className="rounded-full bg-map-text px-3.5 py-1.5 text-[11px] tracking-wide text-map-ocean tap-scale"
            >
              Sit with them
            </Link>
          </div>
        </div>
      )}

      {/* live stream */}
      <section className="mt-5">
        <h2 className="text-[10px] uppercase tracking-[0.22em] text-map-muted">Arriving now</h2>
        <ul className="mt-2 space-y-1.5">
          {pings.length === 0 && <li className="text-[12px] text-map-muted italic">Listening for prayers…</li>}
          {pings.map((p, i) => {
            const city = CITIES.find(c => c.id === p.cityId);
            return (
              <li
                key={p.key}
                onClick={() => city && setActiveId(city.id)}
                className="rise-in flex cursor-pointer items-start gap-2.5 rounded-xl border border-map-border bg-map-surface px-3 py-2 backdrop-blur-md"
                style={{ opacity: 1 - i * 0.055 }}
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-map-prayer" />
                <p className="text-[12.5px] leading-snug text-map-text">
                  <span className="text-map-muted">
                    {p.who} in {city?.name ?? "somewhere"} —{" "}
                  </span>
                  {p.text}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-5 text-center text-[11.5px] text-map-muted italic">
        Tap any light to pray with someone, anywhere.
      </p>
    </div>
  );
}
