# Witness isolated cloud iPhone release attempt

Internal evidence record, not store/legal approval.

## Source reconciliation

- Replit input: `0f3ea4fc70a5f49034d0bcda4130cd1f036877ff`.
- GitHub main input: `02832e5d5fd25441f4e034bbf5ed73f8364831ee`.
- Common ancestor: `3a63f65fd2e6121c5fa6481b2838c15323c84997`.
- Local merge: `1ac1edc573d26ce439c61621ba0f9bc6020a0af5`, with both
  input commits as parents. All October 18 media/group repairs retained.
- Conflicts retained Replit's newer managed-OAuth guidance and Android push
  permission; identical build scripts retained GitHub's executable modes.
- Isolated branch: `release/witness-testflight-20261020`.
- GitHub main is not changed. The GitHub App API is used because ordinary
  Git push authentication failed. The remote release snapshot is based on
  GitHub main, includes the reviewed application/native/docs/tests changes,
  and excludes Replit workspace metadata, memory and attached screenshots.
  This snapshot commit has a different SHA from the local merge.
- Source migrations are preserved as files only; none are executed.

## Local release preparation

- Existing `witness-ios` remains a no-upload workflow.
- Separate `witness-ios-testflight` uses `Codemagic API Key` and
  `witness_ios_signing`, with an early existing-signing-assets check.
- Removed automatic resource creation from the shared iOS signing script.
  Missing or inaccessible existing assets must fail, not generate replacements.
- Candidate version remains 1.0, candidate build number 1020. Apple must
  accept its uniqueness; no prior successful upload is assumed.
- Upload uses the integration, with both external TestFlight review submission
  and public App Store submission disabled. No tester invitations or
  automatic expiry of other builds are configured.
- Successful upload alone is not proof of Apple processing or installation.

## Checks actually run for this attempt

- `bun test tests/ios-cloud-release.test.ts tests/native-packaging.test.js tests/signed-media.test.tsx tests/group-loading.test.tsx tests/witness-safety.test.js tests/managed-social-auth.test.js`
  — **70 passed, 0 failed, 361 assertions**, six files.
- `bunx --no-install tsc --noEmit --incremental false` — passed.
- `bash -n scripts/codemagic-ios.sh` — passed.
- `bun run build` — passed, local web only. Existing build warnings remain.
- `git diff --check` — passed before this documentation addition.
- These checks do not prove signed compilation, Apple authorization,
  TestFlight processing or native sign-in/session restoration.

## Content actually tested by an eventual native installation

The native shell still loads **https://witnessmovement.com**. The Replit
web repairs in this release branch are preserved but are not deployed by this
workflow, and must not be claimed to exist on the live website without a
separate comparison. New native fallback and entitlement source is included;
the app's hosted web content remains whatever production currently serves.
No public website deployment is authorized by this attempt.

## Cloud and Apple evidence

- Local prepared source: `089582c4779ee389a7fbc80d8c441705f1c88ff8`.
- Remote release source: `1223bcb93d53cb78e43d17449689d71605dc0f8b`.
- All 137 transferred source/document/test entries were verified against
  local Git blob hashes and executable modes: zero mismatches.
- GitHub main remained `02832e5d5fd25441f4e034bbf5ed73f8364831ee`.
- Codemagic start API: HTTP 200, build `6ad7285cadf48078c5756117`.
- Final cloud status: **failed**, for that exact remote release commit.
- Started `2026-10-20T08:37:56.327Z`; finished
  `2026-10-20T08:38:42.082Z`.
- Build machine preparation and source fetch succeeded. The first existing
  Apple signing-assets preflight failed; dependency installation and signed
  compilation were skipped. There are **zero artifacts and zero Apple
  post-processing tasks**. The generic Publishing action's success status
  is a no-op here and is not evidence of upload.
- Authenticated retrieval of the failed command's nested log succeeded.
  Apple bundle-ID request returned **HTTP 401**, with the standard error:
  **"Authentication credentials are missing or invalid."**
  **"Provide a properly configured and signed bearer token, and make sure
  that it has not expired."**
- The first log retrieval without the Codemagic API header also returned
  401; that separate log-access failure was resolved. The Apple 401 above
  was then confirmed from the retrieved command output.
- Signed IPA: **not produced**. TestFlight upload: **not performed**.
  Apple processing and iPhone installation: **not reached/unverified**.
- No repeated cloud run was started after this authorization failure.

## Exact owner-only unblock

1. Sign into the Codemagic team owning the Witness application. Open
   **Team settings → Team integrations → Developer Portal → Manage keys**,
   and inspect **Codemagic API Key**.
