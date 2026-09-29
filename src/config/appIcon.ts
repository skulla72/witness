// The single approved Witness mark used everywhere the app needs a square icon.
import witnessIcon from "@/assets/icon-drop-flame.png";

export const ICON_OPTIONS = [
  { id: "witness", label: "Witness", src: witnessIcon, note: "The approved gold flame in a ring on deep navy." },
] as const;

export const APP_ICON = witnessIcon;
