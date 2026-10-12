#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
platform="${1:-}"

if [[ ! -d node_modules ]]; then
  echo "Dependencies are missing. Run bun install --frozen-lockfile first." >&2
  exit 1
fi

case "$platform" in
  android)
    if ! command -v java >/dev/null 2>&1; then
      echo "Android builds require JDK 21 and Android SDK platform 36." >&2
      exit 1
    fi
    bunx --no-install cap sync android
    (
      cd android
      bash gradlew --no-daemon --max-workers=2 \
        :app:assembleDebug :app:bundleRelease :app:lintDebug
    )
    echo "Test APK: android/app/build/outputs/apk/debug/app-debug.apk"
    if [[ -n "${CM_KEYSTORE_PATH:-}" ]]; then
      echo "Release bundle: android/app/build/outputs/bundle/release/app-release.aab"
      echo "Signing was configured. Verify the upload-key signature before uploading to Google Play."
    else
      echo "UNSIGNED bundle: android/app/build/outputs/bundle/release/app-release.aab"
      echo "Sign the release bundle with your upload key before uploading to Google Play."
    fi
    ;;
  ios)
    if [[ "$(uname -s)" != "Darwin" ]] || ! command -v xcodebuild >/dev/null 2>&1; then
      echo "An iPhone build requires a Mac with Xcode; it cannot be compiled on Linux." >&2
      echo "On a Mac, follow mobile/BUILDING.md to configure signing and archive." >&2
      exit 1
    fi
    bunx --no-install cap sync ios
    xcodebuild \
      -project ios/App/App.xcodeproj \
      -scheme App \
      -configuration Release \
      -destination 'generic/platform=iOS' \
      -archivePath build-native/ios/Witness.xcarchive \
      -allowProvisioningUpdates \
      archive
    echo "Archive: build-native/ios/Witness.xcarchive"
    echo "Open the archive in Xcode Organizer to validate and distribute to App Store Connect."
    ;;
  *)
    echo "Usage: bash scripts/build-native.sh android|ios" >&2
    exit 2
    ;;
esac
