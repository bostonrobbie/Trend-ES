#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ERROR = 'ERROR';
const WARN = 'WARN';

const DEFAULT_CONFIG = {
  requiredVersion: 6,
  disallowLookaheadOn: true,
  requireLimitOrders: true,
  maxInputs: 40,
  maxRequestSecurity: 20,
  maxLineLength: 120,
  enforceOneInputPerLine: true,
  enforceNoTabs: true,
  enforce4SpaceIndent: true,
  disallowCalcOnEveryTick: true,
};

const RESERVED_IDENTIFIERS = [
  'strategy',
  'indicator',
  'var',
  'if',
  'for',
  'while',
  'switch',
  'import',
  'request',
  'plot',
  'label',
  'line',
  'table',
  'time',
  'close',
  'open',
  'high',
  'low',
  'volume',
];

const GATING_TOKENS = [
  /ta\.crossover/,
  /ta\.crossunder/,
  /strategy\.position_size/,
  /barstate\.isconfirmed/,
  /once/, // once per bar/day patterns
  /barstate\.isnew/,
];

function loadConfig(customPath) {
  const configPath = customPath || path.join(process.cwd(), '.pinelintrc.json');
  const merged = { ...DEFAULT_CONFIG };
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(merged, data);
    } catch (err) {
      console.error(`Failed to parse config at ${configPath}: ${err.message}`);
    }
  }
  return merged;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else {
      files.push(fullPath);
    }
  });
  return files;
}

function globToRegex(globPattern) {
  let regex = '^';
  for (let i = 0; i < globPattern.length; i += 1) {
    const char = globPattern[i];
    const next = globPattern[i + 1];
    if (char === '*' && next === '*') {
      regex += '.*';
      i += 1;
      continue;
    }
    if (char === '*') {
      regex += '[^/]*';
      continue;
    }
    if ('.+?^${}()|[]\\'.includes(char)) {
      regex += `\\${char}`;
    } else {
      regex += char;
    }
  }
  regex += '$';
  return new RegExp(regex);
}

function matchGlob(globPattern) {
  const baseDir = globPattern.startsWith('/') ? '/' : process.cwd();
  const resolvedPattern = path.resolve(baseDir, globPattern);
  const regex = globToRegex(resolvedPattern);
  return walk(process.cwd())
    .filter((filePath) => regex.test(path.resolve(filePath)));
}

function addIssue(issues, { line, col = 1, code, message, severity }) {
  issues.push({ line, col, code, message, severity });
}

function checkDelimiterBalance(lines, issues) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const openers = new Set(Object.keys(pairs));
  const closers = new Set(Object.values(pairs));
  const stack = [];

  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const line = rawLine.split('//')[0];
    for (let c = 0; c < line.length; c += 1) {
      const ch = line[c];
      if (openers.has(ch)) {
        stack.push({ ch, line: lineNumber, col: c + 1 });
      } else if (closers.has(ch)) {
        if (stack.length === 0) {
          addIssue(issues, {
            line: lineNumber,
            col: c + 1,
            code: 'E_DELIM',
            message: 'Unmatched closing delimiter.',
            severity: ERROR,
          });
        } else {
          const last = stack.pop();
          if (pairs[last.ch] !== ch) {
            addIssue(issues, {
              line: lineNumber,
              col: c + 1,
              code: 'E_DELIM',
              message: `Mismatched delimiter. Expected ${pairs[last.ch]} to close ${last.ch}.`,
              severity: ERROR,
            });
          }
        }
      }
    }
  });

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    addIssue(issues, {
      line: unclosed.line,
      col: unclosed.col,
      code: 'E_DELIM',
      message: `Unclosed delimiter ${unclosed.ch}.`,
      severity: ERROR,
    });
  }
}

