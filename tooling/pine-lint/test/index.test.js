const path = require('path');
const { describe, it, expect } = require('vitest');
const { lintFile, DEFAULT_CONFIG } = require('../index');

function lintFixture(name, overrides = {}) {
  const filePath = path.join(__dirname, '..', 'fixtures', name);
  return lintFile(filePath, { ...DEFAULT_CONFIG, ...overrides });
}

describe('pine-lint fixtures', () => {
  it('passes good_v6 without errors', () => {
    const issues = lintFixture('good_v6.pine');
    const errors = issues.filter((i) => i.severity === 'ERROR');
    expect(errors).toHaveLength(0);
  });

  it('flags unbalanced delimiters', () => {
    const issues = lintFixture('bad_unbalanced.pine');
    expect(issues.some((i) => i.code === 'E_DELIM')).toBe(true);
  });

  it('flags indentation problems', () => {
    const issues = lintFixture('bad_indent.pine');
    expect(issues.some((i) => i.code === 'W_INDENT')).toBe(true);
  });

  it('flags lookahead on request.security', () => {
    const issues = lintFixture('bad_lookahead.pine');
    expect(issues.some((i) => i.code === 'E_LOOKAHEAD_ON')).toBe(true);
  });

  it('flags dangling EOL operators', () => {
    const issues = lintFixture('bad_eol.pine');
    expect(issues.some((i) => i.code === 'E_EOL_CONTINUATION')).toBe(true);
  });

  it('detects global mutation inside function', () => {
    const issues = lintFixture('bad_global_mutation.pine');
    expect(issues.some((i) => i.code === 'E_GLOBAL_MUTATION')).toBe(true);
  });

  it('detects reserved identifier misuse', () => {
    const issues = lintFixture('bad_reserved_identifier.pine');
    expect(issues.some((i) => i.code === 'E_RESERVED_IDENTIFIER')).toBe(true);
  });

  it('requires limit orders', () => {
    const issues = lintFixture('bad_market_entry.pine');
    expect(issues.some((i) => i.code === 'E_LIMIT_ORDER')).toBe(true);
  });

  it('warns on spammy entries', () => {
    const issues = lintFixture('bad_spam_entry.pine');
    expect(issues.some((i) => i.code === 'W_SPAM_ENTRY')).toBe(true);
  });
});
