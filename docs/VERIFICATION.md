# Witness completion pass: verification

## Account-isolated signed media — unpublished

This repairs a source-level cache/display risk, not a confirmed disclosure.
No backend policies/permissions, providers, packages, live data or native release
configuration changed. No real sign-in/signout, message, store action or publication.

### Revision boundary

- Before: clean `main` at
  `28ef81ceef7c2ee2c335d813fcf9ccd935aa4f3c` (completed group-loading repair).
- After, at verification time: the same HEAD plus the uncommitted working-tree
  changes listed below. No new commit or push was made by this repair; a later
  platform checkpoint may assign its own commit. This is not a new release SHA.
- Previous group-loading/auth/eligibility/native/legal repairs were retained.
  Group-loading, prior safety and managed-auth regressions were included below;
  this is not a claim that all earlier runtime/store blockers have been resolved.

### Before / after behavior

- Previously a module cache keyed only by bucket/path could reuse URLs across
  account changes, seed hook state from an expired URL, and accept late responses
  from a preceding identity. Journey playback also copied signed URLs into local
  state without observing identity.
- Now browser-memory media entries are account/bucket/path-scoped and cleared
  on auth identity changes and successful signout. A generation guard also rejects
  A-to-B-to-A late work and stale retry/error callbacks. The existing client auth
  subscription is reused; no extra credential consumer or provider flow exists.
- Hooks derive displayed URLs from the current cache, identity and clock during
  render, never from a previous component URL state. Expired/near-expiry links
  are hidden even when expiry timers have not fired. Timers invalidate links
  30 seconds before the five-minute requested lifetime and trigger renewal.
  Request time, not completion time, bounds caching.
- Private signing waits until initial auth identity is known. Public assets
  (ordinary public URLs/local/data/blob assets) remain usable without signing.
  Anonymous signing for deliberately public pages is kept in its own context.
  Existing Supabase signed-storage URLs are not treated as public pass-through:
  only matching paths on the configured backend can be re-signed.
- Service/playback failures clear private URLs and expose generic retry UI in
  testimony, voice/backdrop, need, profile image/gallery/viewer and journey media.
  Avatars retain their initials fallback. Retry errors never show raw service
  messages or bearer-link values. Journey now uses the shared reactive hooks;
  a late export result cannot initiate a download after its account generation
  changes.
- This does not revoke already-issued bearer links, remove already-downloaded
  bytes, or prove backend authorization. Access removal/RLS, cross-device behavior,
  real-account switching and native WebView playback still need authorized
  isolated integration/device evidence.

### Checks actually run

- `bun test tests/signed-media.test.tsx tests/group-loading.test.tsx tests/witness-safety.test.js tests/managed-social-auth.test.js`
  — **61 passed, 0 failed, 309 assertions**, four files, including 23 new
  signed-media checks. Deterministic clocks, delayed/rejected transport and
  synthetic accounts only; no live service/account/message transport.
- Coverage includes expired first render with suspended timers, proactive expiry,
  normal signing and image/audio/video rendering, account and bucket isolation,
  signout, A-to-B-to-A and late-response rejection, stale mounted callbacks,
  same-account refresh, retry/error redaction, public assets/public-page signing,
  current-client auth-event wiring and the successful/failed signout helper.
- Actual hook source is exercised with injected lifecycle dependencies; actual
  media rendering uses mocked hook transport. These are not a real browser
  account-switch/streaming test or complete native/device validation.
- `bunx --no-install tsc --noEmit --incremental false` — passed.
- `bun run build` — local web build passed. Existing server-function deprecation,
  large-chunk and Wrangler main-override warnings remain. No paid/cloud/native
  build, upload or deployment.
- `git diff --check` — passed for source/test changes.
- Preview workflow restarted, serving without startup errors. Signed-out login
  screenshot at 402×874 preserved existing branding/compact acknowledgement.
  Browser reported an informational password-autocomplete suggestion, no runtime
  error. Authenticated media was not visually verified; no guard was bypassed.

Changed files:

- `src/lib/signed-media-cache.ts` (new)
- `src/hooks/useSignedUrl.ts`
- `src/integrations/supabase/client.ts`
- `src/lib/sign-out.ts`
- `src/components/media/MediaLoadError.tsx` (new)
- `src/components/media/TestimonyMedia.tsx`
- `src/components/media/VoicePrayer.tsx`
- `src/components/needs/NeedMedia.tsx`
- `src/components/profile-media/ProfileImage.tsx`
- `src/components/profile-media/ProfileMediaGallery.tsx`
- `src/components/Avatar.tsx`
- `src/components/journey/JourneyPlayer.tsx`
- `tests/signed-media.test.tsx` (new)
- `docs/VERIFICATION.md`

