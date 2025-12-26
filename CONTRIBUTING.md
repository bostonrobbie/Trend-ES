# Contributing

## Local setup
1. Install Node LTS.
2. Install dependencies:
   ```bash
   npm ci
   ```

## Development workflow
- Add new strategies under `strategies/<name>/<name>.pine` with `//@version=6` on the first non-empty line.
- Prefer limit orders with cancel/timeout logic to satisfy the limit-order-first guardrails.
- Keep plotting at the top level where possible.
- Avoid `lookahead=barmerge.lookahead_on` and use explicit `lookahead` arguments.

## Checks
- Lint all Pine files:
  ```bash
  npm run lint:pine
  ```
- Run tests (vitest):
  ```bash
  npm test
  ```

## CI
Every push/PR runs the linter and tests and uploads a JSON lint report artifact. Fix all `ERROR` severities before merging.
