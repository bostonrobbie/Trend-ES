# NQ VWAP Trend Pullback

A robust, logic-first trend strategy for Nasdaq (NQ) that combines Macro Trend filtration with Micro Value execution.

## Strategy Logic

The strategy relies on **"Mean Reversion to Trend"**:
1.  **Macro Filter (The Tide)**:
    -   Uses a **200 EMA** to define the dominant market regime.
    -   Longs are only permitted when Price > 200 EMA.
    -   Shorts are only permitted when Price < 200 EMA.
2.  **Value Pullback (The Setup)**:
    -   Wait for price to pull back to "Fair Value" (**VWAP**).
    -   **Long Trigger**: Price dips to touch VWAP, then **Closes Green** (Rejection of lower prices).
    -   **Short Trigger**: Price rallies to touch VWAP, then **Closes Red** (Rejection of higher prices).
3.  **Risk Management (The Engine)**:
    -   **Hard Stop**: Initial stop based on `ATR x Multiplier`.
    -   **Take Profit**: Initial target based on `ATR x Multiplier`.
    -   **Trailing Stop**: Activates after price moves X amount in favor, locking in profits.

## Execution
-   **Entry**: Limit Orders at the Close ± 2 ticks (Marketable Limit) to capture the rejection verification.
-   **Timeout**: If the limit order isn't filled within 3 bars, it is cancelled to avoid "chasing ghosts".

## Parameters

### Trend Filters
-   **Macro Trend EMA**: Length of the trend filter (default 200).
-   **Require Rejection**: Confirm entry with a color-match candle (Green for Longs).

### Risk Management
-   **ATR Length**: Lookback for volatility calc.
-   **Initial Stop / Target**: Multipliers for dynamic risk per trade.
-   **Trailing**: Enable/Disable and configure Activation/Offset levels.

## Usage
-   Designed for **1-minute** or **5-minute** charts.
-   Best used during the **New York Session (09:30 - 16:00)** to capture liquidity-driven moves.

