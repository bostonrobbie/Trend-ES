# pine-lint Rules

This document summarizes the checks implemented by `pine-lint`.

## File hygiene
- UTF-8 file read, Unix newlines only.
- File ends with a newline.
- No tab characters; spaces only.
- No trailing whitespace.

## Pine header & declaration
- First non-empty line must be `//@version=5` (or `//@version=6`).
- Exactly one top-level `strategy(` or `indicator(` declaration, placed after the version line.

## Balanced delimiters
- Checks parentheses, brackets, and braces for balance with line/column reporting.
- Warns on dangling commas or operators at the end of a line that often indicate missing continuations.

## Indentation & block structure heuristics
- Enforce 4-space indents for nested blocks.
- Warn on non-multiple-of-4 indents when inside a block.
- Heuristic block detection (`if/for/while/switch/=>`) ensures the next statement is indented.

## Pine gotchas
- Warn when `plot(` appears inside local blocks (many plots must be top-level).
- Warn when global `var` is mutated inside a function body.
- Error when `request.security(..., lookahead=barmerge.lookahead_on)` is used (repainting risk by default).
- Warn on `barstate.isrealtime` and `calc_on_every_tick=true` usages.
- Warn when `strategy.entry` is triggered without crossover/position gating heuristics.

## Overfitting guardrails
- Warn when there are more than `maxInputs` (default 40) input.* calls.
- Warn on nested loops.
- Warn when more than `maxRequestSecurity` (default 20) `request.security` calls are present.

## Style rules
- Enforce one `input.*` call per line.
- Disallow multi-statement lines separated by `;`.
- Warn when a call argument list exceeds `maxLineLength` (default 120) characters without explicit line breaks.

## Configuration

`.pinelintrc.json` can override thresholds and behavior:
- `maxInputs` (number)
- `maxRequestSecurity` (number)
- `maxLineLength` (number)
- `disallowLookahead` (boolean)
