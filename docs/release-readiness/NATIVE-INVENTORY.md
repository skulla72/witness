# Native release inventory and official requirements

**INTERNAL / NOT A SIGNING OR STORE-ACCEPTANCE CERTIFICATE**

## Source configuration

| Item | Verified local value / evidence |
| --- | --- |
| Display name | Witness (`capacitor.config.ts`, Android resources, iOS Info.plist) |
| Android applicationId / namespace | `com.commonlight.witness` (`android/app/build.gradle`) |
| iOS bundle identifier | `com.commonlight.witness` for Debug/Release (`ios/App/App.xcodeproj/project.pbxproj`) |
| Android version | `versionName "1.0"`; code defaults to 1, overridable with `witnessVersionCode`, validated 1…2100000000 |
| iOS version | `MARKETING_VERSION = 1.0`; `CURRENT_PROJECT_VERSION = 1`; signed script overrides build number with input 1…9999 |
| SDK / minimum OS | Android compile/target 36, minimum 24; iOS project/SPM minimum 15.0 |
| Native runtime | Capacitor core/android/iOS 8.5.2 in current dependency tree; Node 22+, Android Java 21 |
| Android Gradle plugin | 8.13.0 (`android/build.gradle`) |
| Native content | Hosted `https://witnessmovement.com`, not the Replit preview; local `mobile/webroot/index.html` wired through `server.errorPath`, Retry targets production; native failure/recovery unverified |
| Network | HTTPS only; cleartext false / Android mixed content false |
| Deep link | `com.commonlight.witness://auth/...`; manifest registration is broader than application callback parser |
| Accepted local email callbacks | `/email-confirmation` and `/recovery` only; native social handoff not established |
| iOS signing | Automatic; Debug requests development APNs, Release requests production APNs via target entitlement files. Codemagic selects signing files; actual team/certificate/profile/entitlement validity remains unverified |
| Android signing | Existing upload keystore via protected Codemagic configuration; no signing-identity changes made |

Defaults of 1 are not proof of available store version numbers. Before the next
authorized upload, owner must inspect the highest previously used number and
choose a larger unused number. Do not rename package/bundle or generate a new
signing identity.

## Codemagic workflows

Local connection-error and push-capability preparation, focused results and
precise owner provisioning steps are recorded in
[native packaging verification](../NATIVE-PACKAGING-VERIFICATION.md).
No native build, profile modification or notification send was performed.

`codemagic.yaml` is manual, without store publishing configuration or Git
triggers. The latest existing v3 workflow-list check returned HTTP 200 and
listed these workflows; **no build was launched in this pass**.

| ID | Purpose / output declaration | Inputs and protected dependencies |
| --- | --- | --- |
| `witness-ios-check` | Debug simulator compile, signing disabled; ZIP artifact declared | M2 macOS, Xcode `latest`, Node 22, locked Bun install |
| `witness-ios` | App Store archive/export, no upload; IPA/XCArchive/logs declared | Build input defaults 1; integration **Codemagic API Key**; group `witness_ios_signing` |
| `witness-android` | Signed release AAB/APK and lint report, no upload | Build input defaults 1; group `witness_android_signing`; SDK/build-tools 36, Java 21 |

Scripts: `scripts/codemagic-ios.sh`, `scripts/codemagic-android.sh`.
Apple required protected variable names:
`CERTIFICATE_PRIVATE_KEY`, `APP_STORE_CONNECT_KEY_IDENTIFIER`,
`APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`.
Android signing uses `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`,
`CM_KEY_PASSWORD`; cloud script may provision the path from protected group
material. These are names/contracts, **not fresh presence/validity checks**.
No credential bodies were retrieved.

The iOS script's future authorized signing operation uses
`fetch-signing-files --create`; it can create signing resources. This inventory
does not execute that script. Codemagic workflow access is not Apple Developer
Portal authorization. Historical Apple 401 is unresolved; no supported API
operation to validate that integration without a build was identified.

## Existing artifact evidence

Present locally:

| File | Size (bytes) | Evidence / limit |
| --- | ---: | --- |
| `downloads/Witness-Android-release.aab` | 7818802 | ZIP readable; signature metadata present. Not a fresh cryptographic certificate verification or Play acceptance check |
| `downloads/Witness-Android-release.apk` | 8866141 | ZIP readable; APK v2/v3 signing cannot be inferred from absence of JAR signature files |
| `downloads/Witness-Android-unsigned.aab` | 7755920 | Existing file; not suitable proof of signed release |
| `downloads/Witness-Android-test.apk` | 11071136 | Existing test file, not current release proof |
| `downloads/Witness-native-project.zip` | 2845006 | Project archive, not a store binary |

Both inspected release Android archives include **12 `.so` files**. Native-code
16 KB page alignment remains unverified; do not assume a Java-only shell.
No IPA or simulator ZIP was found in the inspected workspace locations.
Prior notes record a simulator compile and successful Android signed build;
they do not establish current local auth edits in a newly compiled binary.
The last recorded signed iOS run failed with Apple API HTTP 401.
The owner reported uploading an AAB; store status and installed tests are unknown.

## Current official requirement comparison

Documentation fetched 2026-10-15. Recheck policies immediately before submission.

| Requirement | Official source | Witness status |
| --- | --- | --- |
| App Store uploads: Xcode 26+ with iOS 26 SDK since April 28, 2026 | https://developer.apple.com/news/upcoming-requirements/?id=04282026a | Workflow says `latest`; exact runner Xcode/SDK must be captured from the future archive. No current archive proof |
| iOS/iPadOS deployment minimum 13+ since September 9, 2026 | https://developer.apple.com/news/upcoming-requirements/?id=0992026a | Local minimum 15.0 meets this stated floor |
| Updated Apple age-rating questions | https://developer.apple.com/news/upcoming-requirements/ | Owner must complete from actual UGC/health/community scope; signup minimum age 13 is not a store rating |
| New Play apps/updates target API 36+ since August 31, 2026 | https://support.google.com/googleplay/android-developer/answer/11926878?hl=en | Local target/compile 36 matches; actual uploaded bundle's metadata not checked |
| 16 KB support for native libraries | https://developer.android.com/guide/practices/page-sizes | Native libraries exist; alignment and 16 KB device execution untested. Fetched page states update enforcement February 1, 2027; do not substitute older remembered dates for current console requirements |
| Play web and in-app account deletion resource | https://support.google.com/googleplay/android-developer/answer/13327111?hl=en | Missing verified public request/fulfillment flow; prepared backend deletion is not live evidence |
| Apple completeness, reviewer access, UGC moderation, billing, privacy, minimum functionality | https://developer.apple.com/app-store/review/guidelines/ | Open gates. Hosted shell requires meaningful app-specific experience; acceptance not presumed |
| SDK privacy manifests/required reasons | https://developer.apple.com/documentation/bundleresources/privacy_manifest_files | Capacitor core/Cordova manifests exist in installed SDK; application/other SDK reasons and final archive aggregate not validated |

No definite low-risk packaging inconsistency requiring a configuration edit
was established. Subsequent local launch-scope guards do not change versions,
identifiers, SDKs, permissions, signing identities, provider modes or production
behavior. Broad media
permissions and hosted-shell design require explicit review, not silent removal
or redesign under a packaging task.
