import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { WORLD_COUNTRY_PATHS } from "@/data/world-map";
import { Button } from "@/components/ui/button";

export type GlobeCity = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  praying: number;
};

type Props = {
  cities: GlobeCity[];
  hotIds: Set<string>;
  activeId: string | null;
  onSelect: (id: string) => void;
  resetKey: number;
};

type View = { x: number; y: number; width: number; height: number };

const FULL_VIEW: View = { x: 0, y: 0, width: 1000, height: 500 };
const MIN_WIDTH = 210;

const mapPoint = (lon: number, lat: number) => ({
  x: ((lon + 180) / 360) * 1000,
  y: ((90 - lat) / 180) * 500,
});

export function PrayerGlobe({ cities, hotIds, activeId, onSelect, resetKey }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const [view, setView] = useState<View>(FULL_VIEW);
  const points = useMemo(
    () => cities.map(city => ({ ...city, ...mapPoint(city.lon, city.lat) })),
    [cities],
  );
  const zoomed = view.width < 700;

  const constrainView = (next: View): View => ({
    ...next,
    x: Math.min(1000 - next.width, Math.max(0, next.x)),
    y: Math.min(500 - next.height, Math.max(0, next.y)),
  });

  const zoomTo = (width: number, centerX = view.x + view.width / 2, centerY = view.y + view.height / 2) => {
    const nextWidth = Math.min(FULL_VIEW.width, Math.max(MIN_WIDTH, width));
    const nextHeight = nextWidth / 2;
    setView(constrainView({
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
      width: nextWidth,
      height: nextHeight,
    }));
  };

  useEffect(() => {
    if (!activeId) return;
    const city = points.find(point => point.id === activeId);
    if (city) zoomTo(360, city.x, city.y);
    // Selecting a city is the intentional trigger for regional focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => setView(FULL_VIEW), [resetKey]);

  const selectCity = (id: string) => onSelect(id);

  return (
    <div className="absolute inset-0 overflow-hidden bg-map-ocean" aria-label="World prayer map">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,color-mix(in_oklab,var(--map-line)_28%,transparent),transparent_58%)]" />
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full touch-none text-map-land"
        role="img"
        aria-labelledby="world-map-title world-map-description"
        onWheel={event => {
          event.preventDefault();
          zoomTo(view.width * (event.deltaY > 0 ? 1.25 : 0.8));
        }}
        onPointerDown={event => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = { x: event.clientX, y: event.clientY, view };
        }}
        onPointerMove={event => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg || view.width >= FULL_VIEW.width) return;
          const bounds = svg.getBoundingClientRect();
          const dx = ((event.clientX - drag.x) / bounds.width) * drag.view.width;
          const dy = ((event.clientY - drag.y) / bounds.height) * drag.view.height;
          setView(constrainView({ ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy }));
        }}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <title id="world-map-title">Prayers around the world</title>
        <desc id="world-map-description">A quiet world silhouette with selectable incoming prayer locations.</desc>

        <g fill="currentColor" stroke="var(--map-line)" strokeWidth="0.65" strokeLinejoin="round">
          {WORLD_COUNTRY_PATHS.map(country => (
            <path key={country.name} d={country.d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>

        {points.map(city => {
          const active = activeId === city.id;
          const hot = hotIds.has(city.id);
          return (
            <g
              key={city.id}
              className="cursor-pointer focus:outline-none"
              role="button"
              tabIndex={0}
              aria-label={`${city.name}, ${city.country}: ${city.praying} praying`}
              onClick={() => selectCity(city.id)}
              onKeyDown={event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectCity(city.id);
                }
              }}
            >
              {(hot || active) && (
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={active ? 15 : 12}
                  className="fill-map-prayer/25 motion-safe:animate-ping"
                />
              )}
              <circle
                cx={city.x}
                cy={city.y}
                r={active ? 7 : hot ? 6 : 4.5}
                className={active || hot ? "fill-map-prayer stroke-map-ocean" : "fill-map-muted stroke-map-ocean"}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              {(zoomed || active) && (
                <text
                  x={city.x}
                  y={city.y - 10}
                  textAnchor="middle"
                  className="pointer-events-none fill-map-text text-[10px] font-semibold"
                  stroke="var(--map-ocean)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  vectorEffect="non-scaling-stroke"
                >
                  {city.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-map-ocean/20 via-transparent to-map-ocean/50" />
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 border border-map-border bg-map-surface text-map-text shadow-soft hover:bg-map-land"
          onClick={() => zoomTo(view.width * 0.72)}
          disabled={view.width <= MIN_WIDTH}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 border border-map-border bg-map-surface text-map-text shadow-soft hover:bg-map-land"
          onClick={() => zoomTo(view.width * 1.38)}
          disabled={view.width >= FULL_VIEW.width}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 border border-map-border bg-map-surface text-map-text shadow-soft hover:bg-map-land"
          onClick={() => setView(FULL_VIEW)}
          disabled={view.width >= FULL_VIEW.width}
          aria-label="Show the whole world"
          title="Show the whole world"
        >
          <Maximize2 />
        </Button>
      </div>
    </div>
  );
}