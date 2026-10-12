# Build the iPhone app without owning a Mac

Witness has a manual Codemagic workflow named **Witness iPhone — signed build,
no upload**. Codemagic supplies the Mac and Xcode. This workflow produces an
App Store distribution-signed `.ipa` and an Xcode archive, but does not upload
anything to Apple, submit a review, or release the app.

The configuration is prepared; a real cloud build still requires the accounts
and signing files below. Local checks on Linux cannot verify Xcode compilation
or Apple signing.

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

## 3. Configure Apple signing securely in Codemagic

No locally owned Mac is required for this setup.

1. In **Team settings → Team integrations → Developer Portal**, add your
   App Store Connect API key: upload the `.p8` file there and enter its Key ID
   and Issuer ID. Do not send these credentials to the Agent.
2. Under **Team settings → codemagic.yaml settings → Code signing identities →
   iOS certificates**, generate an **Apple Distribution** certificate using
   that integration, or upload an existing distribution certificate and its
   private key as a password-protected `.p12`.
   If Codemagic provides a one-time certificate download, save a secure backup
   and upload it to Code signing identities as their instructions require.
   Do not revoke existing certificates to make room without understanding what
   other apps use them.
3. In Apple's developer website, generate an **App Store Connect distribution**
   provisioning profile for `com.commonlight.witness`, using the matching
   Apple Distribution certificate.
4. In Codemagic's **iOS provisioning profiles**, fetch that profile from the
   Developer Portal or upload its `.mobileprovision` file.
5. Confirm that the profile shows a matching certificate. The workflow selects
   these files by distribution type `app_store` and the bundle identifier.

Connecting only the API key is not enough: the distribution certificate and
matching provisioning profile must also be available in Code signing identities.
The workflow fails rather than exporting an unsigned app if signing is missing.

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
Confirm that website contains the intended changes. Resolve the missing Google
OAuth secret in Supabase, then complete account, saved-prayer, notification,
privacy, and real-device checks before submission.

## Official setup guides

- [Codemagic Capacitor guide](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/)
- [Codemagic iOS signing identities](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- [Codemagic manual YAML builds](https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/)