function lineEndsWithContinuation(line) {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  return /[,=]$/.test(trimmed)
    || /[+\-*/%]$/.test(trimmed)
    || /\b(?:and|or)$/.test(trimmed)
    || /[?:]$/.test(trimmed)
    || /[([{]$/.test(trimmed);
}

function hasGatingContext(line, contextLines) {
  return GATING_TOKENS.some((re) => re.test(line) || contextLines.some((ctx) => re.test(ctx)));
}

function lintContent(content, config) {
  const issues = [];
  const lines = content.split('\n');
  checkDelimiterBalance(lines, issues);

  let firstNonEmpty = null;
  let declarationCount = 0;
  let declarationLine = -1;
  let versionSeen = false;
  let inputsCount = 0;
  let requestSecurityCount = 0;
  let hasCancelPattern = false;
  let sawStrategyEntry = false;
  const globalVars = new Set();
  const functionStack = [];
  const loopStack = [];
  let previousIndent = 0;
  let previousLineWasBlock = false;
  const recentMeaningful = [];

  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const trimmed = rawLine.trim();
    const commentless = rawLine.split('//')[0];
    const indent = rawLine.match(/^\s*/)[0].length;

    if (config.enforceNoTabs && rawLine.includes('\t')) {
      addIssue(issues, {
        line: lineNumber,
        col: rawLine.indexOf('\t') + 1,
        code: 'E_TAB',
        message: 'Tabs are not allowed; use spaces.',
        severity: ERROR,
      });
    }

    const trailingMatch = rawLine.match(/\s+$/);
    if (trailingMatch && trimmed.length > 0) {
      addIssue(issues, {
        line: lineNumber,
        col: trailingMatch.index + 1,
        code: 'E_TRAILING_WS',
        message: 'Trailing whitespace detected.',
        severity: ERROR,
      });
    }

    if (firstNonEmpty === null && trimmed.length > 0) {
      firstNonEmpty = lineNumber;
      const versionPattern = new RegExp(`^\/\/\@version=${config.requiredVersion}$`);
      if (!versionPattern.test(trimmed)) {
        addIssue(issues, {
          line: lineNumber,
          col: 1,
          code: 'E_VERSION',
          message: `First non-empty line must be //@version=${config.requiredVersion}.`,
          severity: ERROR,
        });
      } else {
        versionSeen = true;
      }
    }

    if (trimmed.length === 0 || trimmed.startsWith('//')) {
      previousLineWasBlock = false;
      return;
    }

    if (commentless.includes('strategy.cancel') || commentless.includes('strategy.close')) {
      hasCancelPattern = true;
    }

    const declarationMatch = commentless.match(/^(strategy|indicator)\s*\(/);
    if (declarationMatch) {
      declarationCount += 1;
      declarationLine = lineNumber;
      if (!versionSeen && declarationCount === 1) {
        addIssue(issues, {
          line: lineNumber,
          col: 1,
          code: 'E_DECLARATION_ORDER',
          message: 'strategy()/indicator() must appear after the version declaration.',
          severity: ERROR,
        });
      }
      const commaCount = (commentless.match(/,/g) || []).length;
      if (commaCount >= 5 || rawLine.length > config.maxLineLength) {
        addIssue(issues, {
          line: lineNumber,
          col: 1,
          code: 'W_STRATEGY_ARGS',
          message: 'strategy()/indicator() has many arguments on one line; consider breaking lines.',
          severity: WARN,
        });
      }
    }

    const inputMatches = commentless.match(/input\./g);
    if (inputMatches) {
      inputsCount += inputMatches.length;
      if (config.enforceOneInputPerLine && inputMatches.length > 1) {
        addIssue(issues, {
          line: lineNumber,
          col: 1,
          code: 'W_INPUT_STYLE',
          message: 'Use one input.* call per line.',
          severity: WARN,
        });
      }
    }

    const requestMatches = commentless.match(/request\.security/g);
    if (requestMatches) {
      requestSecurityCount += requestMatches.length;
      const lookaheadOn = /lookahead\s*=\s*barmerge\.lookahead_on/;
      if (config.disallowLookaheadOn && lookaheadOn.test(commentless)) {
        addIssue(issues, {
          line: lineNumber,
          col: commentless.indexOf('request.security') + 1,
          code: 'E_LOOKAHEAD_ON',
          message: 'request.security with lookahead=barmerge.lookahead_on is disallowed.',
          severity: ERROR,
        });
      }
      if (!/lookahead\s*=/.test(commentless)) {
        addIssue(issues, {
          line: lineNumber,
          col: commentless.indexOf('request.security') + 1,
          code: 'W_LOOKAHEAD_DEFAULT',
          message: 'request.security without explicit lookahead may repaint.',
          severity: WARN,
        });
      }
    }

    if (config.disallowCalcOnEveryTick && /calc_on_every_tick\s*=\s*true/.test(commentless)) {
      addIssue(issues, {
        line: lineNumber,
        col: commentless.indexOf('calc_on_every_tick') + 1,
        code: 'W_EVERY_TICK',
        message: 'calc_on_every_tick=true can diverge between backtest and realtime.',
        severity: WARN,
      });
    }

    const reservedRegex = new RegExp(`^(?:var\s+)?(${RESERVED_IDENTIFIERS.join('|')})\b\s*(?::=|=)`);
    if (reservedRegex.test(trimmed) && !/\./.test(trimmed.split(/:=|=/)[0])) {
      addIssue(issues, {
        line: lineNumber,
        col: 1,
        code: 'E_RESERVED_IDENTIFIER',
        message: 'Reserved Pine identifier used as a variable or assignment target.',
        severity: ERROR,
      });
    }

    while (functionStack.length && indent <= functionStack[functionStack.length - 1].indent) {
      functionStack.pop();
    }

    const functionStart = /^\s*[A-Za-z_]\w*\s*\([^)]*\)\s*=>/.test(commentless);
    if (functionStart) {
      functionStack.push({ indent });
    }
    const inFunction = functionStack.length > 0;

    if (indent > 0 && indent % 4 !== 0) {
      addIssue(issues, {
        line: lineNumber,
        col: 1,
        code: 'W_INDENT',
        message: 'Indentation should use multiples of 4 spaces.',
        severity: config.enforce4SpaceIndent ? ERROR : WARN,
      });
    }

    const blockStarter = /^(if|for|while|switch)\b/.test(commentless.trim()) || /=>\s*$/.test(commentless.trim());
    if (previousLineWasBlock && indent < previousIndent + 4) {
      addIssue(issues, {
        line: lineNumber,
        col: indent + 1,
        code: 'W_BLOCK_INDENT',
        message: 'Expected indent increase after block starter.',
        severity: WARN,
      });
    }
    previousLineWasBlock = blockStarter;
    previousIndent = indent;

    while (loopStack.length && indent <= loopStack[loopStack.length - 1]) {
      loopStack.pop();
    }
    if (/^(for|while)\b/.test(commentless.trim())) {
      if (loopStack.length > 0) {
        addIssue(issues, {
          line: lineNumber,
          col: indent + 1,
          code: 'W_NESTED_LOOP',
          message: 'Nested loops detected; consider simplifying.',
          severity: WARN,
        });
      }
      loopStack.push(indent);
    }

    if (indent === 0) {
      const varMatch = commentless.match(/^\s*(?:var\s+)?([A-Za-z_]\w*)\s*(?::=|=)/);
      if (varMatch) {
        globalVars.add(varMatch[1]);
      }
    }

    if (inFunction) {
      globalVars.forEach((name) => {
        const assignRegex = new RegExp(`\b${name}\b\s*(?::=|=)`);
        if (assignRegex.test(commentless)) {
          addIssue(issues, {
            line: lineNumber,
            col: commentless.search(assignRegex) + 1,
            code: 'E_GLOBAL_MUTATION',
            message: 'Cannot modify global variable inside a function.',
            severity: ERROR,
          });
        }
      });
    }

    if (indent > 0 || inFunction) {
      if (/(^|\W)(plot|plotshape|plotchar|label\.new|line\.new|table\.)/.test(commentless)) {
        addIssue(issues, {
          line: lineNumber,
          col: 1,
          code: 'W_PLOT_SCOPE',
          message: 'Plotting calls inside local scope may be disallowed by Pine.',
          severity: WARN,
        });
      }
    }

    const entryIndex = commentless.indexOf('strategy.entry');
    if (entryIndex !== -1) {
      sawStrategyEntry = true;
      const hasLimit = /limit\s*=/.test(commentless);
      if (config.requireLimitOrders && !hasLimit) {
        addIssue(issues, {
          line: lineNumber,
          col: entryIndex + 1,
          code: 'E_LIMIT_ORDER',
          message: 'strategy.entry requires a limit= parameter (limit-order-first discipline).',
          severity: ERROR,
        });
      }
      if (hasLimit && /limit\s*=\s*(close|open)\b/.test(commentless)) {
        addIssue(issues, {
          line: lineNumber,
          col: entryIndex + 1,
          code: 'W_LIMIT_MARKET_LIKE',
          message: 'Limit price equals a bar value; consider tick offsets to avoid fantasy fills.',
          severity: WARN,
        });
      }
      if (!hasGatingContext(commentless, recentMeaningful)) {
        addIssue(issues, {
          line: lineNumber,
          col: entryIndex + 1,
          code: 'W_SPAM_ENTRY',
          message: 'strategy.entry lacks gating (crossovers/position checks); may fire every bar.',
          severity: WARN,
        });
      }
    }

    if (lineEndsWithContinuation(commentless)) {
      addIssue(issues, {
        line: lineNumber,
        col: commentless.length,
        code: 'E_EOL_CONTINUATION',
        message: 'Line ends with a dangling operator or delimiter; add explicit continuation.',
        severity: ERROR,
      });
    }

    if (commentless.includes(';')) {
      addIssue(issues, {
        line: lineNumber,
        col: commentless.indexOf(';') + 1,
        code: 'W_MULTI_STATEMENT',
        message: 'Avoid multiple statements on one line.',
        severity: WARN,
      });
    }

    if (commentless.length > config.maxLineLength && commentless.includes('(')) {
      addIssue(issues, {
        line: lineNumber,
        col: config.maxLineLength + 1,
        code: 'W_LINE_LENGTH',
        message: `Argument list exceeds ${config.maxLineLength} characters; consider breaking lines.`,
        severity: WARN,
      });
    }

    recentMeaningful.push(commentless.trim());
    if (recentMeaningful.length > 5) {
      recentMeaningful.shift();
    }
  });

  if (!firstNonEmpty) {
    addIssue(issues, {
      line: 1,
      col: 1,
      code: 'E_EMPTY',
      message: 'File is empty.',
      severity: ERROR,
    });
  }

  if (declarationCount === 0 && firstNonEmpty) {
    addIssue(issues, {
      line: firstNonEmpty,
      col: 1,
      code: 'E_DECLARATION_MISSING',
      message: 'Exactly one top-level strategy()/indicator() declaration is required.',
      severity: ERROR,
    });
  } else if (declarationCount > 1) {
    addIssue(issues, {
      line: declarationLine,
      col: 1,
      code: 'E_DECLARATION_COUNT',
      message: 'Only one top-level strategy()/indicator() declaration allowed.',
      severity: ERROR,
    });
  }

  if (inputsCount > config.maxInputs) {
    addIssue(issues, {
      line: 1,
      col: 1,
      code: 'W_INPUT_BLOAT',
      message: `Input count ${inputsCount} exceeds ${config.maxInputs}; risk of overfitting.`,
      severity: WARN,
    });
  }

  if (requestSecurityCount > config.maxRequestSecurity) {
    addIssue(issues, {
      line: 1,
      col: 1,
      code: 'W_SECURITY_BLOAT',
      message: `request.security called ${requestSecurityCount} times; consider reducing requests.`,
      severity: WARN,
    });
  }

  if (sawStrategyEntry && !hasCancelPattern) {
    addIssue(issues, {
      line: declarationLine > 0 ? declarationLine : 1,
      col: 1,
      code: 'W_NO_CANCEL',
      message: 'No cancel/timeout logic detected for limit orders.',
      severity: WARN,
    });
  }

  return issues;
}

function lintFile(filePath, config) {
  const issues = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    addIssue(issues, {
      line: 1,
      col: 1,
      code: 'E_IO',
      message: `Unable to read file: ${err.message}`,
      severity: ERROR,
    });
    return issues;
  }

  if (content.includes('\r')) {
    addIssue(issues, {
      line: 1,
      col: 1,
      code: 'E_NEWLINE',
      message: 'Use Unix newlines (\\n only).',
      severity: ERROR,
    });
  }

  if (!content.endsWith('\n')) {
    addIssue(issues, {
      line: Math.max(content.split('\n').length, 1),
      col: Math.max(content.split('\n').pop().length, 1),
      code: 'E_NO_FINAL_NEWLINE',
      message: 'File must end with a newline.',
      severity: ERROR,
    });
  }

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  return lintContent(content, mergedConfig);
}

