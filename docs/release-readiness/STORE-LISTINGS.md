# Draft store listings

**INTERNAL — FACTUAL COPY DRAFT, NOT APPROVED OR SUBMISSION-READY**

The text below describes source-backed core experiences, not a claim that every
flow passes release testing. Do not enter it into a store until the open gates
in [README](README.md) pass.

## Apple App Store

- **Name:** Witness
- **Subtitle:** Prayer, gratitude & community
- **Description:**

  Witness is a place for prayer, gratitude and connection.

  Share prayer requests, respond to others, and record moments of gratitude.
  Use your journal for personal reflection, explore Bible passages, and connect
  with a community where faith is welcomed.

  Choose what you share and review the audience of your posts before posting.
  Witness also includes tools for recording prayer media and finding ways to
  support others.

  An account is needed for account-based community features. Media features
  may request camera, microphone or photo access when used.

  Witness is operated by Common Light LLC in the USA. Users must be at least
  13 and confirm an account-bound age self-attestation for protected account
  features. This is not identity-verified age. Teen counseling is not offered in this launch candidate while consent
  and legal arrangements are being finalized.

- **Suggested keywords (owner review):**
  `prayer,gratitude,journal,faith,community,reflection,Bible`
- **Category suggestion:** Social Networking; owner confirms category and
  secondary category from final approved release scope.
- **Promotional text / What's New:** Not supplied. Final release scope and
  version history are not verified.
- **Support URL:** Missing verified dedicated public app-support page.
- **Privacy URL candidate:** https://witnessmovement.com/privacy — loads, but
  legal text unfinished/unapproved.
- **Marketing URL candidate:** https://witnessmovement.com — existing live site,
  not a new deployment.
- **Operator:** Common Light LLC, registered in Colorado, USA (owner-confirmed).
  Mailing address is unconfirmed; no governing law/venue is selected. Store seller/account
  verification, copyright, territories, pricing and store
  age rating remain OWNER REQUIRED. Minimum signup age 13 is not a store rating.
  Native billing is not validated; complete the [draft SKU/storefront billing
  review](STORE-BILLING-REVIEW.md), including nonprofit beneficiary evidence,
  before selecting billing or making compliance declarations.

## Google Play

- **App name:** Witness
- **Short description:** Share prayers, record gratitude and reflect with your community.
- **Full description:** Use the Apple description above as the initial factual
  copy draft. It is below both stores' description limits and makes no claim
  that native authentication, calls, push, payments or deletion are release-ready.
- **Category suggestion:** Social; owner confirms classification and tags.
- **Contact email:** `support@witnessmovement.com` appears in live privacy/terms;
  owner confirms active monitoring for privacy/deletion. No email sent as a test.
- **Website candidate:** https://witnessmovement.com
- **Privacy URL candidate:** https://witnessmovement.com/privacy — unapproved.
- **Account deletion URL:** Owned Lovable page prepared/verified in unpublished
  code per owner, not live; exact new URL not supplied here. Request-page
  completion is separate from backend deletion/fulfillment evidence.
- **Target audience, content rating, ads declaration, Data safety, health and
  financial declarations, countries and pricing:** NOT COMPLETED. Source-based
  worksheet is not a set of approved form answers.

## Source basis and exclusions

| Draft claim | Local source evidence | Verification limit |
| --- | --- | --- |
| Prayer requests/responses | `src/lib/prayers.ts`, `src/routes/prayer.$id.tsx` | Not a fresh authenticated creation test |
| Gratitude | `src/routes/gratitude.index.tsx`, `src/routes/gratitude.$id.tsx` | No real-account mutation |
| Personal reflection journal | `src/routes/journal.tsx`, `src/lib/journal.ts` | Account-scoped device-local storage; no promised cross-device sync or end-to-end encryption |
| Bible passages | `src/routes/bible.tsx`, `src/lib/bible.functions.ts` | Provider availability and optional AI suggestions separate |
| Faith welcomed | `src/config/brand.ts` | Faith-friendly, not mandatory religious membership |
| Sharing audiences/media | `src/lib/prayers.ts`, `src/routes/record.tsx`, media components | Audience/RLS and native permissions need device/live tests |

Do not advertise reliable native social sign-in, global calling connectivity,
completed push delivery, licensed clinical treatment, emergency response,
guaranteed donations/tax deductions, validated payment processing, universal
anonymity, encrypted journals or complete account erasure. These are not
established release facts.

No screenshots or feature graphics were produced. Existing images/assets must
be reviewed for rights, actual-device accuracy and final UI. Do not use a
Replit screenshot as evidence of a signed native release.
