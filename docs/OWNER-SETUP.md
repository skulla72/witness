# Witness: completion and owner setup

Current local stopping/checkout/call-admission work is recorded in
[ACTION-BOUNDARIES-VERIFICATION.md](ACTION-BOUNDARIES-VERIFICATION.md).
`/account-controls` deliberately requires authentication/ownership, not minimum
age. Authoritative room classification still requires the app's supported
privileged runtime; do not export the Lovable-managed service-role key, use an
empty replacement backend, or treat a user-filtered empty result as peer proof.

These are separate accounts and failures. Replit/GitHub/Codemagic access does
not authorize Supabase provider settings, the existing site's host, or Stripe.
Never put credentials in chat, Git, browser code, or `VITE_` variables.

## Internal store-readiness review package

See [release-readiness/README.md](release-readiness/README.md) for draft store
listings, native/signing inventory, permissions/data worksheet, legal owner
decisions and reviewer-access gaps. Legal documents are unfinished and
unapproved; existing public pages do not establish submission readiness.

### Owner-confirmed local launch decisions

Common Light LLC is registered in Colorado, USA, as confirmed by the owner.
Mailing address remains unconfirmed; do not infer Denver, governing law or venue.
support@witnessmovement.com is actively monitored for privacy/deletion.
Minimum user age is 13. Teen counseling is deferred pending consent/legal
arrangements. Local email registration and all social initiations check age;
every signed-in account must additionally confirm an account-bound 13+
self-attestation before protected components mount. Unknown/older accounts
are not exempt. Public crisis/legal/contact/deletion help remains accessible.
Adult-care handlers check the actual client's account-bound adult assertion,
and refuse provider acceptance/start if client evidence is unavailable.
These editable self-attestations do not alter remote auth hooks or database
enforcement and do not certify compliance. No existing user/data was changed
by this implementation pass.

The owned Lovable deletion-request page is prepared/verified in unpublished
code per owner, but not live. No new URL, remote implementation or fulfillment
verification is established here. Legal drafts remain unfinished/unapproved.
See [launch-scope verification](LAUNCH-SCOPE-VERIFICATION.md).
Current follow-through: [account eligibility verification](ACCOUNT-ELIGIBILITY-VERIFICATION.md).

### OAuth return and unresolved runtime limits

Current Replit Google/Apple return URL (origin and path only):
`https://4dd25188-7910-46e7-bf1e-c5270656a0a9-00-1mo8g1zllxj7o.spock.replit.dev/login`.
The handler explicitly uses `/login`, not `/auth/callback`. This development
hostname is temporary, not a guaranteed stable or release address; reconfirm it
before supported allowlisting. Broker rejection/full session completion remain
unresolved; do not use a proxy or direct Supabase OAuth fallback.

The final **62 passing tests / 424 assertions**, TypeScript and local web build
are local checks only, not live provider/device validation. Authoritative call
classification requires privileged runtime access; otherwise **all calls refuse,
including peer calls**. Other-client adulthood remains inaccessible. Live
cancellation/record sync and device flows are unverified; direct Auth/database
enforcement is unresolved. Native billing is not validated. Complete the
[draft store-billing classification review](release-readiness/STORE-BILLING-REVIEW.md)
before selecting any implementation or claiming compliance.

## Environment boundaries

- Existing Supabase project: `bnsdkixoyxfbhpugkddk`.
- Existing native app identifier: `com.commonlight.witness`.
- Existing live website: `https://witnessmovement.com`.
- Both native shells load that live website. Replit edits and Capacitor sync do
  not deploy the website or rebuild the signed binaries already downloaded.
- Current Replit public variables point at the same database as the existing
  site. It is NOT a separate staging database. Do not apply migrations, rotate
  live keys, delete accounts, send mail, or run financial tests there blindly.
- The Replit deployment check found no published Replit deployment. The live
  site's host owner, deployed revision, and private configuration remain unknown.
  Wrangler configuration in source is not proof of current hosting ownership.
- Keep each host's configuration separate. For safe destructive-flow tests,
  obtain a staging Supabase project and staging host first; do not copy live users.

## 1. Lovable-managed member authentication (highest priority)

The owner confirmed that Witness uses Lovable Cloud-managed backend
`bnsdkixoyxfbhpugkddk`. Preserve its existing identities and managed Apple mode.
Its server service-role key is intentionally non-exportable. Do not request it
from the owner, substitute a different project's key, or switch backends.

