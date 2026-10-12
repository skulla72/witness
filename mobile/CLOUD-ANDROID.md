# Signed Android builds in Codemagic

The manual workflow **Witness Android — signed build, no upload** builds a
release Android App Bundle (`.aab`) and APK for `com.commonlight.witness`.
It does not upload to Google Play or release the app.

## Signing setup

1. Connect the GitHub repository and select the branch containing
   `codemagic.yaml`.
2. In Codemagic, open **Team settings → codemagic.yaml settings → Code signing
   identities → Android keystores**.
3. Upload the app's **upload keystore**, enter its passwords and alias directly
   in Codemagic, and set the reference name to **`witness_upload`**.
4. Store a separate secure backup of the keystore and passwords. Codemagic does
   not let you download the uploaded keystore later.

If Google Play already has an upload certificate for this app, reuse the
matching upload key. Do not generate a replacement without following Google's
upload-key reset process. If this is the first release and no upload key exists,
create it with Android Studio or Java Keytool on a computer you control.
Do not use the debug test key for a store release.

Never send signing keys or passwords in chat, commit them, or add them to YAML.
The workflow fails if signing configuration is missing rather than exporting
an unsigned store bundle.

## Run a build

1. Review Codemagic's build allowance and charges. This workflow uses the same
   M2 Mac runner type as the iPhone workflow, with a 60-minute limit.
2. Click **Start new build**, select the branch, then select
   **Witness Android — signed build, no upload**.
3. Set `build_number` to `1` only if no build has already been uploaded to Google.
   Otherwise use a whole number higher than every previously uploaded version
   code, up to `2100000000`.
4. Download the signed `.aab` from the successful build's **Artifacts**.
5. Upload it to **Google Play internal testing** before a public release.

The script installs/syncs the existing Capacitor Android project, uses JDK 21
and Android SDK 36, signs with the configured upload key, runs release lint,
and verifies the bundle signature. Google Play App Signing manages the final
distribution key separately from your upload key.

The APK is for direct release-build testing; Google Play installs can have a
different signing certificate when Play App Signing is enabled. Test a
Play-distributed install too, especially authentication.

The native shell loads `https://witnessmovement.com`; Replit preview edits do not
automatically update that website. Working sign-in, push notifications, privacy
disclosures, account deletion, and real-device checks are still required.

## Agent access to cloud builds

Connecting GitHub to Codemagic does not give this Agent Codemagic API access.
To let the Agent inspect the app connection and run/monitor builds, add
`CODEMAGIC_API_TOKEN` through Replit's secure Secrets flow. The token is found in
Codemagic **Account settings → API token**. Do not paste it in chat.
Apple and Android signing files should remain in Codemagic's signing identities.

## Official guide

- [Codemagic Android signing](https://docs.codemagic.io/yaml-code-signing/signing-android/)
