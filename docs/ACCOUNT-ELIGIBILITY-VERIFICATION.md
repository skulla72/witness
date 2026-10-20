# Unpublished account eligibility follow-through

For the subsequent existing-room, cancellation, server-checkout and legal-copy
corrections, see [ACTION-BOUNDARIES-VERIFICATION.md](ACTION-BOUNDARIES-VERIFICATION.md).
Its 62-test/424-assertion suite includes these earlier regressions. The 45-test
results and gap descriptions below describe the earlier gate-only pass.

## Completed local behavior

1. **All signed-in accounts** must resolve authenticated identity and a strict
   13+ self-attestation before protected components can mount. Existing/old
   accounts are not automatically exempt. Legacy minimum-age flags and account
   creation dates do not establish eligibility.
2. The shared validator requires an exact schema version, matching account ID,
   literal boolean confirmation, supported 13–17/18+ band and valid ISO timestamp
   not in the future. Malformed, missing or wrong-account data stays closed.
3. The root boundary does not render protected children while session/eligibility
   is loading, missing, invalid or failed. Public crisis/legal/contact/deletion
   help routes bypass only to their route outlet, not the protected app shell
   or its background consumers. Signed-out public landing is preserved.
4. Self-attestation form saves only age band/account ID/time, not a full birthday
   or exact age. Standard authenticated user-metadata PUT uses a captured token
   verified against the account displayed by the form. Both pre-write identity
   and post-save identity/value are checked. Auth events invalidate state
   synchronously; revision checks reject late results and account switches.
5. Pre-auth email/all Google/Apple checks remain. Social age is cleared before
   provider initiation and in finalization, including failure/cancellation.
   It is not saved as a pending confirmation or attached to a returned identity.
   After sign-in the actual account must independently confirm through the gate.
6. Actual current-account adult self-attestation is required for counselor
   requests, client agreements/bookings/starts and professional listing/slot
   creation. Transient current age alone no longer authorizes client actions.
   Normal eligible adult self-request/booking/agreement/client-start paths remain.
7. Request acceptance resolves the canonical requester and counselor owner.
   Session start reloads the canonical session and participant IDs. A clinician's
   own adult assertion cannot substitute for the actual client's.
   Since another user's auth metadata cannot safely be read with existing
   publishable access, **provider acceptance and therapist-started sessions refuse
   with a clear missing-client-evidence error**. They are not marked operational.
8. Session status helper rejects runtime `in_progress`/`booked` attempts so it
   cannot bypass the guarded start path. Existing record reads, declines, normal
   completion/cancellation and crisis information are preserved.
9. New teen specialties remain disabled; legacy data remains. Privacy draft
   discloses stored self-attestation band and retained legacy birthdays. No
   birthday editor, deletion claim or removal feature was invented.

## Actual local verification

- `bun test tests`: **45 passed, 0 failed, 300 assertions across four files**.
- `bunx tsc --noEmit --incremental false`: passed.
- `bun run build`: local client/SSR/Nitro build passed; existing Wrangler `main`
  override warning remains.
- Regression coverage includes:
  - Unknown existing accounts and invalid/legacy flags, dates, schema and IDs.
  - Rendered protected-child counter remaining zero during unresolved/invalid
    states; public help-path policy.
  - Auth resolution arriving after account change; account changes before and
    during a save; stale rendered form for a different already-resolved account.
  - Scoped synthetic token/account binding, explicit confirmation, failed writes,
    malformed saved values and absence of new DOB collection.
  - Failed/cancelled provider-attempt clearing, with no pending metadata linkage.
  - Actual-client adult bands, canonical request/session lookups, refused
    therapist/alternate acceptance and session-status bypass attempts.
- All identity/write/request data in tests is synthetic and dependency-injected
  or rejected before a remote operation. No real account or user-metadata write,
  request acceptance, clinical session or protected two-account browser flow was
  tested.
- Rendering checks establish component gating in tests, not a real signed-in
  device/browser session. Native shells and published website remain unchanged.
- Preview workflow restarted successfully. Phone-size `/therapy` capture showed
  the resolving-eligibility screen, with protected content withheld and public
  help links visible. Desktop `/crisis` rendered public resources without a
  sign-in/age gate. No runtime errors were reported in these captures. The
  protected capture is not proof of completed account resolution or saving.

## Unresolved boundaries / publication blockers

- **Self-attestation is editable, not authoritative age or legal certification.**
  The authenticated Auth service binds an assertion to an identity, not to proof
  of the person's actual age.
- Application gate/helper checks are not remote Auth hooks, RLS, RPC protection
  or a universal server authorization layer. Direct authenticated APIs,
  server-function endpoints and external clients are not secured by a React
  boundary. No remote migrations/policies or automatic jobs were changed.
- Another client's adult assertion requires a supported managed-runtime lookup
  or shared, authorized evidence design. No service-role extraction, fabricated
  proxy, assumed public age field or alternate backend was used. Provider
  acceptance/start remains explicitly blocked pending this capability.
- Live user-metadata save and restoration across real accounts/devices are
  **untested**. No browser/account sign-in actions were authorized for this pass.
- Managed broker callback allowlisting/contract, live callback 404, native
  social-session handoff, historical Apple signing 401, wrong-host Google Play
  connector and privileged deletion/export fulfillment remain unresolved.
- The owned Lovable deletion-request page is prepared/verified in unpublished
  code per owner, not independently inspected here or live; that is not proof
  of fulfillment/file cleanup.
- Owner facts remain Common Light LLC, USA, monitored support@witnessmovement.com,
  minimum age 13, teen counseling deferred. Colorado, USA registration is now
  owner-confirmed; mailing address and governing-law/venue decisions remain unresolved.
  Legal documents remain unfinished/unapproved.

No publication, uploads, submissions, paid builds/resources, real user/account
actions, mail/messages, credential changes, secret exposure, destructive actions,
executable migrations, remote DB updates or auto-applied automation were performed.
The user-metadata update is implemented as an explicit future in-app user choice,
not executed by this repair.