Google and Apple buttons use the existing `lovable.auth.signInWithOAuth` wrapper.
The SDK defaults to `/~oauth/initiate` on the current origin. It handles browser
redirects or iframe web-message responses, including origin/state validation.
The wrapper installs a successful broker session into the existing Supabase
client; email/password continues to use that client.

Direct Supabase `/auth/v1/authorize` tests returned HTTP 400, missing OAuth secret.
Those tests exercised the wrong flow. They do NOT prove managed Google/Apple
credentials are missing. Manually supplied Google/Apple secrets are not a
prerequisite for managed social sign-in. Do not change production provider mode.

Verified origin routing:
- `https://witnessmovement.com/~oauth/initiate` redirects to `oauth.lovable.app`
  for Google and Apple.
- The Replit preview's same route returns HTTP 404. A restored button targets
  that managed route, not Supabase, but this origin has no hosted broker.
- Do not implement a token proxy or silently forward Replit sessions to the live
  site. Signing in to the live site creates a separate origin's session.

Installed SDK 1.1.2 supports an absolute `oauthBrokerUrl`; documentation and
source both confirm it is used for redirects and iframe popups, without removing
the SDK's response-origin/state checks. However, harmless hosted-broker requests
using this Replit origin's `/login` return were rejected for BOTH providers in
both redirect and iframe `web_message` modes:
HTTP 400, `Authorization request is invalid: redirect_uri is not allowed`,
error code `invalid_request`. No provider initiation occurred for those returns.
Application broker configuration was therefore NOT changed.

Required owner action: in the owned Witness project, More → Cloud → Users →
Auth settings → Advanced → Redirect URLs, review whether Lovable permits the
exact Replit HTTPS `/login` return, including the app's `next` query. Do not add
wildcards, change managed provider mode, or replace the live Site URL. If that
setting does not authorize the hosted broker's external return, ask Lovable
support to confirm the supported external-origin policy. No service credential
or Google/Apple client secret is requested. Configuration cannot be considered
ready until both hosted modes accept the exact return and sessions are tested.

Live `https://witnessmovement.com/auth/callback` also returns HTTP 404. Local
login/native callback changes remain unpublished; the current route tree does
not define that web route. The managed buttons return to `/login`, so this 404
is separate from the broker rejecting the Replit redirect. Do not claim a live
callback repair or successful session restoration.

Owner location for managed provider, supported-origin and email questions:
the owned Witness Lovable project's Cloud/authentication controls or Lovable
support. Check the actual managed flow before changing settings. Email is
enabled and confirmation required; actual confirmation/recovery delivery is
untested. No email was sent.

### Native limitation

Installed SDK `@lovable.dev/cloud-auth-js` documents browser redirects and its
Lovable-app iframe handoffs, not a custom Witness Capacitor handoff. Social
buttons explicitly report this limitation on native platforms. They never
fall back to direct Supabase OAuth or claim a browser session signs in the shell.
A supported native broker contract is required before enabling that journey.
Lovable's platform documentation supports custom-scheme entries in Redirect
URLs. That is allowlisting only, not a verified external-browser-to-Capacitor
session transfer. SDK 1.1.2's special app branch is for a Lovable app user agent
and its own `lovable://oauth-callback`, not Witness's scheme. Do not spoof that
user agent, widen trusted origins, or exchange broker responses as direct
Supabase PKCE codes. Native social login remains disabled.

Native email confirmation/recovery remains separate: email-only PKCE callbacks
are `com.commonlight.witness://auth/email-confirmation` and
`com.commonlight.witness://auth/recovery`. The former direct-social `/callback`
is rejected, as are malformed/token-bearing links. These email callbacks still
require the managed backend's allowed email redirects and real-device testing.
Do not add them to shared production configuration without approval.

Complete Google/Apple sessions, invitation signup, email recovery, account
identity continuity and real-device restoration remain untested without
consenting test-account sign-in. Reaching a provider page is not completed login.

## 2. Apple build signing

Existing source repo: `skulla72/witness`.
Codemagic's saved Apple integration is named **Codemagic API Key**.
The last signed iOS build failed at Apple's bundle-ID lookup with HTTP 401.
There is no verified signed IPA. Unsigned simulator compilation previously passed.

