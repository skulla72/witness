# Build Witness for Android and iPhone

Both native shells use the app ID `com.commonlight.witness` and load
`https://witnessmovement.com`. They do not bundle the Replit web app.
Publishing changes to a different website will not update these shells.

## Before either build

- Use Node.js 22 or newer and Bun.
- From the project root, run `bun install --frozen-lockfile`.
- Keep the existing app ID when updating an app already registered in a store.
- Increase the Android version code and iOS build number before each new store upload.
- Verify the live website's sign-in and saved prayers on real devices.

Google sign-in currently requires a Google Web OAuth client ID and secret in
the connected Supabase project's Google provider settings. A build does not
resolve this configuration error. Do not put provider secrets in source code.

## Android

For signed cloud builds without a local Android toolchain, follow
[CLOUD-ANDROID.md](CLOUD-ANDROID.md). The manual workflow creates signed release
artifacts using your securely configured upload key and does not upload them.

Use JDK 21 and install Android SDK platform 36, build tools 36.0.0, and platform
tools using Android Studio's SDK Manager. Set `ANDROID_HOME` to the SDK directory
or let Android Studio create `android/local.properties`.

```sh
bun run mobile:build:android
```

Outputs:

- `android/app/build/outputs/apk/debug/app-debug.apk`: debug-signed APK for
  installation and testing, not a store release.
- `android/app/build/outputs/bundle/release/app-release.aab`: **unsigned** release
  bundle. Google Play will not accept it until signed with your upload key.
- `android/app/build/reports/lint-results-debug.html`: Android lint report.

For a Google Play upload, open the project with `bun run mobile:android` and
choose **Build → Generate Signed App Bundle / APK → Android App Bundle**.
Use the existing upload key if this app has already been published. For a new
app, create an upload key in Android Studio and keep a secure backup. Never
commit the key or its passwords.

Upload the signed `.aab` to an internal testing track first. The included
unsigned bundle is not ready to upload.

## iPhone

Without your own Mac, use the prepared Codemagic workflow described in
[CLOUD-IOS.md](CLOUD-IOS.md). It builds on a hosted Mac and does not upload to Apple.

iPhone apps must be built on a Mac with Xcode. The prepared source package is
not an `.ipa` and cannot be installed directly on an iPhone.

1. On your Mac, extract the source package and install dependencies as above.
2. Run `bun run mobile:sync`, then `bun run mobile:ios`.
3. In Xcode, sign in to your Apple Developer account. Select the **App** target,
   open **Signing & Capabilities**, select your team, and configure automatic
   signing. Confirm the bundle ID is `com.commonlight.witness`.
4. Test on a connected iPhone. For a store archive, select **Any iOS Device**
   and choose **Product → Archive**.
5. In Organizer, validate the archive and choose **Distribute App → App Store
   Connect**. Start with TestFlight.

After configuring signing in Xcode, you may also run:

```sh
bun run mobile:build:ios
```

This creates `build-native/ios/Witness.xcarchive`; use Xcode Organizer to export
or upload it. Apple Developer Program enrollment is required for distribution.

## Still needed before store submission

- Working Google sign-in and completed account/prayer-saving tests.
- Firebase/Apple push configuration and device notification tests.
- Signed releases tested on real Android and iPhone devices.
- Store screenshots, accurate privacy disclosures, and account-deletion checks.

Compiling a shell does not verify these features or guarantee store approval.
