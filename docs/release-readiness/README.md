# Witness release-readiness package

**INTERNAL REVIEW DRAFT — NOT APPROVED FOR STORE SUBMISSION**

Latest authentication follow-through: [hosted OAuth connection and callback
restoration diagnostics](../HOSTED-OAUTH-PREVIEW-VERIFICATION.md).
**27 focused tests / 222 assertions**, TypeScript and local web build passed.
These are synthetic/mocked checks, not completed owner sign-in evidence.
Earlier [call, stopping controls and server checkout checks](../ACTION-BOUNDARIES-VERIFICATION.md)
passed **62 local tests / 424 assertions**. Call admission remains fail-closed
without authoritative classification. No live runtime/settings/data changed.

Prepared 2026-10-15 from this workspace, existing verification notes, harmless
public-page requests, and current official platform documentation. The owner
explicitly confirms that legal documents are **not finished**. Existing public
legal pages do not override that statement.

## Owner-confirmed launch scope and local enforcement

- **2026-10-16 release decision:** keep adult counseling and paid features in
  the first public release; wait until all required evidence passes rather
  than substitute a community-only launch. This does not authorize publication,
  charges, account actions or unreviewed policies. See the
  [full-scope launch gates and owner inputs](FULL-SCOPE-LAUNCH-GATES.md).
- Operator **Common Light LLC**, registered in **Colorado, USA** (owner-confirmed).
  Mailing address remains unconfirmed; no governing law or venue is selected here.
- **support@witnessmovement.com** is actively monitored for privacy/deletion,
  confirmed by the owner, not independently mail-tested.
- Minimum user age **13**. New local email registration and **all** local
  Google/Apple initiations require the compact unchecked community acknowledgement.
  Social “sign in” can create accounts, so its check is not restricted to signup.
  This checkbox declares only 13-or-older; it does not collect an exact age or
  birthday, erase known age information or establish adulthood.
- Existing accounts and email/password sign-in are preserved, but **all
  signed-in accounts, including old/unknown accounts, must separately confirm
  minimum age 13** before protected components mount. No creation-date exemption.
  The current acknowledgement separately records minimum-age self-declaration,
  version, account ID and time. Existing age bands are preserved, not silently
  upgraded or replaced. Missing/invalid confirmation or unresolved auth keeps content closed.
  This is self-attestation, **not** verified age or legal certification.
  Public legal/crisis/contact/deletion help remains available without the
  protected shell/background queries. Direct Auth/DB/server-function calls are
  not secured by this browser boundary.
- Pre-auth social age is cleared before initiation and on completion/failure;
  it never becomes post-auth confirmation. The save uses the rendered account
  ID plus a captured verified token, rejects account switches and verifies the
  stored result for that same account. No OAuth broker interface was extended.
- Teen counseling is **deferred** pending consent/legal arrangements. New
  counseling requests, client care-agreement signing and bookings require an
  adult-age check in their actual local handlers as well as UI controls.
  Actual-client adult metadata is checked as well as transient request age.
  Client session initiation is guarded using a canonical loaded session, not
  caller-supplied participants. Acceptance and therapist initiation refuse
  when this publishable client cannot safely establish another client's adult
  self-attestation. Eligible adult self-request/booking/agreement/client-start
  paths remain; not every provider path is operational. Old records remain.
  No new “Teens” specialty is offered; legacy specialty data is preserved.
  Crisis and unrelated community/adult functions remain.
- No local server endpoint for these counseling submissions was found: current
  helpers call Supabase directly. Guards do not change remote RLS, RPCs,
  operator/provider access, direct API clients, or existing hosted/native code.
- Earlier gate verification: **45 tests / 300 assertions**, TypeScript and web
  build passed. See [account eligibility verification](../ACCOUNT-ELIGIBILITY-VERIFICATION.md).
  No signed-in account action or live confirmation write was tested.
- The owner reports the owned Lovable app is receiving the same scope updates
  separately, and its public deletion-request page is **prepared and verified
  in unpublished code**. No exact new page URL or independent verification of
  that separate code was available here. It is not live and is not proof of
  deletion implementation, file cleanup, fulfillment or retention.

## Review documents

1. [Draft Apple and Google listings](STORE-LISTINGS.md)
2. [Native configuration, signing, artifacts and platform requirements](NATIVE-INVENTORY.md)
3. [Source-based permissions and data-disclosure worksheet](DATA-AND-PERMISSIONS.md)
4. [Unapproved legal facts and owner decisions](LEGAL-OWNER-DECISIONS.md)
5. [Reviewer instructions and missing access](REVIEWER-INSTRUCTIONS.md)