Apple App Store Connect → Users and Access → Integrations → App Store Connect
API: verify the team key is active, belongs to the correct developer team and
has permissions for Witness/signing resources (the prepared guide uses App Manager).

Codemagic → Team settings → Team integrations → Developer Portal: update the
existing **Codemagic API Key** using the correct Issuer ID, Key ID and `.p8`
upload directly in that secure screen. Do not paste it in chat.

Keep the protected `CERTIFICATE_PRIVATE_KEY` and Android upload key; do not
regenerate certificate keys or revoke other apps' certificates to retry.
Use Codemagic's connection validation where available. A subsequent signed build
must pass signing-file fetch, archive and IPA export before claiming success.
No new paid cloud build or App Store upload was started in this pass.

## 3. Google Play access and internal release

The existing connection returns **404 text/html** because its configured host
is `play.googleapis.com`, not Android Publisher's
`androidpublisher.googleapis.com`. OAuth reconnecting does not fix API routing.
Do not extract tokens or invent proxy host overrides.

Until the connector's base URL is corrected through supported configuration,
use the authorized owner's Google Play Console:
Witness → Test and release → Testing → Internal testing.
Check the previously uploaded signed AAB, version code, upload certificate,
draft validation and tester availability. Do not submit a public release.
If an existing app has a different upload certificate, stop and recover the
original key; do not automatically reset it.

Verification: a supported read-only Publisher request returns JSON successfully;
then confirm the exact app/package and internal track. The prior signed Android
build succeeded, but Play acceptance/rollout and device installation are unverified.

## 4. Account-data work and staging requirements

Implemented locally:

- Account-scoped, device-local journals; no automatic ownership guess for old
  unscoped entries. Legacy originals remain untouched. Explicit recovery retains
  conflicting same-day entries. Sign-out hides entries and remounts drafts.
- Paged account exports across personal collections, relevant child records,
  current-device journal and a saved-file manifest with one-hour download links.
  Credential-bearing fields are excluded. Any read/list failure produces an
  explicitly partial copy, not a false complete result. Original media files
  must be downloaded from the manifest separately.
- Checked, paged saved-file cleanup including orphaned uploads; final account
  removal uses the prepared database transaction rather than a series of
  ignored delete errors.

Privileged account-operation limitation: these prepared Replit server paths
currently expect `SUPABASE_SERVICE_ROLE_KEY`, but Lovable Cloud intentionally
does not export this project's key. Do NOT request it or borrow another project's
key. Deletion/admin operations require implementation in an authorized managed
server runtime, or a documented managed privileged API. Neither is verified here.
Exports using the person's own authenticated client remain subject to RLS.

Prepared migration:
`supabase/migrations/20261014000100_witness_account_deletion.sql`.
It has NOT been applied. Review against the actual database and test on isolated
staging accounts before enabling the deletion flow. The RPC is service-role-only;
it preflights ownership, recurring billing and unfulfilled orders, anonymizes
financial contact details and deletes relational/auth data atomically.
It also refuses unresolved funded work and clinical histories pending a
retention review. Shared conversation/group creator fields become nullable,
so deleting the original creator does not cascade-delete everybody else's thread.

Storage cannot participate in the DB transaction. A storage failure stops final
deletion and retries are idempotent. If final SQL fails, already removed files
cannot be restored automatically. Concurrent uploads/deletion, existing FK
behavior, shared conversations/groups, clinical retention and retained payment
identifiers still require staging verification. This is NOT a fully verified
production deletion service. Journals on other devices and unassigned legacy
backups need their own local cleanup; account deletion cannot erase offline devices.

## 5. Push notifications

Android native FCM registration, permission/error handling, token persistence,
notification taps and device-specific logout cleanup are prepared.
Enable `VITE_NATIVE_ANDROID_PUSH_ENABLED=true` only after:

- Registering `com.commonlight.witness` in the correct Firebase project.
- Adding `android/app/google-services.json` through the native build's protected
  configuration and configuring the real sender/project.
- Providing the existing gateway's `LOVABLE_API_KEY` and
  `FIREBASE_MESSAGING_API_KEY` in the appropriate server secrets.
- Confirming token ownership/RLS, cold/background/foreground delivery and logout.