2. In the matching Apple account, open **App Store Connect → Users and
   Access → Integrations → App Store Connect API**. Confirm the saved existing
   key is active and its key ID and issuer correspond to the same intended
   team. Confirm that team owns `com.commonlight.witness` and the Witness
   App Store Connect app record. Re-save the existing matching key securely
   in Codemagic if its current saved selection/material is wrong. Do not
   paste credentials in chat or source, create a new key, or revoke anything.
3. Confirm the existing authorization permits distribution signing resource
   reads and App Store Connect upload (Codemagic documents App Manager for
   publishing), and that the existing reusable signing key/profile supports
   the requested distribution/push entitlements. Do not weaken permissions
   or generate replacements to bypass this check.
4. If the matching existing private key is unavailable or revoked, stop and
   report that fact: new credential creation was not authorized.
5. After owner correction, repeat the isolated workflow once. A successful
   preflight is still not a signed build or processed TestFlight result.

The API/log evidence does not distinguish a mismatched/revoked key, wrong
issuer/team selection, malformed signing material or another token-authentication
problem. No supported standalone Codemagic Developer Portal validation API was
established. The current integration cannot be repaired using the available
Codemagic token alone without owner access to its secure configuration.

## Remaining proof without a personal Mac

- Existing Apple authorization must pass; existing certificate/profile must
  produce a signed IPA from the recorded release source.
- App Store Connect must accept the upload and finish processing it. Upload
  status alone is insufficient. If required, the owner must finish export
  compliance/app-record information and add themselves as an internal tester
  in App Store Connect → Witness → TestFlight, without a public App Store release.
- An iPhone installation must verify the production-hosted content, native
  recovery, push and auth/session behavior. Managed native social handoff is
  still unverified/unsupported in this copy; a signed shell does not fix it.
- Local web repairs remain unpublished; no claim is made that the live
  website contains the October 18 changes.

Official configuration references:
https://docs.codemagic.io/rest-api/builds/
https://docs.codemagic.io/yaml-publishing/app-store-connect/
https://github.com/codemagic-ci-cd/cli-tools/blob/master/docs/app-store-connect/fetch-signing-files.md

## Independent unsigned iPhone simulator compilation

- Workflow: `witness-ios-check`, on the same isolated release branch.
- Exact tested remote revision:
  `37f842ec37b4b0f02cfba8e7ff2a1bad53fd0b3e`.
  This is the reconciled application snapshot plus the signing-attempt
  evidence-only update; no later application changes are implied.
- Cloud start request: HTTP 200.
- Build ID: `6ad729a1f12088b7d940152e`.
- Started `2026-10-20T08:43:21.883Z`.
- Remote workflow was checked before launch: `CODE_SIGNING_ALLOWED=NO`,
  Debug, iPhone Simulator SDK, no Apple integration, no signing-variable
  group and no publishing configuration.
- **Final result: finished / successful.** Finished
  `2026-10-20T08:45:28.696Z` (approximately 2 minutes 7 seconds).
- Source fetch, locked dependency installation, simulator compilation and
  artifact collection all succeeded. No application/native repair or rerun
  was needed, and no unchanged local test suite was repeated.
- Actual artifact: **Witness-iOS-simulator.zip**, from
  `build-native/Witness-iOS-simulator.zip`, **3,705,567 bytes**.
  Authenticated build metadata lists it, and the artifact endpoint's HEAD
  returned **HTTP 200**, `application/zip`, matching Content-Length.
  The archive was not installed/run or copied into the repository.
- Authenticated nested command logs were retrieved with HTTP 200:
  - Locked dependencies: 3,585 bytes,
    SHA-256 `bfa1805dc66b02eb84d4b4a42936defaebe1a5ab64200e5e3d479c169a1d7762`.
  - Native compile: 725,129 bytes,
    SHA-256 `73507f385461b9cf79021b8a4ba2f51a234d803b3f2a6fcac22f0410fe38f608`.
    Confirms resolved Swift packages, simulator SDK compilation and
    **`** BUILD SUCCEEDED **`**, with zero `error:` lines.
  - Logs and archive are retained with this Codemagic build. No credential
    bodies or signed download/log URLs are copied into this document.
- Six warning lines remain: five repeated asset-catalog warnings that
  the Splash image set has three unassigned children, and one AppIntents
  metadata extraction skip because no AppIntents.framework dependency exists.
  Neither failed compilation; no unrelated branding/framework change made.
- Apple post-processing tasks: **zero**. No signing, TestFlight upload,
  account action, website deployment or public release was performed.
- This independent compile cannot validate distribution signing, device
  entitlements, native runtime behavior, TestFlight upload or Apple processing.
- The earlier signed-build Apple HTTP 401 remains a separate blocker pending
  owner correction. Simulator success does not establish it has changed.
