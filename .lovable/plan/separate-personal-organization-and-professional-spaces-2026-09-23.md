# Separate Personal, Organization, and Professional Spaces

## Goal
Keep one Witness account and one app, while giving people three clearly separated spaces they can switch between:

- **Personal** — hopes/prayers, gratitude, circles, messages, giving, serving, counseling, and account settings.
- **Organization** — organization profile, groups, events, needs, giving, team, payments, and page management.
- **Professional** — trade profile, leads, jobs, rates, reviews, verification, and payments.

## Changes
1. Add a space switcher that appears for signed-in users and opens Personal, Organization, or Professional.
2. Create a dedicated **Organization home** that lists the person’s organization pages, opens each dashboard, and offers page setup when none exists.
3. Create a dedicated **Professional home** using the existing professional account information and tools.
4. Remove Organization pages, Professional page, and Needs/Fix-it links from the Personal menu.
5. Keep Serve and therapy on the Personal side, as requested.
6. Route new organization, nonprofit, church, and subcontractor setup into their matching space while preserving one account and personal access.
7. Keep public organization and professional directories available where people naturally discover them; only management and trade-work tools move out of Personal.
8. Verify switching, empty/setup states, and existing-account states on phone, tablet, and desktop.

## Technical details
- Add client-safe active-space state persisted per device, with Personal as the default.
- Add dedicated TanStack routes for the Organization and Professional space homes.
- Reuse existing organization membership, organization dashboard, and professional profile data; no new account or duplicate profile records.
- Keep all existing permissions and payment separation unchanged.
