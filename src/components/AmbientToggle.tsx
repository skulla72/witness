import { CloudRain, Flame, Music2, Volume2, VolumeX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAmbientSound, type AmbientKind } from "@/hooks/useAmbientSound";

const OPTIONS: Array<{ id: AmbientKind; label: string; Icon: typeof Music2 }> = [
  { id: "piano", label: "Piano pad", Icon: Music2 },
  { id: "rain", label: "Rain", Icon: CloudRain },
  { id: "fire", label: "Fireplace", Icon: Flame },
  { id: "off", label: "Silence", Icon: VolumeX },
];

/** Optional soft sound while reading prayers. Off until tapped; quiets itself when a video plays. */
export function AmbientToggle() {
  const { kind, setKind } = useAmbientSound();
  const on = kind !== "off";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={on ? `Room sound: ${OPTIONS.find(o => o.id === kind)?.label}` : "Room sound (off)"}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${on ? "border-brass/50 bg-brass/15 text-brass-deep" : "border-border bg-card text-ink-soft"}`}
      >
        {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">Room sound · softens when a video plays</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ id, label, Icon }) => (
          <DropdownMenuItem key={id} onSelect={() => setKind(id)} className={kind === id ? "font-medium" : ""}>
            <Icon className="mr-2 h-4 w-4" /> {label}{kind === id && id !== "off" ? " · on" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
