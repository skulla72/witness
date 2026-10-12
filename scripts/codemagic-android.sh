#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
build_number="${1:-}"
if [[ ! "$build_number" =~ ^[1-9][0-9]{0,9}$ ]] ||
   (( build_number > 2100000000 )); then
  echo "Choose a whole Android version code between 1 and 2100000000." >&2
  exit 2
fi

# Never print signing values or write them into the repository.
for key in CM_KEYSTORE_PATH CM_KEYSTORE_PASSWORD CM_KEY_ALIAS CM_KEY_PASSWORD; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing Android signing configuration: $key. Add witness_upload in Codemagic signing identities." >&2
    exit 1
  fi
done
if [[ ! -f "$CM_KEYSTORE_PATH" ]]; then
  echo "The Android upload keystore file is missing." >&2
  exit 1
fi

export PATH="$HOME/.bun/bin:$PATH"
for tool in node bun java jarsigner unzip; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Required Android build tool is missing: $tool" >&2
    exit 1
  fi
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) { console.error("Capacitor requires Node.js 22 or newer."); process.exit(1); }'
if [[ ! -d node_modules ]]; then
  echo "Run the locked dependency installation step before the Android build." >&2
  exit 1
fi

bunx --no-install cap sync android
(
  cd android
  bash gradlew --no-daemon --max-workers=2 \
    "-PwitnessVersionCode=$build_number" \
    :app:bundleRelease :app:assembleRelease :app:lintRelease
)

bundle="android/app/build/outputs/bundle/release/app-release.aab"
apk="android/app/build/outputs/apk/release/app-release.apk"
[[ -s "$bundle" && -s "$apk" ]] || {
  echo "The Android build did not produce both release artifacts." >&2
  exit 1
}
entries="$(unzip -Z1 "$bundle")"
if ! grep -Eq '^META-INF/[^/]+\.(RSA|DSA|EC)$' <<< "$entries"; then
  echo "The Android bundle is unsigned. Do not upload it to Google Play." >&2
  exit 1
fi
verification="$(jarsigner -J-Duser.language=en -verify "$bundle" 2>&1)"
if ! grep -q 'jar verified' <<< "$verification"; then
  echo "Android bundle signature verification failed." >&2
  exit 1
fi

echo "Signed Android bundle and APK are available in Codemagic artifacts. Nothing was submitted to Google."
