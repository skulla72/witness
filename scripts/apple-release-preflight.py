#!/usr/bin/env python3
"""Read-only Apple checks; never log raw CLI output, credentials or response bodies."""
import json
import os
import re
import subprocess
import sys

APP_ID = "6824878398"
BUNDLE = "com.commonlight.witness"
KEY_ID = "6C34DHH7Q2"


def read_apple(*args):
    result = subprocess.run(
        ["app-store-connect", *args, "--json", "--no-color"],
        capture_output=True, text=True, check=False,
    )
    if result.returncode:
        match = re.search(r"\b(401|403|404|409|429|5\d\d)\b", result.stderr + result.stdout)
        status = match.group(1) if match else "unavailable"
        raise RuntimeError(f"Apple read-only authorization check failed; HTTP {status}.")
    try:
        return json.loads(result.stdout)
    except (ValueError, TypeError):
        raise RuntimeError("Apple CLI returned an unreadable metadata response.") from None


def validate_app(app):
    if app.get("id") != APP_ID or app.get("attributes", {}).get("bundleId") != BUNDLE:
        raise RuntimeError("Apple app record does not match the authorized Witness app/bundle.")


def validate_bundles(bundles):
    if not isinstance(bundles, list) or len(bundles) != 1:
        raise RuntimeError("The existing exact Witness bundle ID was not uniquely accessible.")
    bundle = bundles[0]
    if bundle.get("attributes", {}).get("identifier") != BUNDLE:
        raise RuntimeError("Apple bundle identifier mismatch.")
    return bundle["id"]


def main():
    if os.environ.get("APP_STORE_CONNECT_KEY_IDENTIFIER") != KEY_ID:
        raise RuntimeError("Runner is not using the owner-approved Apple API key selection.")
    validate_app(read_apple("apps", "get", APP_ID))
    bundle_id = validate_bundles(read_apple(
        "bundle-ids", "list", "--bundle-id-identifier", BUNDLE, "--strict-match-identifier"
    ))
    capabilities = read_apple("bundle-ids", "capabilities", bundle_id)
    if not any(c.get("attributes", {}).get("capabilityType") == "PUSH_NOTIFICATIONS"
               for c in capabilities):
        raise RuntimeError("The existing Witness bundle does not report Push Notifications.")
    builds = read_apple("builds", "list", "--app-id", APP_ID,
                        "--build-version-number", os.environ["WITNESS_IOS_BUILD_NUMBER"])
    if builds:
        raise RuntimeError("This build number already exists in Apple; choose a new build number.")
    print("Apple authentication passed: authorized app, exact existing bundle, push capability; build number unused.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