function formatIssues(issues, format, filePath) {
  if (format === 'json') {
    return issues.map((issue) => ({ ...issue, file: filePath }));
  }
  issues.forEach((issue) => {
    const { line, col, severity, code, message } = issue;
    console.log(`${filePath}:${line}:${col} - [${severity}] ${code} - ${message}`);
  });
  return [];
}

function runLintCommand(argv) {
  let format = 'text';
  let configPath = null;
  const patterns = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') {
      format = argv[i + 1] || 'text';
      i += 1;
    } else if (arg === '--config') {
      configPath = argv[i + 1];
      i += 1;
    } else {
      patterns.push(arg);
    }
  }

  if (patterns.length === 0) {
    console.error('Usage: node tooling/pine-lint/index.js lint "glob" [--format json] [--config path]');
    process.exit(1);
  }

  const config = loadConfig(configPath);
  let allIssues = [];

  patterns.forEach((pattern) => {
    const files = matchGlob(pattern);
    files.forEach((filePath) => {
      const issues = lintFile(filePath, config);
      const serialized = format === 'json' ? formatIssues(issues, 'json', filePath) : [];
      if (format !== 'json') {
        formatIssues(issues, 'text', filePath);
      }
      allIssues = allIssues.concat(serialized.length > 0 ? serialized : issues.map((issue) => ({ ...issue, file: filePath })));
    });
  });

  if (format === 'json') {
    console.log(JSON.stringify(allIssues, null, 2));
  }

  const hasError = allIssues.some((issue) => issue.severity === ERROR);
  process.exit(hasError ? 1 : 0);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'lint') {
    runLintCommand(rest);
  } else {
    console.error('Usage: node tooling/pine-lint/index.js lint "glob" [--format json] [--config path]');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { lintFile, loadConfig, DEFAULT_CONFIG, ERROR, WARN };