These are review materials, not completed privacy labels, legal advice, signed
compliance declarations, approved policies, or evidence of store acceptance.
No screenshots, credentials, company details or test results have been invented.

## Public links checked

GET requests with a browser user agent returned the following on 2026-10-15.
Initial Python-default-user-agent requests returned 403; browser-user-agent
requests then returned the results below. Availability is client-dependent and
must also be checked by the owner on ordinary browsers/devices before submission.
No authenticated action was performed.

| Purpose | URL | Observed result / limitation |
| --- | --- | --- |
| Website | https://witnessmovement.com | Existing live native-shell destination; not a new Replit deployment |
| Privacy | https://witnessmovement.com/privacy | HTTP 200; title “Privacy Notice \| Witness”; existing, **unapproved**, not a verified complete policy |
| Terms | https://witnessmovement.com/terms | HTTP 200; title “Terms of Use & Beta Agreement \| Witness”; existing, **unapproved** |
| About | https://witnessmovement.com/about | HTTP 200; title “About · Witness”; not established as a dedicated support page |
| Support contact | `mailto:support@witnessmovement.com` | Present in live privacy and terms HTML; owner confirms actively monitored for privacy/deletion. No delivery test/email sent |
| App support URL | **NOT VERIFIED** | No dedicated public customer-support web page established. `/help` is a community-help feature, not app support |
| Account/data deletion web URL | **NOT LIVE / exact new URL not supplied** | Owned Lovable deletion-request page prepared/verified in unpublished code per owner; not independently inspected here. Backend implementation and fulfillment evidence remain separate gaps |
| In-app account controls | https://witnessmovement.com/profile | HTTP 200 public page shell; signed-in account/deletion UI and backend success NOT tested |
| Auth callback | https://witnessmovement.com/auth/callback | HTTP 404; callback-related local work is unpublished; local copy also lacks this web route |

Live privacy/terms expose the owner-confirmed support address. Local contact
source now uses it consistently and removes unconfirmed jurisdiction/address
assertions. Local and published legal content are not interchangeable. No live
legal pages or contact settings were changed.

## Prioritized completion gates

All gates remain **open**. Do not mark ready to submit.

### P0 — Legal, identity and access

- Owner/legal reviewer completes the legal worksheet and approves exact policy
  text, governing-law/venue and postal-address decisions, and operational retention commitments.
  Operator/Colorado registration/monitored contact and minimum age are confirmed. Publish
  approved public support/privacy/terms/deletion resources later, with explicit
  authorization; this package does not publish them.
- Resolve callback contract before requesting an allowlist: this copy explicitly
  requests `/login`, whereas the owned Lovable source uses `/auth/callback`.
  Replit callback base currently requested:
  `https://4dd25188-7910-46e7-bf1e-c5270656a0a9-00-1mo8g1zllxj7o.spock.replit.dev/login`.
  This development origin is temporary, not a permanent release URL. After
  owner allowlisting, both actual top-level preview buttons reached genuine
  Google/Apple login pages through the supported absolute hosted broker.
  The owner subsequently reported returning to sign-in; callback diagnostics
  are now prepared, but full session completion remains unconfirmed.
  No proxy or direct Supabase fallback was added.
- Preserve Lovable-managed Google/Apple, existing Apple mode/identities and
  backend `bnsdkixoyxfbhpugkddk`. No migration to the empty alternative project.
  Managed service-role key is intentionally non-exportable; do not request it
  or manual OAuth secrets as prerequisites for managed sign-in.
- Establish and verify a supported secure native social-session handoff.
  Currently native social initiation is explicitly blocked in the local copy.
  A custom-scheme allowlist alone does not transfer a session.
- Verify email sign-in/recovery/confirmation and warm/cold/resume restoration
  with owner-authorized review accounts/devices later. No real accounts were
  created or modified here.
- Privileged invitation redemption, full exports/deletion and file cleanup
  need an authorized managed-runtime implementation and staging evidence.
  Local prepared changes do not prove live capability.

### P0 — Signing and distribution access

