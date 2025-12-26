# Contributing

## Local setup
1. Install Node LTS.
2. Install dependencies:
   ```bash
   npm ci
   ```

## Development workflow
- Create a new strategy scaffold:
  ```bash
  node tooling/new-strategy/index.js create <strategy_name>
  ```
- Keep `//@version=6` on the first non-empty line and prefer limit-order-first logic with cancel/timeout handling.
- Avoid `lookahead=barmerge.lookahead_on` and keep plotting at top level when possible.

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
Every push/PR runs `npm ci`, the linter, and tests, then uploads a JSON lint report artifact. Fix all `ERROR` severities before merging.
