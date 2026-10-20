# Unpublished launch-scope update: verification and limits

## Superseding follow-through

The sections below record the **earlier** local launch-scope pass. Its preserved
unknown-account access and raw-age-only counseling limits have now been
addressed in local application code; read
[ACCOUNT-ELIGIBILITY-VERIFICATION.md](ACCOUNT-ELIGIBILITY-VERIFICATION.md) for
current behavior, **45 passing tests / 300 assertions**, typecheck/build and
the still-unresolved direct Auth/DB and provider client-lookup limits.
No remote policy or existing account/data was changed by either pass.

## Owner-authorized decisions

- Minimum user age 13.
- Teen counseling deferred until consent/legal arrangements are finalized.
- Operator Common Light LLC, registered in Colorado, USA (owner now confirms).
  Mailing address remains unconfirmed; no governing law/venue is selected.
- support@witnessmovement.com actively monitored for privacy/deletion.
- No legal document is finalized or approved.
- Separate owned Lovable app is receiving scope updates independently.
  Its deletion-request page is prepared/verified in unpublished code per owner;
  not live, not independently inspected here and not deletion-fulfillment proof.

## Changed behavior in this Replit copy

- `launch-policy.ts` validates current whole-year age, rejecting absent,
  fractional, negative, malformed, implausible and below-threshold inputs.
  Current exact age is transient, not persisted; new email signup no longer
  collects a full birth date, and records only minimum-age confirmation/time.
- Email registration uses the guarded action, while normal password sign-in
  and existing-session redirects are preserved.
- Both managed social buttons require age before provider initiation in
  **both** signin/signup modes. “Sign in” can create an account, so switching
  modes no longer skips the local age check. Wrapper calls without age fail
  before SDK invocation. Managed broker/state/security checks are unchanged.
- Conditional invitation checks, safe return paths and email confirmation
  remain. There is no undocumented age-metadata or credential proxy added to
  the managed broker.
- Adult-only care notice appears on counseling directory/editor routes,
  individual counselor requests, therapy home/session and request controls.
  Crisis links are retained and adult requests must be for themselves, not
  for minors.
- Local `requestSession`, `bookSlot` and client `signAgreement` require adult
  age before DB/RPC access; client `startSession` checks before room creation
  or updates. Missing age defaults to rejection. UI submission controls are
  disabled until age is adult, where applicable.
- “Teens” removed from new specialty choices; new profile submissions adding
  it are rejected. Existing legacy specialty values can be preserved on edit;
  no records were removed or rewritten.
- Existing account/session/therapy records, adult professional tools,
  unrelated community functionality and crisis information remain.
- Local legal contacts use the owner-confirmed support address; unconfirmed
  state/address assertions were removed. Draft pages explicitly say unfinished
  and not legally approved; unverified retention timelines are not presented
  as finalized commitments.
- Release materials reflect these decisions and separate unpublished
  deletion-request-page progress from backend implementation/fulfillment gaps.

## Verification completed

- `bun test tests`: **30 passed, 0 failed, 197 assertions**, three files.
  Seven launch-policy tests cover 12/13 and 17/18 boundaries, missing/malformed
  inputs, email-action refusal, social signin-mode/direct-helper bypass attempts,
  adult-care refusal, preserved legacy specialties and UI wiring.
- Actual imported counselor/therapy handlers were called only with synthetic
  identifiers and invalid/missing ages. Tests require the exact policy error
  before any Supabase operation; no real requests/accounts/data were submitted.
- Age 13 passes the injected registration action; age 18 passes the injected
  adult-care action. These are synthetic callback tests, **not** successful
  production registrations or clinical bookings.
- `bunx tsc --noEmit --incremental false`: passed.
- `bun run build`: local web client/SSR/Nitro build passed. Existing Wrangler
  `main` override warning remains. No native/cloud/paid build was run.
- Managed workflow restarted once and serves requests cleanly.
- Phone-size `/login` screenshot rendered age input, social buttons, existing
  password form and honest managed-origin limitation notice; no runtime error.
  Existing password-autocomplete browser warning remains.
- `/therapy` screenshot was covered by the existing first-visit tour. It did
  not verify the counseling controls beneath it. Signed-in clinical UI and
  real-device behavior were not visually or interactively verified.

## Enforcement and readiness limits

These are local **self-attested** age controls, not proof of identity or
legal-compliance certification. A false age can be entered. Existing accounts
are not retroactively classified or blocked; no age audit or data migration ran.
Legacy birthdays remain untouched.

Current counseling helpers call Supabase directly. No separate local HTTP
counseling submission endpoint was found. No remote auth hooks, RLS, RPCs,
managed broker settings or shared database enforcement were changed. Someone
calling remote services directly is outside these guards. A supported managed
backend policy and authorized test environment are still required for
authoritative enforcement.

No social age attestation is proven to persist at the managed provider, and no
full provider/email/native session was completed. Replit broker allowlisting,
the callback-contract/live callback 404, native session handoff, historical
Apple signing 401, wrong-host Play connector and privileged deletion/export
limitations remain open.

Native shells load the existing live website, not this unpublished Replit
copy. No claim is made that remote/Lovable updates or signed binaries contain
these changes. No publication, production settings/DB changes, migrations,
user/account actions, outgoing mail/messages, secrets, paid resources, uploads
or store submissions were performed.
