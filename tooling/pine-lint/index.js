#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  maxInputs: 40,
  maxRequestSecurity: 20,
  maxLineLength: 120,
  disallowLookahead: true
};

const ERROR = 'ERROR';
const WARN = 'WARN';

function loadConfig(cwd) {
  const rcPath = path.join(cwd, '.pinelintrc.json');
  if (fs.existsSync(rcPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
      return { ...DEFAULT_CONFIG, ...data };
    } catch (e) {
      console.error(`Failed to read .pinelintrc.json: ${e.message}`);
    }
  }
  return { ...DEFAULT_CONFIG };
}

function isComment(line) {
  return line.trim().startsWith('//');
}

function reportIssue(issues, level, code, message, line, col) {
  issues.push({ level, code, message, line, col });
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function globToRegex(globPattern) {
  let regex = '^';
  for (let i = 0; i < globPattern.length; i++) {
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
    if ('+.?^${}()|[]\\'.includes(char)) {
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
  const regex = globToRegex(path.resolve(baseDir, globPattern));
  return walk(process.cwd()).filter((f) => regex.test(path.resolve(f)));
}

function checkFile(filePath, config = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };
  const issues = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    reportIssue(issues, ERROR, 'IO_READ', `Unable to read file: ${e.message}`, 1, 1);
    return issues;
  }

  if (content.includes('\r')) {
    reportIssue(issues, ERROR, 'E_NEWLINE', 'Use Unix newlines (no CR characters).', 1, 1);
  }

  if (!content.endsWith('\n')) {
    reportIssue(issues, ERROR, 'E_NO_FINAL_NEWLINE', 'File must end with a newline.', 1, content.length);
  }

  const lines = content.split('\n');
  let firstNonEmpty = null;
  let versionLineIdx = null;
  let declarationLineIdx = null;
  let declarationCount = 0;
  let inputsCount = 0;
  let requestSecurityCount = 0;
  const globalVars = new Set();
  const loopStack = [];
  const functionStack = [];
  let previousIndent = 0;
  let previousLineWasBlock = false;
  let previousMeaningfulLine = '';

  // Delimiter balance tracking
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const openers = new Set(['(', '[', '{']);
  const closers = new Set([')', ']', '}']);

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    if (line.match(/\t/)) {
      reportIssue(issues, ERROR, 'E_TAB', 'Tabs are not allowed; use spaces.', lineNumber, line.indexOf('\t') + 1);
    }
    if (line.match(/\s+$/) && line.trim() !== '') {
      const col = line.match(/\s+$/).index + 1;
      reportIssue(issues, ERROR, 'E_TRAILING_WS', 'Trailing whitespace detected.', lineNumber, col);
    }

    if (firstNonEmpty === null && line.trim() !== '') {
      firstNonEmpty = lineNumber;
      if (!line.trim().startsWith('//@version=')) {
        reportIssue(issues, ERROR, 'E_VERSION', 'First non-empty line must declare //@version=5 (or 6).', lineNumber, 1);
      } else if (!line.trim().match(/^\/\/\@version=[56]$/)) {
        reportIssue(issues, ERROR, 'E_VERSION', 'Version line must be //@version=5 or //@version=6.', lineNumber, 1);
      } else {
        versionLineIdx = lineNumber;
      }
    }

    if (line.trim().length === 0 || isComment(line)) {
      previousLineWasBlock = false;
      return;
    }

    const cleanLine = line.split('//')[0];

    // Declaration detection
    const declMatch = cleanLine.match(/\b(strategy|indicator)\s*\(/);
    if (declMatch && lineNumber !== firstNonEmpty) {
      declarationCount += 1;
      declarationLineIdx = lineNumber;
    }

    // Global var detection at top level
    const indent = line.match(/^\s*/)[0].length;
    while (loopStack.length && indent <= loopStack[loopStack.length - 1]) {
      loopStack.pop();
    }
    while (functionStack.length && indent <= functionStack[functionStack.length - 1].indent) {
      functionStack.pop();
    }

    if (indent === 0) {
      const varMatch = line.match(/^\s*var\s+([A-Za-z_]\w*)/);
      if (varMatch) {
        globalVars.add(varMatch[1]);
      }
    }

    if (indent === 0 && cleanLine.match(/^\s*[A-Za-z_]\w*\s*\(.*\)\s*=>/)) {
      functionStack.push({ indent });
    }

    const inFunction = functionStack.length > 0;
    const inBlock = indent > 0;

    if (indent > 0 && indent % 4 !== 0) {
      reportIssue(issues, WARN, 'W_INDENT', 'Indentation should use 4-space multiples.', lineNumber, 1);
    }

    if (previousLineWasBlock && indent < previousIndent + 4) {
      reportIssue(issues, ERROR, 'E_INDENT_BLOCK', 'Expected indent by 4 spaces after block starter.', lineNumber, indent + 1);
    }

    previousIndent = indent;

    // Heuristic block detection
    const trimmed = cleanLine.trim();
    const blockStarter = /^(if|for|while|switch)\b/.test(trimmed) || /=>\s*$/.test(trimmed);
    previousLineWasBlock = blockStarter;

    // Loop stack management
    if (/^(for|while)\b/.test(trimmed)) {
      if (loopStack.length > 0) {
        reportIssue(issues, WARN, 'W_NESTED_LOOP', 'Nested loops detected; consider simplifying.', lineNumber, indent + 1);
      }
      loopStack.push(indent);
    }

    // Function rules
    if (inFunction && globalVars.size > 0) {
      for (const name of globalVars) {
        const assignPattern = new RegExp(`\\b${name}\\s*[:+\\-*/]?=`);
        if (assignPattern.test(cleanLine)) {
          reportIssue(issues, WARN, 'W_VAR_IN_FUNC', `Global var '${name}' modified inside function.`, lineNumber, cleanLine.indexOf(name) + 1);
        }
      }
    }

    // Plot inside local block
    if (inBlock && /\bplot\s*\(/.test(trimmed)) {
      reportIssue(issues, WARN, 'W_PLOT_BLOCK', 'plot() used inside an indented block; Pine may require top-level plotting.', lineNumber, trimmed.indexOf('plot') + 1);
    }

    // request.security lookahead
    const securityMatch = cleanLine.match(/request\.security\s*\(/);
    if (securityMatch) {
      requestSecurityCount += 1;
      if (options.disallowLookahead && /lookahead\s*=\s*barmerge\.lookahead_on/.test(cleanLine)) {
        reportIssue(issues, ERROR, 'E_LOOKAHEAD', 'request.security with lookahead=barmerge.lookahead_on is disallowed (repainting risk).', lineNumber, cleanLine.indexOf('lookahead') + 1);
      }
    }

    if (/barstate\.isrealtime/.test(cleanLine)) {
      reportIssue(issues, WARN, 'W_REALTIME', 'barstate.isrealtime can diverge between live and backtest.', lineNumber, cleanLine.indexOf('barstate.isrealtime') + 1);
    }

    if (/calc_on_every_tick\s*=\s*true/.test(cleanLine)) {
      reportIssue(issues, WARN, 'W_EVERY_TICK', 'calc_on_every_tick=true can cause live/backtest drift.', lineNumber, cleanLine.indexOf('calc_on_every_tick') + 1);
    }

    if (/strategy\.entry\s*\(/.test(cleanLine)) {
      const guardSource = `${previousMeaningfulLine} ${cleanLine}`;
      const hasGuard = /strategy\.position_size/.test(guardSource) || /ta\.cross/.test(guardSource) || /crossover|crossunder/.test(guardSource) || /barstate\.isnew/.test(guardSource);
      if (!hasGuard) {
        reportIssue(issues, WARN, 'W_ENTRY_GUARD', 'strategy.entry call may trigger every bar without crossover/position guard.', lineNumber, cleanLine.indexOf('strategy.entry') + 1);
      }
    }

    const inputsInLine = (cleanLine.match(/input\./g) || []).length;
    inputsCount += inputsInLine;
    if (inputsInLine > 1) {
      reportIssue(issues, WARN, 'W_INPUT_PER_LINE', 'Use one input.* call per line.', lineNumber, cleanLine.indexOf('input.') + 1);
    }

    if (cleanLine.includes(';')) {
      reportIssue(issues, WARN, 'W_MULTI_STMT', 'Avoid multi-statement lines separated by ;', lineNumber, cleanLine.indexOf(';') + 1);
    }

    if (trimmed.endsWith(',') || /[+\-*/]=?$/.test(trimmed)) {
      reportIssue(issues, WARN, 'W_DANGLING', 'Dangling comma or operator at end of line may cause continuation errors.', lineNumber, trimmed.length);
    }

    if (cleanLine.length > options.maxLineLength && cleanLine.includes('(') && cleanLine.includes(')')) {
      reportIssue(issues, WARN, 'W_LINE_LENGTH', `Line exceeds ${options.maxLineLength} characters; consider line breaks.`, lineNumber, options.maxLineLength + 1);
    }

    // Delimiter balance
    for (let i = 0; i < cleanLine.length; i++) {
      const ch = cleanLine[i];
      if (openers.has(ch)) {
        stack.push({ ch, line: lineNumber, col: i + 1 });
      } else if (closers.has(ch)) {
        if (stack.length === 0) {
          reportIssue(issues, ERROR, 'E_UNBALANCED', `Unmatched closing '${ch}'.`, lineNumber, i + 1);
        } else {
          const last = stack.pop();
          if (pairs[last.ch] !== ch) {
            reportIssue(issues, ERROR, 'E_UNBALANCED', `Mismatched delimiter '${last.ch}' closed by '${ch}'.`, lineNumber, i + 1);
          }
        }
      }
    }
    previousMeaningfulLine = cleanLine.trim();
  });

  if (versionLineIdx === null) {
    reportIssue(issues, ERROR, 'E_VERSION', 'Missing //@version=5 declaration.', 1, 1);
  }

  if (declarationCount === 0) {
    reportIssue(issues, ERROR, 'E_DECLARATION', 'Missing top-level strategy()/indicator() declaration.', firstNonEmpty || 1, 1);
  }
  if (declarationCount > 1) {
    reportIssue(issues, ERROR, 'E_DECLARATION', 'Multiple strategy()/indicator() declarations found; only one allowed.', declarationLineIdx || 1, 1);
  }
  if (declarationLineIdx && versionLineIdx && declarationLineIdx < versionLineIdx) {
    reportIssue(issues, ERROR, 'E_DECLARATION_ORDER', 'strategy()/indicator() must appear after version line.', declarationLineIdx, 1);
  }

  if (stack.length > 0) {
    const unmatched = stack.pop();
    reportIssue(issues, ERROR, 'E_UNBALANCED', `Unclosed delimiter '${unmatched.ch}'.`, unmatched.line, unmatched.col);
  }

  if (inputsCount > options.maxInputs) {
    reportIssue(issues, WARN, 'W_PARAM_BLOAT', `Too many input.* calls (${inputsCount}) > maxInputs (${options.maxInputs}).`, 1, 1);
  }

  if (requestSecurityCount > options.maxRequestSecurity) {
    reportIssue(issues, WARN, 'W_SECURITY_COUNT', `Too many request.security calls (${requestSecurityCount}) > limit (${options.maxRequestSecurity}).`, 1, 1);
  }

  return issues;
}

function formatIssues(filePath, issues, json) {
  if (json) {
    return JSON.stringify(issues.map((i) => ({ file: filePath, ...i })), null, 2);
  }
  return issues
    .map((i) => `${filePath}:${i.line}:${i.col} - [${i.level}] ${i.code} - ${i.message}`)
    .join('\n');
}

function lint(globPattern, options) {
  const files = matchGlob(globPattern);
  const config = loadConfig(process.cwd());
  let allIssues = [];
  files.forEach((file) => {
    const issues = checkFile(file, config);
    if (issues.length) {
      allIssues = allIssues.concat(issues.map((i) => ({ file, ...i })));
    }
  });

  if (options.format === 'json') {
    console.log(JSON.stringify(allIssues, null, 2));
  } else {
    allIssues.forEach((i) => {
      console.log(`${i.file}:${i.line}:${i.col} - [${i.level}] ${i.code} - ${i.message}`);
    });
  }

  const hasErrors = allIssues.some((i) => i.level === ERROR);
  return hasErrors ? 1 : 0;
}

function showHelp() {
  console.log('Usage: pine-lint lint <glob> [--format json]');
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== 'lint') {
    showHelp();
    process.exit(1);
  }
  const globPattern = args[1];
  const formatFlagIdx = args.indexOf('--format');
  const options = { format: 'text' };
  if (formatFlagIdx !== -1 && args[formatFlagIdx + 1]) {
    options.format = args[formatFlagIdx + 1];
  }
  const exitCode = lint(globPattern, options);
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = { checkFile, lint, loadConfig, DEFAULT_CONFIG };
