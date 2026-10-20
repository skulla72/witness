# Unpublished call, cancellation, checkout and draft-wording corrections

## Status

Local implementation and synthetic regression checks completed. **Not a live
readiness claim.** No real call/media, account, cancellation, payment, refund,
deletion, provider message, database/settings change, migration, credential
change, paid build/resource, upload, publication or store action was performed.
The existing backend, native identifiers and signing/provider modes are unchanged.

## Call admission

- Every `/call/$id` entry, including an existing incoming call or assigned care
  room, now waits for authenticated server admission before the media/signaling
  component mounts. Response is keyed to account/room/call, ignoring stale results.
- Server checks fresh identity, expected account, actual room membership and
  that an incoming call ID belongs to that room.
- Classification reads **all** linked therapy-session participant pairs through
  the existing privileged server reader. A user's RLS-filtered empty response
  is not treated as proof that a room is peer/community.
- Public/user credential kinds cannot certify classification. Existing secret
  API key/service-role JWT shape is checked internally without logging values;
  the backend must still authenticate the actual request. Shape checks are not
  a verified connection or a guarantee of correct production configuration.
- A real empty authoritative result preserves peer/community calls for eligible
  13+ users; there is no blanket adult-age requirement for peer calls.
- Linked care requires the actor to be an actual client/therapist and establishes
  adult self-attestation for **each actual client**. Existing assignment, clinician
  adulthood, caller-supplied hints and a previously started room do not substitute.
- Another client's adult Auth metadata still cannot be read safely with this
  copy's supported access. Clinician/extra-participant admission refuses rather
  than guessing. No new shared permissions or credential proxy was introduced.

**Runtime blocker:** the managed service-role key is intentionally non-exportable.
The app's existing privileged server dependency has not been verified here. Without
an authenticated authoritative reader, classification refuses **all** calls,
including peer rooms; it does not silently fall back to user RLS. Peer logic is
preserved and tested with authoritative fixtures, but live peer preservation is
not established. A supported managed hosting/runtime capability is required—not
a request to export that key or switch to the empty Supabase project.

## Isolated authenticated stopping controls

- `/account-controls` bypasses only the age gate to a standalone route outlet,
  never the protected shell/community content. The eligibility screen links to it.
  It remains usable with missing, failed, malformed or under13 assertions once
  authentication itself is established.
- Anonymous users see sign-in help. Server operations still require verified
  authentication, expected-account matching and fresh ownership/organization
  leader checks. A body-supplied account ID cannot authorize a different identity.
- Minimal own open-session and recurring-item references/statuses are listed,
  not clinical reasons/notes, content feeds or full account records.
- A participant may cancel their open booked/in-progress session without an age
  lookup. Completed records are not reopened; records are not deleted.
- Own recurring gifts stop immediately; professional/organization plan renewal
  stops at period end, matching existing behavior. Prior payments are not refunded.
- Subscription/provider/environment come from the owned saved record, never a
  caller-supplied environment or subscription ID. Existing dependencies must
  prepare before provider action. Already stopped provider states are handled.
- Provider stop followed by failed/no-row record update is reported as partial,
  not successful fulfillment. Dependency/provider failures do not mark records
  stopped. UI has refresh/retry and confirmation of consequences.
- The controls expose no checkout, restart, new charge, refund or account deletion.

**Runtime limitation:** own list/session cancellation uses existing authenticated
backend/RLS; recurring stop additionally needs existing payment credentials and
privileged record-update access. Those real provider/backend operations were not
tested or repaired. Missing auth/network/dependencies still prevents completion,
with a refusal—not an age-related lockout or an invented success.

## Application-owned purchases

- All seven existing Checkout-session entry points and the saved-method direct
  charge check a fresh server `getUser` response and strict account-bound
  self-attestation before pending records/provider work.
- Community account-owned purchases require valid 13+; counseling-kind purchases
  require 18+. Professional-page category comes from the loaded `pro_profiles`
  record; Counseling/Therapy categories get the adult check before subscription
  creation. No standalone paid clinical-session checkout was invented.
- Lookup/configuration/network/identity mismatch refuses with a retry message and
  keeps stopping controls available. Missing/invalid confirmation asks for 13+;
  teen counseling purchase refuses explicitly.
- Store checkout is now account-required rather than allowing a guest bypass.
- These remain editable self-attestations, not age proof. Direct managed Auth,
  database/RPC/external-client enforcement and authoritative age/care-category
  decisions remain unresolved. Cancellation endpoints deliberately do not require
  purchase eligibility.

## Legal draft wording

- Removed private-beta sign-in metadata and the beta-confidentiality requirement
  in terms and the community-terms display. Member privacy/audience protections
  remain. Conditional invitation implementation/storage keys are preserved.
- Terms/community/care wording explicitly says unfinished/unapproved draft for
  intended public release, not a final binding public-release approval.
- Historical covenant version identifier/acceptance records were not rewritten
  or remotely changed. Owner/legal must choose an approved version and re-consent
  plan before publication; these display edits do not finalize that revision.
- Account-removal/privacy explanations no longer promise full/permanent erasure
  or financial-record anonymization/retention outcomes. They warn that destructive
  successful steps may be irreversible, file cleanup can fail, other devices/
  legacy copies remain, and fulfillment/financial treatment is unverified.
- Confirmed facts: Common Light LLC, USA, minimum13, teen counseling deferred,
  monitored support@witnessmovement.com. Owner now confirms Colorado, USA
  registration; mailing address remains unconfirmed. No governing law/venue is selected.
  Retention/deletion commitments and all legal documents remain unfinished.

## Actual local results

- `bun test tests`: **62 passed, 0 failed; 424 assertions across five files**.
- `bunx tsc --noEmit --incremental false`: passed.
- `bun run build`: client/SSR/Nitro build passed; existing Wrangler-main override
  warning remains.
- `git diff --check`: passed.
- New regressions cover existing assigned care rooms, actual clients versus
  clinician/extra members, 13+ peer preservation, classification errors and
  public/user-key rejection, incoming-room binding and media-mount ordering.
- Checkout regressions cover fresh-user failures, wrong identities, unknown
  eligibility, 13+/18+ boundary, canonical professional category, all eight
  charge/checkout paths and no provider work on failed checks.
- Stop regressions cover unknown/failed/under13 confirmation, own versus foreign
  sessions/subscriptions, org-manager checks, bad environments, unavailable
  dependencies, provider failure and partial record-save failure after a stop.
  All provider/account/record inputs are synthetic or dependency-injected.
- No real signed-in two-account UI, provider stop, clinical participation, native
  session or authenticated production server readiness was verified.
- Preview workflow restarted cleanly. Phone-size `/account-controls` capture
  rendered the standalone controls explanation, public help and initial
  authentication-resolution state without the age gate or protected shell.
  No runtime errors were reported by that capture. It does not verify completed
  authentication, loaded private control items or a successful stop.

## Still blocking publication

The latest registration-fact/documentation update changed no behavior and did
not repeat functional tests or builds. The 62/424, TypeScript and build results
above remain **prior local checks only**, not live readiness. Native billing is
not validated; see the [draft store-billing review](release-readiness/STORE-BILLING-REVIEW.md).

Supported runtime access for authoritative classification/record updates;
other-client adult evidence; managed backend direct enforcement; broker allowlist/
callback and native session handoff; signing/store connection issues; isolated
integration/device tests; approved legal/version/retention/deletion decisions and
verified deletion/export fulfillment. This pass authorizes no live changes.
