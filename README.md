# TradingView Pine v6 Strategy Template

Offline, CI-ready template for TradingView Pine Script **v6** strategies. Each strategy lives in its own folder with a copy/paste-ready `strategy.pine`, a machine-readable manifest, and staging notes.

## Quickstart
1. Install dependencies (Node LTS):
   ```bash
   npm ci
   ```
2. Run all checks (tests + pine-lint + manifest validation):
   ```bash
   npm run check
   ```
3. Fix any issues reported by the linter/validator before committing.

> Optional: install the local pre-commit hook to block accidental `node_modules/` or lint reports from being committed:
> ```bash
> bash tooling/hooks/install.sh
> ```

## Strategy layout
Every folder under `strategies/<name>/` must contain:
- `strategy.pine` — Pine v6 script with limit-order-first entries and cancel/timeout logic.
- `manifest.json` — machine-readable metadata for staging/backtest assumptions.
- `README.md` — human notes for staging/paper trading and release history.

### Manifest schema
`manifest.json` must include:
- `name` (string)
- `version` (string)
- `description` (string)
- `symbols` (string array)
- `timeframes` (string array)
- `timezone` (string, e.g., `America/New_York`)
- `session` (string, e.g., `0930-1600`)
- `orderPolicy` (object)
  - `entryType` (must be `limit`)
  - `marketableOffsetTicks` (integer)
  - `timeoutBars` (integer)
- `risk` (object)
  - `qtyType` (string)
  - `qtyValue` (number)
  - `pyramiding` (integer)
- `backtestAssumptions` (object)
  - `commissionPerContractCash` (number)
  - `slippageTicks` (integer)

Run `npm run validate:manifests` to check required keys and types across all strategies.

## Linter usage
```bash
node tooling/pine-lint/index.js lint "strategies/**/*.pine" [--format json] [--config path]
```
- Text output: `file:line:col - [ERROR|WARN] CODE - message`
- JSON output: array of `{file,line,col,severity,code,message}`
- Default config: `tooling/pine-lint/index.js` (override via `.pinelintrc.json`)

Key checks include:
- `//@version=6` on the first non-empty line and exactly one `strategy()`/`indicator()` declaration.
- Limit-order requirement for `strategy.entry` with cancel/timeout expectations.
- Balanced delimiters, 4-space indentation heuristics, reserved identifier misuse, and repaint guardrails.

## Create a new strategy
Use the scaffold generator for a Pine v6, limit-order-first starter:
```bash
node tooling/new-strategy/index.js create <strategy_name>
```
Outputs `strategies/<strategy_name>/` containing:
- `strategy.pine` with deterministic `L`/`S` order IDs, limit entries, and cancel/timeout handling.
- `manifest.json` prefilled with default symbols/timeframes and required schema keys.
- `README.md` with a staging checklist template.

After generation, edit the files, then run `npm run check`.

## CI
GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:
- Guardrail: fails fast if `node_modules/` is present or tracked.
- `npm ci`
- `npm run check`
- Generate `pine-lint-report.json` and upload as an artifact.

## Release/versioning guidance
- Tag format: `strategy/<name>/vX.Y.Z` per strategy folder.
- Keep changelog notes in each strategy README (or `CHANGELOG.md` inside the folder).
- Before tagging: ensure `npm run check` is green, manifests are up to date, and staging notes reflect the tested configuration.
