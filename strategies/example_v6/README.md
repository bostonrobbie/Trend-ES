# Example v6 Strategy

Copy/paste-ready Pine v6 limit-order-first example with cancel/timeout handling and per-day trade gating.

## Staging checklist
- [ ] Validate `manifest.json` symbols, session, and offsets before testing.
- [ ] Paper trade and save screenshots of entry, fill, and cancel behavior.
- [ ] Confirm limit orders always include `limit=` and cancel after the configured bars.
- [ ] Note any discrepancies between chart session and broker session here.

## Settings to start with
- Timeframe: 5m
- Session: 09:30-16:00 America/New_York
- Marketable offset: 3 ticks
- Timeout: 3 bars
- Max trades/day: 2

## Release notes
Track changes and planned tags here using `strategy/example_v6/vX.Y.Z`.