- Codemagic's workflow-list API most recently returned 200 and listed the three
  Witness workflows; this **does not validate Apple signing**. `witness-ios`
  selects **Codemagic API Key**. Historical signed build failed with Apple HTTP
  401. Readable API schema exposes no Developer Portal integration-list or
  non-build connection-validation operation. Invalid key vs issuer/team/role
  cannot be distinguished from that historical error alone. Owner checks
  Codemagic → Team settings → Team integrations → Developer Portal →
  Codemagic API Key and confirms the intended team/permissions securely.
- Google Play connection `connection:conn_google-play_01M4VECNCMYPB2GC6DVHWMBFA9`
  (“Google Play”, slug `google-play`) targets `https://play.googleapis.com`.
  Publisher API needs `https://androidpublisher.googleapis.com`. Its HTML 404
  is not a diagnosis of OAuth failure. No supported connection-host edit is
  exposed to this agent; the owning admin/settings location is not established
  for this connector. Do not delete/recreate it or extract tokens.
- Confirm the existing upload certificate/app signing relationship and
  highest used version/build numbers in the actual store consoles. Owner
  previously reported adding an AAB; API/store acceptance remains unverified.

### P1 — Evidence and policy classification

- Compact community entry is prepared in unpublished source; see
  [checks and declaration limits](../COMMUNITY-ENTRY-VERIFICATION.md).
  Latest suite: **77 pass / 576 assertions**; TypeScript/local web build pass.
  The checkbox declares 13+ only, preserves existing ages and does not grant
  adult care. Legal approval, authenticated save and native/device evidence
  remain required; these local results do not establish store readiness.

- Local native connection-error wiring and Debug/Release push entitlement
  preparation are complete: [checks and owner signing steps](../NATIVE-PACKAGING-VERIFICATION.md).
  Focused checks: **14 pass / 89 assertions**; TypeScript and local web build pass.
  These do not establish native load-failure recovery, signed APNs entitlement,
  device registration/delivery or store readiness. Real-device/provisioning
  checks remain required; historical Apple 401 is unresolved.

- Complete the [draft store-billing review](STORE-BILLING-REVIEW.md): classify
  actual 1:1 counseling, group digital access and regulated clinical services;
  verify each fundraising beneficiary's nonprofit/tax-exempt evidence; select
  storefronts and any external-link/alternative-billing programs. Apple and
  Google rules differ. **Native billing is not validated; no compliance claim.**
- Obtain current signed iOS and Android release evidence, real-device tests,
  permission-denial/offline/accessibility checks, accurate screenshots and
  reviewer access. Future builds/uploads require separate authorization.
- Complete App Privacy, Play Data safety, updated Apple age rating, Play content
  rating/target audience and applicable health/financial/UGC declarations from
  the worksheet and live operations, not from installed packages alone.
- Review broad Android photo/video permissions, iOS required-reason manifests,
  APNs/FCM capabilities, 16 KB native-library compatibility and hosted-shell
  minimum-functionality risk before claiming conformance.
- Review every digital subscription/giving/physical-goods checkout against
  storefront-specific billing rules. Stripe code is not evidence of compliant
  native digital purchases or nonprofit approval.
- Supply a managed isolated staging environment. None is established; do not
  substitute the unresolved empty project. No live cron rotation has occurred:
  verify scheduler dependencies and secure staging before any future rotation.

## Evidence boundaries

- Existing `docs/VERIFICATION.md` records **23 tests / 99 assertions passing**,
  TypeScript passing and a local web production build passing in the previous
  auth pass. These were not repeated for this documentation-only package.
- Existing records report an unsigned iOS simulator compile, an Android signed
  build and an iOS signing failure; see inventory for current files and limits.
- Google/Apple actual top-level Replit buttons reached genuine provider pages.
  Initiation is not completed sign-in: the owner's later return-to-sign-in
  report remains unresolved. The subsequent diagnostics were tested with mocked
  transport, not another real session. Native handoff remains unsupported.
- Journal/export/AI-consent tests are synthetic/source-contract coverage, not
  real-account RLS, file-deletion, message-delivery or payment evidence.
- Distinguish the Replit workspace-link 404 (cause unresolved), preview broker
  404, Play wrong-host 404, live callback 404, and wrong-flow direct-Supabase
  missing-provider-secret 400. They are different problems.
- Initial package creation changed documentation only. The subsequent local
  launch-scope pass adds age/care guards and draft/contact updates; see
  `docs/LAUNCH-SCOPE-VERIFICATION.md`. It performs no cloud/mobile builds,
  uploads, submissions, publication, mail, purchases, user tests, DB changes,
  secret reads/rotation or production setting changes.
