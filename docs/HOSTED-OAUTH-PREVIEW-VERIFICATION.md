# Hosted OAuth preview connection — unpublished

The installed Lovable SDK 1.1.2 now uses its documented `oauthBrokerUrl`
configuration for `https://witnessmovement.com/~oauth/initiate`.
SDK state checks, trusted message origins, callback/session handling, backend,
account-bound confirmation, invitations and failed-attempt safeguards are unchanged.
The obsolete web-origin warning was replaced; the native unsupported-handoff warning remains.

Current default return (temporary development hostname):

`https://4dd25188-7910-46e7-bf1e-c5270656a0a9-00-1mo8g1zllxj7o.spock.replit.dev/login`

## Browser evidence

Normal headless Chromium, signed out, actual HTTPS preview, no Lovable UA spoofing:

- Google: unchecked agreement refused initiation; after checking, the actual button
  reached `accounts.google.com/v3/signin/identifier`, title “Sign in - Google Accounts”,
  with login inputs.
- Apple: unchecked agreement refused initiation; after checking, the actual button
  reached `appleid.apple.com/auth/authorize`, title “Sign in to Apple Account”,
  with login inputs.
- No credentials, account selection, consent or account/session creation.
- This run exercised top-level browser navigation, not the embedded-preview popup.
- Mobile screenshot confirmed the existing icon and compact unchecked agreement.

## Local checks

Focused managed-auth and community-acknowledgement regression tests: 17 passed,
172 assertions. TypeScript and local web build passed.
The unpublished preview workflow is running.

## Limits

Initiation is not completed sign-in. Returned-session/account-bound confirmation,
embedded-preview popup completion, native handoff and signed-device operation
were not verified. Native social handoff remains explicitly unsupported.
No production settings/database changes, publication, uploads, messages or paid builds.

## Callback error reporting — subsequent unpublished repair

The owner's report of returning to sign-in does not establish its underlying cause.
The login page now explicitly observes the installed Auth client's public
`initialize()` result, then reads its session. The client remains the only
callback consumer. Presence flags are captured before automatic client creation
can consume/clear the callback. No manual code exchange or second token handler
was added.

Recognized returns show restoration progress, then continue only after a session
is present without a session-read error. Initialization/session failures show
plain-language retry guidance and a selectable support reference containing only
callback-field booleans, allowlisted error name/code (or generic fallback),
observed session presence and onward-navigation status. No raw error text,
credentials, URLs or account identifiers enter that reference. Successful flows
do not display diagnostics. A normal direct sign-in visit stays normal.
Retry starts at a clean same-origin login URL and preserves the safe destination.
Late auth events recheck through the same client after successful initialization;
events cannot override an initialization error. Cleanup prevents late navigation.
The account-bound age gate still follows authentication; it is not bypassed.

Checks actually run for this repair:

- 27 focused tests passed, 222 assertions, across restoration, managed social
  auth and compact community acknowledgement.
- Includes initialization failure, clean direct visit, successful restoration,
  no-session retry/late-event recovery, navigation failure, unmount and redaction.
- Installed Auth client tested with synthetic callback fixtures and exclusively
  mocked transport. No test credentials or invalid requests reached live Auth.
- TypeScript and local web build passed.
- Workflow restarted and running; 402×874 screenshot confirmed normal login,
  existing icon and compact unchecked acknowledgement.
- Synthetic test emits a nonfatal multiple-client warning because it creates
  isolated fixture Auth clients; this is not evidence of multiple production clients.

These checks establish error handling and synthetic restoration behavior, not
the cause or outcome of the owner's real provider session. Another owner attempt
is needed; on failure, share only the safe reference, never the callback address
bar, browser storage, raw errors or network authorization data. No real sign-in
was performed during this repair. Native and embedded-popup completion remain
unverified.
