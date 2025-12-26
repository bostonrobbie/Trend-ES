#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if git ls-files --error-unmatch node_modules >/dev/null 2>&1; then
  echo "node_modules is tracked by git. Remove it from the repo before proceeding."
  exit 1
fi

if [ -d node_modules ]; then
  echo "node_modules/ exists in the workspace. Remove it before running CI or committing."
  exit 1
fi

exit 0
