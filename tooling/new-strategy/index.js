#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
    console.error('Usage: node tooling/new-strategy/index.js create <strategy_name> [--force]');
    process.exit(1);
}

function validateName(name) {
    return /^[a-z0-9-]+$/.test(name);
}

function strategyTemplate(name) {
    const prettyName = name.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    const longId = 'L';
    const shortId = 'S';
    return `//@version=6
strategy("${prettyName} v6", overlay=true, pyramiding=0, process_orders_on_close=true, calc_on_every_tick=false)

// Pane lock to anchor the script in the chart without visible plots
plot(close, title="__pane_lock__", display=display.none)

// === Inputs ===
sessionInput = input.session("0930-1600", "Session (exchange hours)", "America/New_York")
useLong = input.bool(true, "Enable Longs")
useShort = input.bool(true, "Enable Shorts")
limitOffsetTicks = input.int(5, "Limit offset (ticks)", minval=1)
cancelAfterBars = input.int(3, "Cancel limit after (bars)", minval=1)
maxTradesPerDay = input.int(3, "Max trades per day", minval=1)
riskPct = input.float(1.0, "Risk % per trade", minval=0.0, step=0.1)

// === Session + signals ===
sessionTime = time(timeframe.period, sessionInput, "America/New_York")
inSession = not na(sessionTime)
maFast = ta.sma(close, 10)
maSlow = ta.sma(close, 30)
longSignal = inSession and ta.crossover(maFast, maSlow)
shortSignal = inSession and ta.crossunder(maFast, maSlow)

// === Trade counters ===
var int tradesToday = 0
var int lastDay = na
currentDay = dayofmonth(time("D"))
if barstate.isconfirmed and (na(lastDay) or currentDay != lastDay)
    tradesToday := 0
    lastDay := currentDay

// Track order placement for cancel/timeout logic
var string longOrderId = "${longId}"
var string shortOrderId = "${shortId}"
var int longPlacedBar = na
var int shortPlacedBar = na

longLimitPrice = close - limitOffsetTicks * syminfo.mintick
shortLimitPrice = close + limitOffsetTicks * syminfo.mintick

canLong = barstate.isconfirmed and useLong and strategy.position_size <= 0 and tradesToday < maxTradesPerDay and na(longPlacedBar)
canShort = barstate.isconfirmed and useShort and strategy.position_size >= 0 and tradesToday < maxTradesPerDay and na(shortPlacedBar)

if canLong and longSignal
    strategy.entry(longOrderId, strategy.long, limit=longLimitPrice, comment="limit long")
    longPlacedBar := bar_index

if canShort and shortSignal
    strategy.entry(shortOrderId, strategy.short, limit=shortLimitPrice, comment="limit short")
    shortPlacedBar := bar_index

// Cancel unfilled orders after the timeout window
if not na(longPlacedBar) and strategy.position_size <= 0 and bar_index - longPlacedBar >= cancelAfterBars
    strategy.cancel(id=longOrderId)
    longPlacedBar := na

if not na(shortPlacedBar) and strategy.position_size >= 0 and bar_index - shortPlacedBar >= cancelAfterBars
    strategy.cancel(id=shortOrderId)
    shortPlacedBar := na

// Reset pending markers once a position is filled
if strategy.position_size != 0
    longPlacedBar := na
    shortPlacedBar := na

// Count trades on fills to enforce per-day limits
if barstate.isconfirmed and strategy.position_size != 0 and strategy.position_size[1] == 0
    tradesToday += 1

// === Visuals ===
plot(maFast, color=color.new(color.green, 0), title="MA Fast")
plot(maSlow, color=color.new(color.orange, 0), title="MA Slow")
riskValue = strategy.equity * (riskPct / 100.0)
plot(riskValue, title="Risk per trade (display only)", display=display.none)
`;
}

function manifestTemplate(name) {
    return {
        name,
        version: '0.1.0',
        description: `${name} strategy scaffold`,
        symbols: ['ES1!'],
        timeframes: ['5'],
        timezone: 'America/New_York',
        session: '0930-1600',
        orderPolicy: {
            entryType: 'limit',
            marketableOffsetTicks: 5,
            timeoutBars: 3,
        },
        risk: {
            qtyType: 'contracts',
            qtyValue: 1,
            pyramiding: 0,
        },
        backtestAssumptions: {
            commissionPerContractCash: 2.5,
            slippageTicks: 1,
        },
    };
}

function readmeTemplate(name) {
    const prettyName = name.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
    return `# ${prettyName}

Generated Pine Script v6 strategy scaffold. The file \`strategy.pine\` is copy/paste-ready for TradingView and includes limit-order-first logic with cancel/timeout guardrails.

## Staging checklist
- [ ] Confirm \`manifest.json\` values (symbols, timeframes, session, risk) match your test plan.
- [ ] Paper trade with the defaults and record screenshots of fills and cancels.
- [ ] Verify limit orders and timeout behavior in the TradingView strategy tester.
- [ ] Note any broker/session quirks discovered during staging.

## What to tweak first
- Update entry signals in \`strategy.pine\`.
- Adjust \`orderPolicy\` values in \`manifest.json\` to fit your instrument.
- Run \`npm run check\` before committing changes.
`;
}

function writeFileIfAllowed(targetPath, content, force) {
    if (fs.existsSync(targetPath) && !force) {
        throw new Error(`Refusing to overwrite existing file: ${targetPath}`);
    }
    fs.writeFileSync(targetPath, content, 'utf8');
}

function createStrategy(name, force) {
    if (!validateName(name)) {
        throw new Error('Invalid strategy name. Use lowercase letters, numbers, and hyphens only (e.g., es-orb-gap).');
    }

    const root = process.cwd();
    const strategyDir = path.join(root, 'strategies', name);
    const pinePath = path.join(strategyDir, 'strategy.pine');
    const manifestPath = path.join(strategyDir, 'manifest.json');
    const readmePath = path.join(strategyDir, 'README.md');

    fs.mkdirSync(strategyDir, { recursive: true });

    writeFileIfAllowed(pinePath, strategyTemplate(name), force);
    writeFileIfAllowed(manifestPath, `${JSON.stringify(manifestTemplate(name), null, 2)}\n`, force);
    writeFileIfAllowed(readmePath, readmeTemplate(name), force);

    console.log(`Created ${strategyDir}`);
    console.log('Next steps:');
    console.log(`- Edit ${pinePath} to add your custom signals.`);
    console.log(`- Update ${manifestPath} with live symbols/timeframes.`);
    console.log('- Run npm run check to validate lint + manifests.');
}

function main() {
    const [command, name, ...rest] = process.argv.slice(2);
    const force = rest.includes('--force');

    if (command !== 'create' || !name) {
        usage();
    }

    try {
        createStrategy(name, force);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createStrategy, strategyTemplate, manifestTemplate, readmeTemplate };
