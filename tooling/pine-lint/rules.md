# pine-lint rules

- **File hygiene**: UTF-8 readable, Unix newlines, trailing newline required, no tabs, no trailing whitespace.
- **Version + declaration**: first non-empty line must be `//@version=6` (configurable). Exactly one top-level `strategy()` or `indicator()` and it must appear after the version line. Warn on long single-line declarations.
- **Delimiter balance**: parentheses, brackets, and braces must balance.
- **End-of-line continuation**: flag dangling commas/operators/ternary markers/open delimiters at line ends.
- **Indentation heuristics**: enforce 4-space multiples (error by default). Warn if a block opener (`if/for/while/switch/=>`) is not followed by an indented line.
- **Reserved identifiers**: disallow reserved Pine identifiers as assignment targets.
- **request.security**: error on `lookahead=barmerge.lookahead_on` (configurable), warn if lookahead is missing, warn when call count exceeds threshold.
- **Global mutation in functions**: error when global vars defined at indent 0 are mutated inside a function.
- **Plot in local scope**: warn when plotting primitives appear in local scopes.
- **Spam entry guardrail**: warn when `strategy.entry` lacks crossover/position/bar confirmation context.
- **Limit order enforcement**: require `limit=` for `strategy.entry`; warn on market-like limits and missing cancel/timeout heuristics.
- **Overfitting guardrails**: warn on parameter bloat, nested loops, long argument lines, multiple statements per line, and lack of explicit input formatting.
- **Tick mismatch risk**: warn on `calc_on_every_tick=true` when disallowed by config.
