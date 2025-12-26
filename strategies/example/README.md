# Example Template Strategy

Pine v6 limit-order-first crossover example. Use this folder as a staging reference for new strategies.

## Staging checklist
- [ ] Confirm `manifest.json` symbols, timeframes, and session before paper trading.
- [ ] Paper trade and capture screenshots of filled limit orders and timeout cancels.
- [ ] Review `strategy.pine` fills in the TradingView tester to ensure limit entries and cancel-after-bars behavior.
- [ ] Record any edge cases (session gaps, partial fills) in this README.

## Settings to start with
- Timeframe: 5m
- Session: 09:30-16:00 America/New_York
- Marketable offset: 2 ticks
- Timeout: 3 bars

## Release notes
Document release checkpoints in this section and tag using `strategy/example/vX.Y.Z` when promoting.
