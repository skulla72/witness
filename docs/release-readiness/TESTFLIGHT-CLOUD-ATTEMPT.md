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

Pending execution. This section must be updated with the exact remote source
revision, cloud build ID/status, signed artifact result and Apple processing
status. Do not label TestFlight ready based on configuration or local tests.
