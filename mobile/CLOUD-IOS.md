# Build the iPhone app without owning a Mac

Witness has a manual Codemagic workflow named **Witness iPhone — signed build,
no upload**. Codemagic supplies the Mac and Xcode. This workflow produces an
App Store distribution-signed `.ipa` and an Xcode archive, but does not upload
anything to Apple, submit a review, or release the app.

The configuration is prepared; a real cloud build still requires the Apple
connection and protected certificate key below. Local checks on Linux cannot
verify Xcode compilation or Apple signing.

## 1. Apple account and app registration

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/enroll/).
   Distribution signing requires active membership.
2. In Apple's Certificates, Identifiers & Profiles website, register an
   explicit App ID with bundle identifier **`com.commonlight.witness`**.
   Reuse it if it already exists; do not create a different ID for this app.
3. Create the Witness app record in App Store Connect using that bundle ID.
4. Create a dedicated App Store Connect API key with **App Manager** access
   under **Users and Access → Integrations → App Store Connect API**.
   Keep its downloaded `.p8` file secure; Apple allows only one download.

Do not put the `.p8` file, certificates, private keys, or passwords in chat,
the repository, or this YAML file.

## 2. Connect the project to Codemagic

1. Put the project in a private GitHub, GitLab, or Bitbucket repository, including
   `codemagic.yaml`, `bun.lock`, `bunfig.toml`, `capacitor.config.ts`, `package.json`,
   `scripts/`, `mobile/`, and `ios/`.
   Do not upload `node_modules`, build outputs, or credentials.
2. Create a [Codemagic](https://codemagic.io/) account.
3. Select **Add application**, connect your repository, and select the Ionic
   Capacitor/other project type with a YAML configuration.
4. Select the branch containing this configuration and check for `codemagic.yaml`.
   Keep the workflow manual. No push, pull-request, or scheduled triggers are
   included, so merely pushing code will not start a build.

Review Codemagic's current build allowance and charges before starting a build.
The workflow uses an M2 Mac runner and has a 60-minute timeout.

## 3. Automatic Apple signing in Codemagic

No locally owned Mac is required for this setup.

1. In **Team settings → Team integrations → Developer Portal**, add your
   App Store Connect API key: upload the `.p8` file there and enter its Key ID
   and Issuer ID. Use the display name **Codemagic API Key**, matching the
   workflow's integration reference. Do not send these credentials to the Agent.
2. The app's **witness_ios_signing** variable group must contain
   **CERTIFICATE_PRIVATE_KEY**, marked **Secret**. This is a reusable RSA
   signing key, not the App Store Connect `.p8` API key.
   The protected key has been provisioned directly in Codemagic. Keep it there;
   do not replace or regenerate it for each build.
3. The build initializes a keychain and uses `app-store-connect
   fetch-signing-files` to fetch or create an Apple Distribution certificate
   and matching App Store provisioning profile for **com.commonlight.witness**.
   It then imports the certificate and applies the profile to the Xcode project.

Manual certificate/profile uploads to Code signing identities are not required
by this iPhone workflow. The Apple API key needs permission to manage signing
resources. If Apple rejects creation because its certificate limit is reached,
the build stops; it never revokes another app's certificates to make room.
Missing credentials also stop the build instead of producing an unsigned app.

## 4. Run the first build manually

1. In Codemagic, choose **Start new build**.
2. Select the branch and **Witness iPhone — signed build, no upload**.
3. Set the **build_number** input. Use `1` for the first build if no build has
   been uploaded to Apple. For each later upload, use a whole number higher
   than the last uploaded build, from `1` through `9999`. The marketing version
   remains the version in the Xcode project.
4. Start the build only after reviewing the provider's charges.
5. After success, download the signed `.ipa` from **Artifacts**. The workflow
   also retains the archive and Xcode logs.

The build installs dependencies from the existing Bun lockfile, syncs the
Capacitor iOS project, resolves **Swift Package Manager** dependencies, applies
signing, archives, and exports. This project does not use CocoaPods; do not
add a `pod install` step.

An App Store-signed IPA cannot be installed by simply opening it on an iPhone.
It must be uploaded to App Store Connect and distributed through TestFlight
or the App Store. That upload is intentionally not configured here.

## Before an Apple upload

The shell still loads `https://witnessmovement.com`, not the Replit preview.
Confirm that website contains the intended changes. Verify the Lovable-managed
social login and obtain a supported native broker handoff, then complete account,
saved-prayer, notification, privacy, and real-device checks before submission.
Manual Supabase OAuth secrets are not prerequisites for managed login.

## Official setup guides

- [Codemagic Capacitor guide](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/)
- [Codemagic iOS signing identities](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- [Codemagic automatic signing](https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/)
- [Codemagic manual YAML builds](https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/)
