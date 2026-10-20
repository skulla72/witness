#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Restore dependencies without changing the repository's dependency versions.
# Workflow reconciliation restarts the preview after this script succeeds.
bun install --frozen-lockfile