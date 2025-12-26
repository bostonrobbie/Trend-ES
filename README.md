# TradingView Pine v6 Strategy Template

Offline, CI-ready template for TradingView Pine Script **v6** strategies. Each strategy lives in its own folder with a single copy/paste-ready `.pine` file, and the bundled `pine-lint` CLI enforces Pine Editor-like rules, limit-order-first discipline, and common compile foot-guns.

## Quickstart
1. Install dependencies (Node LTS):
   ```bash
   npm ci
   ```
   > Note: the repo ships a tiny local `vitest` stub so installs work fully offline (no vendored `node_modules/`).
2. Run the linter against all strategies:
   ```bash
   npm run lint:pine
   ```
3. Run unit tests (vitest):
   ```bash
   npm test
   ```
4. Copy `strategies/example_v6/example_v6.pine` into TradingView to start building your own strategy.

## Create a new strategy
Use the scaffold generator to create a Pine v6, limit-order-first strategy folder with a copy/paste-ready `.pine` file:

```bash
node tooling/new-strategy/index.js create <strategy_name>
# example:
node tooling/new-strategy/index.js create es-orb-gap
```

Rules:
- Strategy name must use lowercase letters, numbers, and hyphens only.
- Files are created in `strategies/<strategy_name>/` and will not be overwritten unless you pass `--force`.
- Generated scripts include bar-close gating, limit order offsets, cancel/timeout handling, per-day trade caps, and a pane-lock plot.

After generation, edit the strategy, then run:
```bash
npm test
npm run lint:pine
```

## Linter usage
```
node tooling/pine-lint/index.js lint "strategies/**/*.pine" [--format json] [--config path]
```
- Text output: `file:line:col - [ERROR|WARN] CODE - message`
- JSON output: array of `{file,line,col,severity,code,message}`
- Default config: `tooling/pine-lint/index.js` (overrides via `.pinelintrc.json`)

Key checks include:
- `//@version=6` on the first non-empty line and exactly one `strategy()`/`indicator()` declaration.
- Balanced delimiters and end-of-line continuation traps (dangling operators, commas, open delimiters).
- 4-space indentation heuristics for block scopes.
- Reserved identifier misuse, global var mutation inside functions, plotting in local scopes.
- `request.security` lookahead enforcement and repaint warnings.
- Strategy entry guardrails: limit-order requirement, anti-spam gating heuristics, and cancel/timeout expectations.
- Overfitting guardrails: input count, nested loops, long argument lists.

## Config overrides
Create `.pinelintrc.json` in the repo root (or pass `--config`) to override defaults:
```json
{
  "requiredVersion": 6,
  "disallowLookaheadOn": true,
  "requireLimitOrders": true,
  "maxInputs": 40,
  "maxRequestSecurity": 20,
  "maxLineLength": 120,
  "enforceOneInputPerLine": true,
  "enforceNoTabs": true,
  "enforce4SpaceIndent": true,
  "disallowCalcOnEveryTick": true
}
```

## CI
GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:
- `npm ci`
- `npm test`
- `npm run lint:pine`
- `node tooling/pine-lint/index.js lint "strategies/**/*.pine" --format json > pine-lint-report.json`
- Uploads `pine-lint-report.json` as an artifact and fails on any errors.

## Creating a new strategy manually
1. Copy `strategies/example_v6` to `strategies/<your_strategy>`.
2. Update the `.pine` file but keep `//@version=6` on the first non-empty line and ensure the first declaration is `strategy()`/`indicator()`.
3. Use limit orders with cancel/timeout logic by default to satisfy the linter guardrails.
4. Run `npm run lint:pine` and `npm test` before committing.