## Group membership/roster reliability — unpublished

Bounded local repair; no database policy, authentication, live data, publishing,
store build/submission, messaging or account action.

- Membership lookup errors now reject group list, detail and my-groups loads
  instead of reporting non-membership. Roster errors reject instead of returning
  an empty list. Group-related member-card failures also propagate; other
  callers of `loadAuthors` retain their existing behavior.
- Community discovery, circle detail, My People/Prayer Circle, and the
  “I'm not okay tonight” recipient panel show plain-language service/access
  failure with an accessible Try again button. Retry refetches the failed query.
  Real empty groups/membership/rosters and normal successful results remain
  distinct from loading and errors.
- Dependent circle content does not present false empty results or cached
  partial people after an error. Failed/pending recipient loading cannot trigger
  the support-message send action; crisis links remain accessible. No message
  was sent during verification. Detail roster cache keys now include account ID.
- No broader group visibility/role/media authorization fixes are claimed.
  Successful RLS-filtered empty responses cannot be distinguished from genuinely
  empty data without a service error; backend policy verification remains open.

Checks actually run:

- `bun test tests/group-loading.test.tsx tests/witness-safety.test.js`:
  **30 passed, 0 failed, 138 assertions**, across two files. Fifteen new focused
  checks cover successful and empty reads, permission/service/transport failures,
  strict member-card behavior, all four affected screen presentations, stale
  cached data on failure, loading, retry handlers, and disabled recipient sending.
  Screens/readers use real source with injected synthetic dependencies; no live
  auth, database, router transport or messaging service is invoked. These are
  mocked rendering/behavior checks, not authenticated browser/device tests.
- TypeScript: `bunx --no-install tsc --noEmit --incremental false` passed.
- `bun run build`: local web build passed. Existing server-function deprecation
  and Wrangler main-override warnings remain; no native/cloud build was run.
- Preview workflow restarted and serving, Vite ready without startup errors.
  Signed-out `/walk` screenshot at 402×874 showed the existing account-resolution
  protection screen, existing branding and help/cancellation links, without
  browser console errors. It did **not** render signed-in group content or prove
  live error recovery. Auth/eligibility guards were not bypassed.
- `git diff --check` passed for the source/test changes.

Changed files:

- `src/lib/groups.ts`
- `src/lib/prayers.ts`
- `src/components/walk/GroupLoadError.tsx`
- `src/routes/walk.index.tsx`
- `src/routes/walk.$id.tsx`
- `src/routes/circle.tsx`
- `src/components/mens/NotOkayButton.tsx`
- `tests/group-loading.test.tsx`
- `docs/VERIFICATION.md`

Prior results below describe earlier scopes, not additional tests run for this
repair.

## Latest compact community-entry update

Unpublished login/signup and account eligibility now reuse the app icon.
Community acknowledgement is one checkbox plus Continue, versioned as a
13-or-older declaration without replacing existing ages or granting adulthood.
Before you enter no longer repeats the long terms card. Adult-care and clinical
agreements remain separate; all linked legal documents remain unfinished drafts.

Latest local checks: **77 passing tests / 576 assertions**, TypeScript and local
web build pass; mobile login/signup visually checked. Authenticated screens were
tested synthetically, not with real accounts or native devices. See
[community entry verification and remaining limits](COMMUNITY-ENTRY-VERIFICATION.md).
Earlier counts below are historical, not the latest suite total.

## Registration fact and billing-review documentation follow-through

Owner confirms Common Light LLC registered in Colorado, USA. Mailing address
remains unconfirmed; no Denver address, governing law or venue is inferred.
All legal/store text remains unfinished draft material.

Recorded final **62 passing tests / 424 assertions**, TypeScript and local web
build are **local checks only**. This documentation/static-text update reran no
functional tests or builds and changes no app behavior. Call classification
needs privileged runtime access; otherwise all calls refuse, including peers.
Other-client adulthood is inaccessible; live cancellation/sync and device flows
are unverified; direct Auth/database enforcement remains unresolved.
Native billing is not validated. Review [actual SKU, beneficiary and storefront
decisions](release-readiness/STORE-BILLING-REVIEW.md); no compliance is declared.

## Latest call/stop/checkout and launch-draft follow-through

