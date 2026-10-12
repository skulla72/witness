#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
build_number="${1:-}"

# Apple permits up to four digits in the first CFBundleVersion component.
if [[ ! "$build_number" =~ ^[1-9][0-9]{0,3}$ ]]; then
  echo "Choose a whole iOS build number between 1 and 9999." >&2
  exit 2
fi
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Run this workflow on Codemagic's macOS runner, not in the Linux workspace." >&2
  exit 1
fi

export PATH="$HOME/.bun/bin:$PATH"
for tool in node bun xcodebuild xcode-project; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Required Codemagic build tool is missing: $tool" >&2
    exit 1
  fi
done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) { console.error("Capacitor requires Node.js 22 or newer."); process.exit(1); }'
if [[ ! -d node_modules ]]; then
  echo "Run the locked dependency installation step before the iPhone build." >&2
  exit 1
fi

echo "Syncing the existing hosted-site native shell."
bunx --no-install cap sync ios

echo "Applying signing files from Codemagic's secure signing identities."
xcode-project use-profiles --project ios/App/App.xcodeproj

echo "Resolving Swift Package Manager dependencies."
xcodebuild -resolvePackageDependencies \
  -project ios/App/App.xcodeproj \
  -scheme App

echo "Archiving and exporting build $build_number without uploading to Apple."
xcode-project build-ipa \
  --project ios/App/App.xcodeproj \
  --scheme App \
  --config Release \
  --archive-directory build-native/ios/archive \
  --ipa-directory build-native/ios/ipa \
  --archive-xcargs "COMPILER_INDEX_STORE_ENABLE=NO CURRENT_PROJECT_VERSION=$build_number"

if ! compgen -G 'build-native/ios/ipa/*.ipa' >/dev/null; then
  echo "The iPhone export did not produce an IPA. Check the Xcode build logs." >&2
  exit 1
fi
echo "Signed IPA is available in the Codemagic build artifacts. Nothing was submitted to Apple."
