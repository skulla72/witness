// Witness brand palette — warm ink + brass, matching the app's design tokens.
export const C = {
  ink: "#141b26",
  inkDeep: "#0c1118",
  paper: "#faf8f3",
  paperWarm: "#f3ece1",
  brass: "#b7813f",
  brassLight: "#d9a45f",
  brassGlow: "rgba(217, 164, 95, 0.55)",
  mute: "rgba(250, 248, 243, 0.62)",
};

// Screenshot intrinsic size (390x844 CSS at 2x)
export const SHOT_W = 780;
export const SHOT_H = 1688;

// Phone render size inside the 1920x1080 frame
export const PHONE_H = 940;
export const PHONE_W = Math.round((PHONE_H * 390) / 844);
export const PHONE_SCALE = PHONE_W / 390; // css px -> video px
