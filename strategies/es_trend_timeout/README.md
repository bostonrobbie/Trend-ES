# ES Trend Timeout

Trend following strategy for E-mini S&P 500 (ES) focusing on momentum and ADX filters with limit order management.

## Features
- **Momentum Filter**: Gating entries based on price change over a lookback period.
- **ADX Filter**: Optional ADX threshold to ensure trend strength.
- **Limit Order First**: Places limit orders with a configurable marketable offset.
- **Order Timeout**: Automatically cancels unfilled limit orders after a set number of bars.
- **Forced Exit**: Closes positions at the end of the specified trading window.

## Usage
1. Copy the content of `strategy.pine`.
2. Paste into TradingView Pine Editor.
3. Save and "Add to Chart".
