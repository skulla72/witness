# Pro pages, organization pages, and paid packages

Two new kinds of public page, plus the plans that pay for them.

## 1. Professional pages (`/pros`)

A tradesperson, counselor, or any service professional builds their own page:
photo, trade, service area, about, hourly or flat rates, photos of past work,
links, and whether they ever serve for free.

- Anyone can create a page. It stays hidden until our team approves it, then it
  appears in search and on Needs.
- Identity check required before any job: a pro can't be booked or funded until
  they've completed ID verification. Pages show a plain "Identity verified" mark.
- Public page at `/pro/<name>` with rating, jobs completed, served hours badge,
  and reviews.
- Owner dashboard at `/pros/mine` to edit the page and see their standing.

### Two-way ratings (Uber-style, no retaliation)
After a job, both sides rate: stars plus a short review. Neither one is shown
until both have submitted, or 7 days pass. Homeowner ratings live on their
person page; pro ratings on the pro page.

### Strikes
Two strikes for no-shows, two for quality problems — counted separately. Each
strike comes from a confirmed report, not just a low rating. On the second in
either column the page is removed from search and the pro is told why, with a
note explaining that our team reviews appeals.

## 2. Organization pages (churches, nonprofits, ministries)

Builds on the organization pages that already exist, and finishes the claim flow.

- Claim: someone from the organization requests it, our team confirms, and the
  page becomes theirs — profile photo, links, service times, contact.
- Once claimed, the page shows up as a real account in search and in Circle, so
  people can connect to it rather than a stub.
- Giving: the organization enters its payout details so gifts reach their bank.
  Until then gifts stay closed and the page says so.
- Announcements: the organization posts to its followers — upcoming events,
  people to pray for, and serving posts that land on the Needs board.
- Prayer groups: the organization runs its own Walk-With circles.
- Counseling: the organization can point people to a Witness counselor, or to
  their own counselor once that person is registered and verified with us.

## 3. Packages

Three monthly plans, priced to feel easy for a small church:

| Plan | Price | What it carries |
| --- | --- | --- |
| Page | $29 / mo | The page, profile photo, links, announcements, prayer groups |
| Page + Giving | $79 / mo | Everything above, plus gifts and funds routed to their bank |
| Serving | $39 / mo | À la carte add-on: serving posts, job funds, pro connections |

- Plans are managed on the organization's own settings screen and billed
  monthly by card.
- A lapsed plan hides the page from search but never deletes anything, and never
  touches gifts already given.
- Professional pages are free for now; the Serving add-on is what organizations
  buy.

## Rules kept intact

No leaderboards, no vanity counts, no paid placement — a plan never changes who
sees a prayer or how high anything ranks. Money to nonprofits still passes
through in full.

## Technical notes

- New tables: `pro_profiles`, `pro_reviews` (double-blind reveal via trigger),
  `pro_strikes`, `pro_verifications`, `org_claims`, `org_announcements`,
  `org_payout_accounts`, `org_subscriptions`. RLS on all of them: public read of
  approved rows only, owner read/write of their own, admin review policies, and
  GRANTs in the same migration.
- Reuse existing `worker_reviews` / `worker_reputation` for job-level history;
  `pro_reviews` is the double-blind layer that feeds the public page.
- Routes: `pros.index.tsx`, `pros.new.tsx`, `pros.mine.tsx`, `pro.$slug.tsx`,
  `community.$slug.claim.tsx`, `community.$slug.manage.tsx`, `admin.pros.tsx`,
  `admin.claims.tsx`.
- Subscription products created through the payments tool
  (`org_page`, `org_page_giving`, `org_serving`), with the webhook already at
  `src/routes/api/public/payments/webhook.ts` extended to activate and lapse
  `org_subscriptions`.
- ID verification and organization payouts both need an external provider
  account that isn't connected yet; the flows will be built with a clear
  "not connected yet" state rather than fake success.

## Sequence

1. Database and RLS for all of the above.
2. Professional pages, ratings, strikes, admin review.
3. Organization claim, profile, announcements, prayer groups, counseling link.
4. Packages, checkout, webhook, lapse handling.