iOS callback support is prepared, but native push is intentionally not marked
configured: Capacitor's built-in iOS plugin returns an **APNs** token, while the
existing sender expects **FCM**. The owner must provide Apple Push capability,
APNs authorization and Firebase configuration. A native FCM bridge or a separate
APNs sender is still needed; an APNs token must never be treated as an FCM token.

Browser push additionally needs the Firebase web API key, project ID, app ID
and VAPID key variables referenced in `src/lib/push.ts`.
Their exact names are
`VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY`,
`VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID`,
`VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID`, and
`VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY`.
This is separate from Google Play OAuth.

## 6. Other actual service dependencies

There is no existing connected permission for these accounts in this workspace.
The app still uses the imported Lovable gateways; do not silently replace them
with a different billing/mail/AI provider.

| Feature | Secure server configuration | Public/browser configuration | Verification |
|---|---|---|---|
| Stripe payments through Lovable | `LOVABLE_API_KEY`, `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET` | `VITE_PAYMENTS_CLIENT_TOKEN` | Sandbox auth, checkout, verified webhook, reconciliation; no real charges/refunds |
| Invitation/perk mail via Lovable email | `LOVABLE_API_KEY`; optional `LOVABLE_SEND_URL` | None | Sender authorization/domain and template delivery with permission |
| Support Gmail via Lovable gateway | `LOVABLE_API_KEY`, `GOOGLE_MAIL_API_KEY` | None | Support mailbox OAuth/scopes, read-only mailbox check; do not send |
| AI scripture suggestions | `LOVABLE_API_KEY` | None | Confirm provider/model access and consent; paid model call needs permission |
| Google Maps/Places through Lovable | `LOVABLE_API_KEY`, `GOOGLE_MAPS_API_KEY` | `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`; tracking ID is metadata | Correct Google Cloud project/APIs, browser referrer restrictions, permitted read-only request |
| Firebase push gateway | `LOVABLE_API_KEY`, `FIREBASE_MESSAGING_API_KEY` | Existing Firebase web config or native build config | Correct project/token type, device delivery |

Secure locations: the original Lovable project's Cloud/connectors settings for
gateway credentials and authorization; provider-owned Stripe dashboard, Google
Cloud/Gmail consent, and Firebase Console for their permissions; then the
actual server host's secrets. A direct Stripe/Gmail connection would require an
explicit gateway migration, not simply adding one unrelated API key.

The Bible text endpoint `bible-api.com` is public and previously returned text
successfully. There is no automated SMS dependency in the app.

## 7. Exposed cron credential: non-disruptive replacement

The literal key has been removed from the current historical migration file.
This does not remove it from old Git history or rotate the existing database key.
Treat it as exposed. No live key, scheduler, payout or reminder run was changed.

Prepared compatibility code accepts `LOVABLE_CRON_SECRET`,
`LOVABLE_CRON_SECRET_PREVIOUS`, and the existing legacy database key until the
owner explicitly sets `WITNESS_CRON_ALLOW_LEGACY=false`.

Safe sequence on the VERIFIED live host and Supabase project:

1. Generate a fresh high-entropy credential in secure tooling. Store it as
   `LOVABLE_CRON_SECRET` in that host's secrets; use a distinct staging credential.
   Do not commit or log either credential.
2. Deploy the compatibility code only with a separately approved deployment.
   Preserve the old key during the overlap.
3. Inspect the actual `pg_cron`/scheduler jobs; source migrations still mention
   old preview hosts and are not proof of current runtime jobs. Update callers
   through secure scheduler/Vault configuration to use the replacement and
   correct owned live endpoint.
4. Verify BOTH reminders and payouts use the replacement. Do not call a real
   payout run as an authentication test. The prepared GET
   `/api/public/cron-health` accepts the same scheduled-job headers and checks
   authentication/configuration without sending notifications or moving money.
   It does not prove external provider authorization. Observe real scheduler
   configuration/results without printing keys; exercise service behavior in staging.
5. Only after successful dependency checks, disable legacy acceptance, then
   remove the old DB/previous key and plan repository-history remediation.

Verification currently covers synthetic credential comparisons only. Live
rotation remains blocked on actual host/Supabase management access.

## 8. Replit workspace-link 404

This is not Google Play's connector-routing 404 and not Supabase's OAuth 400.
Use the exact current project link while signed into the Replit account granted
access. The owner should confirm People with access. Project lookup alone does
not prove the browser account has workspace permission. No deletion or root cause
has been established.
