# Full-scope launch gates

**INTERNAL PREPARATION — NOT LEGAL ADVICE, NOT APPROVED TO PUBLISH**

## Owner decision — 2026-10-16

Keep counseling and paid features in the first public release and wait until
all requirements pass. Do not silently replace this with a community-only
launch. Community minimum remains 13; counseling is adult-only (18+), with teen
counseling deferred. Operator: Common Light LLC, Colorado, USA. Monitored
support: support@witnessmovement.com. Mailing address remains unconfirmed.

No legal-safety guarantee, governing law, venue, clinical compliance status,
nonprofit status or store acceptance is established by this decision.
Existing clinical agreements and historical consents are not silently changed.

## Evidence required before release

| Gate | Current evidence / blocker | Next action and responsible access |
| --- | --- | --- |
| One release source | Replit and GitHub main differed at the last read-only comparison; Lovable ancestry/equivalence not proved | Owner selects the authoritative release source. Reconcile/review changes before any production deployment; no force-push, backend replacement or automatic merge |
| Account restoration | Actual Google/Apple initiation passed. Owner returned to sign-in; diagnostics now implemented and mocked tests pass. Public Auth settings GET returned 200 for the existing project | Owner retries; share only the safe reference on failure. Resolve from that evidence, then verify authorized email/recovery and device session flows |
| Age, data isolation and account rights | Local 13+ gate/adult checks and cancellation controls prepared; direct Auth/DB enforcement, other-client adulthood, complete export/deletion/file cleanup unverified | Supported implementation in the existing Lovable-managed backend plus isolated fixtures. Owner grants supported project/runtime access, not a non-exportable service-role key or replacement project |
| Counseling delivery | Care/peer admission refuses without privileged room classification; the last read-only runtime check lacked that access. Provider approval fields and slots do not prove licensing, jurisdiction or operational availability | Supported managed-runtime authorization and actual-client eligibility evidence; professional/legal review of service model and eligible jurisdictions. Validate booking, agreements, attendance and recovery before approval; review any newer completion evidence before carrying forward the runtime blocker |
| Billing and fundraising | Checkout/cancellation source and synthetic checks exist; live sync/recovery and native billing remain unverified | Classify each actual product and storefront using the billing worksheet; approve sandbox-only verification. Verify recipient status and platform/provider contracts; no real charge or donation as a test |
| Safety operations and privacy | Legal documents unfinished; 13+ community includes minors and sensitive religious/health content | Owner/legal reviewer approves actual data practices, child-safety/moderation/report/block/appeal/escalation processes, retention/deletion commitments and provider agreements. Test behavior against those commitments before publication |
| Native/store readiness | Capacitor shell loads live website. Historical Apple signing 401, no signed iOS/TestFlight success evidenced; Play connector host wrong. Local offline/push preparation is not device proof | Owner validates Codemagic Developer Portal integration and matching signing resources; supported connector repair, then separately authorized signing/device/store checks. Replit's guided Expo flow is not an established Capacitor replacement |
| Final legal and release approval | Company/Colorado/age/contact facts confirmed only; no final policies or declarations | Qualified reviewer approves exact policy/clinical documents and re-consent/version plan; complete factual store disclosures, reviewer access and signed-device evidence. Owner reviews evidence, then separately approves publication/submission |

Existing detailed evidence remains in the [main checklist](README.md),
[auth verification](../HOSTED-OAUTH-PREVIEW-VERIFICATION.md),
[native inventory](NATIVE-INVENTORY.md), and
[legal owner worksheet](LEGAL-OWNER-DECISIONS.md). Passing local tests does not
close provider, operational, legal or device gates.

## Owner facts needed first

1. Countries and, for counseling, states/regions to be served at launch.
   Colorado company registration does not itself authorize care elsewhere.
2. Actual paid service types: licensed clinical one-to-one therapy, nonclinical
   coaching/support, group sessions, digital memberships/content, goods or
   fundraising. Do not apply identical billing assumptions to all services.
3. Who contracts with the client, delivers care, verifies licenses and handles
   emergencies; provider employment/contractor and payment-recipient arrangements.
4. Business mailing/service address and authorized policy reviewer; no guessed
   postal address or default venue.
5. Actual data/vendor/retention and moderation operations from the existing
   worksheets, with evidence rather than invented promises.

## Work allowed before those answers

Preserve current features and safe refusals; maintain unpublished fixes and
focused synthetic verification. Prepare factual drafts, operational questions
and supported secure setup instructions. Do not claim readiness or remove
remaining gates to make the checklist appear complete.

This document-only update ran no functional tests/builds, made no live changes,
accessed no secrets, incurred no charges and performed no account actions.
