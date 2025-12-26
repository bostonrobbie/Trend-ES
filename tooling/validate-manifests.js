#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function validateString(obj, key, errors) {
  if (typeof obj[key] !== 'string' || obj[key].trim() === '') {
    errors.push(`${key} must be a non-empty string`);
  }
}

function validateArray(obj, key, errors) {
  if (!Array.isArray(obj[key]) || obj[key].length === 0) {
    errors.push(`${key} must be a non-empty array`);
    return;
  }
  const bad = obj[key].some((v) => typeof v !== 'string' || v.trim() === '');
  if (bad) {
    errors.push(`${key} entries must be non-empty strings`);
  }
}

function validateNumber(obj, key, errors, { integer = false } = {}) {
  const val = obj[key];
  if (typeof val !== 'number' || Number.isNaN(val)) {
    errors.push(`${key} must be a number`);
    return;
  }
  if (integer && !Number.isInteger(val)) {
    errors.push(`${key} must be an integer`);
  }
}

function validateManifest(manifestPath) {
  const errors = [];
  let manifest;
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(raw);
  } catch (err) {
    errors.push(`Invalid JSON: ${err.message}`);
    return errors;
  }

  validateString(manifest, 'name', errors);
  validateString(manifest, 'version', errors);
  validateString(manifest, 'description', errors);
  validateArray(manifest, 'symbols', errors);
  validateArray(manifest, 'timeframes', errors);
  validateString(manifest, 'timezone', errors);
  validateString(manifest, 'session', errors);

  const orderPolicy = manifest.orderPolicy;
  if (typeof orderPolicy !== 'object' || orderPolicy === null) {
    errors.push('orderPolicy must be an object');
  } else {
    if (orderPolicy.entryType !== 'limit') {
      errors.push('orderPolicy.entryType must be "limit"');
    }
    validateNumber(orderPolicy, 'marketableOffsetTicks', errors, { integer: true });
    validateNumber(orderPolicy, 'timeoutBars', errors, { integer: true });
  }

  const risk = manifest.risk;
  if (typeof risk !== 'object' || risk === null) {
    errors.push('risk must be an object');
  } else {
    validateString(risk, 'qtyType', errors);
    validateNumber(risk, 'qtyValue', errors);
    validateNumber(risk, 'pyramiding', errors, { integer: true });
  }

  const backtest = manifest.backtestAssumptions;
  if (typeof backtest !== 'object' || backtest === null) {
    errors.push('backtestAssumptions must be an object');
  } else {
    validateNumber(backtest, 'commissionPerContractCash', errors);
    validateNumber(backtest, 'slippageTicks', errors, { integer: true });
  }

  return errors;
}

function validateStrategyDir(dirPath) {
  const errors = [];
  const manifestPath = path.join(dirPath, 'manifest.json');
  const readmePath = path.join(dirPath, 'README.md');
  const pinePath = path.join(dirPath, 'strategy.pine');

  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing manifest.json');
  } else {
    const manifestErrors = validateManifest(manifestPath);
    manifestErrors.forEach((msg) => errors.push(msg));
  }

  if (!fs.existsSync(readmePath)) {
    errors.push('Missing README.md');
  }

  if (!fs.existsSync(pinePath)) {
    errors.push('Missing strategy.pine');
  }

  return errors;
}

function main() {
  const root = process.cwd();
  const strategiesDir = path.join(root, 'strategies');
  const entries = fs.readdirSync(strategiesDir, { withFileTypes: true });

  const failures = [];

  entries.filter((e) => e.isDirectory()).forEach((entry) => {
    const dirPath = path.join(strategiesDir, entry.name);
    const errors = validateStrategyDir(dirPath);
    if (errors.length > 0) {
      failures.push({ name: entry.name, errors });
    }
  });

  if (failures.length > 0) {
    failures.forEach((f) => {
      console.error(`Strategy ${f.name} manifest validation failed:`);
      f.errors.forEach((err) => console.error(`  - ${err}`));
    });
    process.exit(1);
  }

  console.log('All strategy manifests are valid.');
}

if (require.main === module) {
  main();
}

module.exports = {
  validateManifest,
  validateStrategyDir,
};
