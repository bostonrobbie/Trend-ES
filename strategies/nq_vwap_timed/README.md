# NQ VWAP Timed Pro

A professional-grade VWAP-based strategy for Nasdaq (NQ) futures.

## Strategy Logic
- **Entry Window**: Daily timed entry (default 08:40 NY).
- **Trend Filters**: 
    - VWAP Orientation (Price > VWAP for longs, Price < VWAP for shorts).
    - Momentum (ta.mom) threshold.
    - ADX trend strength and DI dominance.
- **Risk Cap**: Pre-entry distance check to ensure price is not too far from VWAP (ATR-based or fixed USD risk).
- **Execution**: Professional limit orders with marketable offsets and auto-timeout.
- **Exit**: Position closes if price crosses back over VWAP or at the specified end-of-day exit time.

## Usage
1. Set the entry time (default 08:40 AM NY).
2. Configure momentum and ADX filter levels.
3. Adjust the "k ATR" distance cap to avoid "chasing" entries far from average price.
