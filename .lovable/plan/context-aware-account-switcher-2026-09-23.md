# Context-aware account switcher

## What will change
- Keep the small account icon in the top-right corner.
- Always provide a clear **Sign out** action.
- Show **Switch user** only when the signed-in person has another page or professional identity they own.
- List only that person's actual personal, organization, church, nonprofit, counselor, or professional identities—never generic choices they have not created.
- When an identity is selected, open its correct home area and make it the active identity.

## Technical details
- Load owned organization and professional/counselor records for the signed-in account.
- Build the menu from those records, with Personal as the base identity.
- Preserve the existing Personal, Organization, and Professional navigation once an owned identity is selected.
- Verify the personal-only menu and a multi-profile menu at phone size, plus sign-out behavior.
