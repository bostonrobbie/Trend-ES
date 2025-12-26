#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOK_DIR="$ROOT_DIR/.git/hooks"
PRE_COMMIT="$HOOK_DIR/pre-commit"

mkdir -p "$HOOK_DIR"

cat > "$PRE_COMMIT" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail

BLOCKED_REGEX='^(node_modules/|pine-lint-report.*\.json$)'

staged_files=$(git diff --cached --name-only)
if [ -z "$staged_files" ]; then
  exit 0
fi

if echo "$staged_files" | grep -E "$BLOCKED_REGEX" >/dev/null 2>&1; then
  echo "Pre-commit: aborting because generated artifacts are staged (node_modules or pine-lint reports)." >&2
  echo "Unstage and remove these files before committing." >&2
  exit 1
fi
HOOK

chmod +x "$PRE_COMMIT"

echo "Installed pre-commit hook at $PRE_COMMIT"
