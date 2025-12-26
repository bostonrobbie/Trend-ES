# TradingView Pine Script Strategy Template

This repository is a reusable template for building TradingView Pine Script strategies with automated linting that mirrors the Pine Editor's strictness as closely as possible without using TradingView's compiler.

- **Strategies** live under `./strategies/<strategy_name>/<strategy_name>.pine` with a per-strategy README.
- **pine-lint** is a local CLI that performs static checks for common Pine Script compile errors and logical foot-guns.
- **CI** runs pine-lint and its unit tests on every push and pull request, failing builds on errors and publishing a JSON report artifact.

## Quick start

1. Install Node.js LTS (18+ recommended). `pnpm` or `npm` both work.
2. Install dependencies:
   - `pnpm install` (preferred) or `npm install`.
3. Run lint across all strategies:
   - `pnpm lint:pine` (or `npm run lint:pine`).
4. Run linter unit tests (uses a bundled light-weight Vitest-compatible harness, no network fetches):
   - `pnpm test` (or `npm test`).

## Repository layout

```
/strategies/<strategy_name>/<strategy_name>.pine   # Pine source files
/tooling/pine-lint/                                # CLI implementation, fixtures, tests
/.github/workflows/ci.yml                          # CI workflow for lint + tests
```

## pine-lint overview

`pine-lint` is a fast static checker designed to catch the most common Pine Editor errors before you paste code into TradingView. It enforces file hygiene, Pine version headers, top-level declarations, balanced delimiters, indentation heuristics, and patterns such as `request.security` lookahead, risky `strategy.entry` triggers, and overfitting guardrails. The CLI supports human-friendly and JSON output formats.

See [`tooling/pine-lint/rules.md`](tooling/pine-lint/rules.md) for the full rule set.

## Adding strategies

1. Create a folder under `strategies/` (e.g., `strategies/my_strategy/`).
2. Add your Pine file named the same as the folder (`my_strategy.pine`).
3. Add a short `README.md` describing the idea and inputs.
4. Run `pnpm lint:pine` to catch issues before committing.

## Local configuration

You can tune thresholds and behavior with `.pinelintrc.json` in the repo root. Example:

```json
{
  "maxInputs": 50,
  "maxRequestSecurity": 30,
  "maxLineLength": 140,
  "disallowLookahead": true
}
```

## CI

GitHub Actions executes linting and tests on push and pull requests. Lint results are uploaded as a JSON artifact for further inspection.
