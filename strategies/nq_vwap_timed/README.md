# NQ VWAP Timed Pro

A professional-grade VWAP-based strategy for Nasdaq (NQ) futures, designed for execution on **confirmed bars** with strict limit order protocols.

## Strategy Logic

- **Entry Window**: Logic executes only at a specific daily time (default 08:40 NY).
- **Trend Filters**: 
    - **VWAP Bias**: Long if price > VWAP, Short if price < VWAP.
    - **Momentum**: Filter entries using `ta.mom` with configurable lookback.
    - **ADX/DMI**: Ensures strict trend strength (ADX > threshold) and directional movement (DI+ > DI- for longs).
- **Risk Management**:
    - **Distance Cap**: Prevents entries if price is over-extended from VWAP (measured in ATR multiples or fixed USD).
    - **Hardcoded Execution**: 
        - **Limit Orders**: Always uses limit orders (Close ± 2 ticks).
        - **Timeout**: Cancels pending orders if not filled within 3 bars.
- **Exit**: 
    - **VWAP Cross**: Closes position if price crosses back over VWAP on a confirmed bar.
    - **Forced EOD**: Hard exit at specified time (default 14:10 NY).

## Parameters

### Time Settings
- **Entry Hour/Minute**: The exact 1-minute bar to evaluate for entry.
- **Forced Exit Hour/Minute**: The time to close all positions.

### Risk & Filters
- **Momentum**: Enable/Disable and set thresholds.
- **ADX**: Set individual thresholds for Long and Short sides.
- **Pre-Entry Risk Cap**:
    - `k * ATR`: Max allowable distance from VWAP.
    - `Max Risk $`: Absolute dollar risk cap per contract based on distance to VWAP.

## Usage Notes

1. **Timeframe**: Designed for the **1-minute** chart.
2. **Backtesting**: Ensure `process_orders_on_close=true` is honored (built-in).
3. **Live Execution**: The strategy relies on `barstate.isconfirmed` to prevent repainting.