[ACTION-BOUNDARIES-VERIFICATION.md](ACTION-BOUNDARIES-VERIFICATION.md) supersedes
earlier gaps for these local paths. **62 tests / 424 assertions**, typecheck and
web build passed. Runtime/provider/account checks remain unperformed. Classifier
access is fail-closed and still needs the existing supported managed runtime;
this is not a statement that live peer/care calls or actual cancellations pass.

## Current account-bound eligibility follow-through

[ACCOUNT-ELIGIBILITY-VERIFICATION.md](ACCOUNT-ELIGIBILITY-VERIFICATION.md) records
the current gate, strict self-attestation, auth-race/provider-attempt regressions,
actual-client care checks and refused provider paths.
**45 tests passed / 300 assertions**; TypeScript and local web build passed.
No real account, confirmation write, counseling action, native build, migration
or publication was performed. Older entries below remain historical.

## Unpublished launch-scope pass

See [LAUNCH-SCOPE-VERIFICATION.md](LAUNCH-SCOPE-VERIFICATION.md) for the current
minimum-age and adult-care controls, confirmed owner facts and limits.
Local tests: **30 passed / 197 assertions**; TypeScript and local web build
passed. No remote policy, publication, native build or real-account test.
The older results below remain historical, not additional current test runs.

## External hosted-broker investigation (latest local pass)

- Installed `@lovable.dev/cloud-auth-js` version 1.1.2 documentation, types and
  source support an absolute `oauthBrokerUrl`. Synthetic SDK tests verify external
  returns, iframe `web_message`, existing trusted-origin checks and state validation.
- Actual harmless HTTP requests to the Witness hosted broker using this
  Replit origin's `/login` return (including a safe `next` query) reached
  `oauth.lovable.app` but stopped at HTTP 400 for BOTH Google and Apple, in
  both top-level redirect and iframe `web_message` modes.
- Exact non-secret error: `Authorization request is invalid: redirect_uri is
  not allowed`; error code `invalid_request`. No provider page was reached with
  a Replit return. This is distinct from the preview's missing local broker 404.
- Dependent application changes were stopped. The installed capability is
  supported, but the host's external-return policy must permit the exact origin
  before it can be enabled. No proxy, wider trust, direct Supabase fallback,
  provider-mode change, or backend switch was introduced.
- Lovable's platform documentation permits custom mobile schemes in Advanced
  Redirect URLs. SDK 1.1.2 only documents browser/Lovable-app-specific handoffs;
  there is still no established secure custom Witness Capacitor session transfer.
  Native social login remains explicitly unavailable.
- Fresh live `/auth/callback` request returned HTTP 404. Local callback-related
  changes are unpublished, and this copy has no `/auth/callback` web route.
  Current managed buttons request `/login`; the separate 404 does not establish
  a defect in their provider initiation or prove successful session completion.
- `bun test tests`: 23 passing tests, 99 assertions; TypeScript and local web
  production build passed. No new paid/cloud/native build was started.
- No interactive browser-button/consent/session-completion test was performed.
  The previously reported browser-testing service limitation remains.
- Only tests and readiness notes changed in this pass. No application/provider
  configuration, live authentication, production data, credentials, email,
  accounts, publication or remote synchronization was changed.

## Managed social-login correction (previous local pass)

- GitHub's Witness login source uses `lovable.auth.signInWithOAuth`, not direct
  Supabase OAuth. The Replit buttons now use that same existing wrapper through
  a small native-capability guard. Backend and provider settings were unchanged.
- `bun test tests`: 21 passing tests, 82 assertions, zero failures. New coverage
  executes the installed SDK with synthetic browser globals for both providers,
  broker initiation, iframe state/origin validation, native refusal, and malformed
  email-callback rejection. Button-to-handler binding is source-contract coverage,
  not an actual browser click.
- `bunx tsc --noEmit --incremental false`: passed.
- `bun run build`: passed (local web build only; no cloud/native build).
- Workflow restarted successfully; `/login` screenshot shows both social buttons,
  email/password form and an explicit preview/native limitation notice. No browser
  runtime error in that capture.
- Harmless HTTP routing on the existing live site for each provider:
  `witnessmovement.com/~oauth/initiate` → `oauth.lovable.app/initiate` →
  genuine provider HTML, HTTP 200: Google Accounts (`accounts.google.com`,
  title "Sign in - Google Accounts") and Apple (`appleid.apple.com`,
  title "Sign in to Apple Account"). No credentials or consent entered.
- Replit-origin `/~oauth/initiate` returns HTTP 404 for both providers. No
  broker/proxy was added. A separate named Lovable deployment origin was not
  identified or tested; the verified live origin uses Lovable's hosted broker.
