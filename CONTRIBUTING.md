# Contributing

Thanks for helping improve the Pine Script strategy template! This guide explains how to add new strategies and how to work with the linter locally.

## Adding a new strategy

1. Create a directory under `strategies/` named after your strategy (e.g., `strategies/breakout/`).
2. Add your Pine file inside that folder with the same base name (`breakout.pine`).
3. Document the idea and parameters in `strategies/<name>/README.md`.
4. Run `pnpm lint:pine` (or `npm run lint:pine`) and ensure no errors remain.
5. Submit a pull request. CI will run linting and unit tests automatically.

## Running checks locally

- Install dependencies: `pnpm install` (or `npm install`).
- Lint all Pine files: `pnpm lint:pine`.
- Run linter tests: `pnpm test`.

## Coding standards for pine-lint

- Keep rules documented in `tooling/pine-lint/rules.md` when adding or adjusting checks.
- Prefer small, composable rule functions with clear codes and messages.
- Add fixtures and unit tests that cover both the failing and passing cases for any new rule.
