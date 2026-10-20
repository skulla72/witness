#!/usr/bin/env python3
"""Read only Apple processing metadata; no build, upload or account changes."""
import json
import os
from pathlib import Path
import sys
import time

from importlib.util import module_from_spec, spec_from_file_location

spec = spec_from_file_location("preflight", Path(__file__).with_name("apple-release-preflight.py"))
preflight = module_from_spec(spec)
spec.loader.exec_module(preflight)


def main():
    if os.environ.get("APP_STORE_CONNECT_KEY_IDENTIFIER") != preflight.KEY_ID:
        raise RuntimeError("Runner is not using the owner-approved Apple API key selection.")
    preflight.validate_app(preflight.read_apple("apps", "get", preflight.APP_ID))
    version = os.environ["WITNESS_IOS_BUILD_NUMBER"]
    if not version.isdigit():
        raise RuntimeError("Invalid build number.")
    summary = {"appId": preflight.APP_ID, "bundleId": preflight.BUNDLE, "version": version}
    for attempt in range(30):
        builds = preflight.read_apple(
            "builds", "list", "--app-id", preflight.APP_ID, "--build-version-number", version
        )
        if not isinstance(builds, list) or len(builds) > 1:
            raise RuntimeError("Apple returned ambiguous build metadata; manual review required.")
        if builds:
            build = builds[0]
            state = build.get("attributes", {}).get("processingState")
            if state not in {"PROCESSING", "FAILED", "INVALID", "VALID"}:
                raise RuntimeError("Apple returned an unrecognized processing state.")
            summary.update(buildId=build["id"], processingState=state)
            print(json.dumps(summary), flush=True)
            if state == "VALID":
                details = preflight.read_apple("builds", "beta-details", build["id"])
                attrs = details.get("attributes", {})
                allowed = {
                    "PROCESSING", "PROCESSING_EXCEPTION", "MISSING_EXPORT_COMPLIANCE",
                    "READY_FOR_BETA_TESTING", "IN_BETA_TESTING", "EXPIRED", "INVALID",
                    "READY_FOR_BETA_SUBMISSION", "IN_EXPORT_COMPLIANCE_REVIEW",
                    "WAITING_FOR_BETA_REVIEW", "IN_BETA_REVIEW", "BETA_REJECTED",
                    "BETA_APPROVED", "READY_FOR_INTERNAL_TESTING",
                }
                for key in ("internalBuildState", "externalBuildState"):
                    value = attrs.get(key)
                    summary[key] = value if value in allowed else "UNKNOWN"
                break
            if state in {"FAILED", "INVALID"}:
                break
        if attempt < 29:
            time.sleep(20)
    else:
        summary["processingCheck"] = "TIME_LIMIT_REACHED"
    Path("build-native").mkdir(exist_ok=True)
    Path("build-native/apple-processing.json").write_text(json.dumps(summary, indent=2) + "\n")
    print("APPLE_PROCESSING_RESULT " + json.dumps(summary), flush=True)
    if summary.get("processingState") != "VALID":
        raise RuntimeError("Apple processing not confirmed VALID; see sanitized result.")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