- Actual browser-button navigation could not be exercised: the documented
  testing subagent rejected its invocation with "Unknown config kind: testing".
  HTTP routing and SDK tests are not a completed interactive login.
- Native social sign-in explicitly refuses the undocumented Capacitor handoff.
  The installed SDK's Lovable-app-specific behavior does not establish support
  for Witness. Email confirmation/recovery PKCE remains separate and untested on
  real devices; the old direct-social callback is rejected.
- Owner/checklist instructions corrected: Lovable Cloud's service-role key is
  intentionally non-exportable; stop requesting it. Manual Google/Apple secrets
  are not prerequisites for managed sign-in. Prior direct-endpoint 400 findings
  do not diagnose managed OAuth.
- No live auth/configuration/database changes, remote synchronization,
  deployments, paid builds, email, accounts, payments or credential rotation.

## Earlier checks (not repeated unless listed above)

## Passed

- `bun test tests`: 15 tests, 46 assertions, zero failures (synthetic only).
- `tsc --noEmit --incremental false`: no diagnostics.
- `bun run build`: successful client, SSR and Nitro production build.
  Existing input-validator deprecation and bundling warnings remain.
- `bun run mobile:sync`: Android and iOS sync passed; six native plugins detected.
- Native URL scheme configuration parses in Android XML and iOS plist.
  Android notification permission is declared.
- Replit preview `/login`, `/forgot-password`, `/reset-password`: HTTP 200.
- `/api/public/cron-health` without credentials: HTTP 401; no side effects.
- Login screenshot rendered correctly, without a browser runtime error.
- GitHub repository read: HTTP 200, connection reports push permission.
- Codemagic existing build metadata: HTTP 200.
- Supabase public auth settings: HTTP 200, email/Google/Apple enabled,
  email confirmation required.

## Earlier findings, with corrected interpretation

- Direct Supabase Google/Apple authorize requests returned HTTP 400, missing
  OAuth secret. These tested the wrong service, not managed social sign-in;
  they are NOT provider-credential setup blockers for the Lovable broker.
- Fresh Google Play reviews request: HTTP 404, HTML response from the
  documented incorrect connector base host.
- Last signed iOS build remains failed. Its previously inspected signing log
  showed Apple API HTTP 401. Current saved Apple credential validity cannot
  be inferred from build history.
- Last Replit secret inventory covered CODEMAGIC_API_TOKEN and SESSION_SECRET.
  Prepared privileged routes remain blocked: the managed service-role key is
  intentionally non-exportable. A supported managed server/API implementation
  is needed, not a request for that key. Feature-provider permissions remain
  separate; the existing live host's private inventory is unknown.
- No published Replit deployment found. The live domain is separate.

## Test coverage limits

Account tests verify display/storage isolation between synthetic accounts,
signed-out write prevention, legacy preservation/idempotent recovery, preservation
of same-day conflicts, failed-save handling and account-local cleanup.
They do not establish encryption against someone with device/browser access.

Export tests verify pagination beyond 1,000 rows, explicit query failures,
credential-field exclusion and core collection coverage. Storage tests check
failure propagation. AI consent is a source-contract test, not an interactive
signed-in browser test. Credential rotation checks use synthetic strings only.

## Untested / not applied

- Real Google/Apple/email login, signup confirmation, reset delivery/password
  change and authenticated sessions. No account was created and no mail was sent.
- Signed-in journal/export/AI-consent UI; two real accounts and all database RLS.
- Account-deletion migration, actual foreign keys, financial anonymization,
  file cleanup, concurrent writes, transaction rollback and clinical retention.
  Migration is prepared, NOT applied. No real account/file was deleted.
- Original media downloads from export links; the JSON manifest is not a ZIP
  of media bytes. Journal sync and other-device offline deletion are not implemented.
- New native compilation/signing after these edits, actual phone email callback
  delivery, email PKCE exchange, foreground/background/cold-launch restoration.
  Capacitor sync is not a native compile or device test.
- Android push delivery; native iOS FCM bridge/APNs sender remains unfinished.
- Payments/webhooks, mail/Gmail, AI gateway, Maps and Firebase authorization.
  No paid model call, charge, refund, email or push send was performed.
- Live cron replacement/scheduler migration and dependent provider verification.
  Existing live keys and jobs were NOT revoked or changed.
- Play upload acceptance, internal-test rollout and installation; no store
  submission, public release or new paid cloud build was started.
- Exact Replit workspace-link 404 cause. This is not the connector or OAuth error.

The prepared SQL changes require staging testing and schema regeneration before
production application. Source and website changes have not been deployed or
synchronized to the remote build branch in this pass.
