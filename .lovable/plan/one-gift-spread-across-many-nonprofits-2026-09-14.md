# One gift, spread across many nonprofits

A new way to give: instead of picking one organization, you give one amount and it is split evenly among many — either every vetted nonprofit on Witness, or every nonprofit in one lane (homelessness, recovery, grief, and so on).

## What people will see

**A new "Give across the board" screen**

- Two choices at the top: **The whole board** (every nonprofit currently receiving gifts) or **One lane** (pick a lane, e.g. Homelessness).
- Once chosen, the screen names exactly how many organizations will share the gift and lists them, so nobody gives blind.
- Amount buttons + custom amount, one-time or monthly, email for the receipt, optional name and note — same as the existing single-nonprofit gift screen.
- A plain line showing the split: "$100 → 8 nonprofits, $12.50 each." Any leftover cents are handed to the organizations at the top of the list, and we say so.
- Payment happens on the same secure checkout already used elsewhere; one charge, one receipt.

**Entry points**

- A card on the Giving page, above the lanes: "Not sure which one? Give to all of them."
- A card on each lane page: "Split it across every nonprofit in this lane."

**Afterwards**

- Your gift history shows it as one line ("$100 across 8 nonprofits — Homelessness"), expandable to see each organization's share.
- Each nonprofit's own records show their share as a normal gift, so leader dashboards and lane totals keep working untouched.
- Monthly versions repeat the split each month against whoever is receiving gifts that month, and can be stopped from the Giving page like any other monthly gift.

## Rules kept intact

- The split is even by design — no weighting, no ranking, no leaderboard.
- Only nonprofits set up and currently accepting gifts are included; a paused one is skipped.
- Giving still never affects prayer visibility, and no money moves between users.
- Gift tier credit (Sender ledger) counts the full amount given, not each slice, so nobody is double-counted.

## Technical outline

**Database (one migration)**

- New table `public.fund_gifts`: `user_id`, `email`, `donor_name`, `note`, `scope` (`all` | `lane`), `lane`, `amount_cents`, `frequency`, `status`, `environment`, `stripe_session_id`, `stripe_subscription_id`, `stripe_customer_id`, `canceled_at`, timestamps. GRANTs for `authenticated` + `service_role`; RLS so a giver reads only their own rows and inserts/updates go through the service role.
- `public.donations` gains `fund_gift_id uuid references public.fund_gifts(id)` plus an index, so each slice is an ordinary donation row that points back at the parent gift.
- `updated_at` trigger reusing `update_updated_at_column()`.

**Server**

- `src/lib/fund.functions.ts`
  - `createFundGift` (`createServerFn`, POST): validates scope/lane/amount/frequency, resolves the accepting nonprofit set, refuses if fewer than two organizations qualify, inserts the pending `fund_gifts` row, creates a Stripe embedded checkout session (payment or monthly subscription) with `fundGiftId` in metadata, returns `clientSecret`. Charitable tax code as today.
  - `previewFundSplit`: public read used by the screen to list participating organizations and per-org share.
  - `cancelMonthlyFund`: mirrors `cancelMonthlyGift` (auth middleware, owner check, immediate cancel).
- `src/routes/api/public/payments/webhook.ts`
  - On paid session with `fundGiftId`: mark the parent paid, then insert one `donations` row per organization (equal split, remainder to the first organizations by name, each carrying `lane`, `fund_gift_id`, the payment/session ids, and status `paid`). Idempotent — skip if slices already exist for that session.
  - `invoice.paid` renewals for a fund subscription: re-resolve the accepting set and insert a fresh set of slices keyed on the invoice id so a repeated notification can't double-count.
  - Failure/expiry/cancellation/refund paths update the parent and its slices the same way single gifts are handled.

**Client**

- `src/lib/fund.ts` — split maths, participant loading, labels shared by the screen and history.
- `src/components/giving/FundCheckout.tsx` — same shape as `GiftCheckout`, calling `createFundGift`.
- `src/routes/giving.fund.tsx` — the new screen with its own `head()` metadata.
- `src/components/giving/MyGifts.tsx` — group slices under their parent fund gift; cancel control for monthly funds.
- Entry cards added to `src/routes/giving.index.tsx` and `src/routes/giving.$lane.tsx`.

Verified with a typecheck/build plus a sandbox test card run through both a whole-board and a single-lane gift, confirming the slices land correctly.
