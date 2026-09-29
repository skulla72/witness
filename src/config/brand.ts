// Brand configuration — single source of truth.
// Change `name` and `tagline` to rebrand the entire app.
export const BRAND = {
  name: "Witness",
  shortName: "Witness",
  tagline: "Lift one another.",
  mission:
    "A place to share kindness, ask for help, and walk with others through hard seasons — so empathy multiplies.",
  // Faith is welcomed but not required. Set to false for a fully secular skin.
  faithFriendly: true,
  // Invite-only beta gate. Set back to true at launch to require invitations again.
  inviteOnly: false,
} as const;

export type Brand = typeof BRAND;