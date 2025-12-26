const { describe, it, expect } = require('vitest');
const path = require('path');
const { checkFile } = require('../index');

const fixtures = (name) => path.join(__dirname, '..', 'fixtures', name);

describe('pine-lint checks', () => {
  it('passes the good fixture', () => {
    const issues = checkFile(fixtures('good.pine'), {});
    const errors = issues.filter((i) => i.level === 'ERROR');
    expect(errors.length).toBe(0);
  });

  it('detects unbalanced delimiters', () => {
    const issues = checkFile(fixtures('bad_unbalanced.pine'), {});
    expect(issues.find((i) => i.code === 'E_UNBALANCED')).toBeTruthy();
  });

  it('detects indentation errors', () => {
    const issues = checkFile(fixtures('bad_indent.pine'), {});
    expect(issues.find((i) => i.code === 'E_INDENT_BLOCK' || i.code === 'W_INDENT')).toBeTruthy();
  });

  it('fails on lookahead usage', () => {
    const issues = checkFile(fixtures('bad_lookahead.pine'), {});
    expect(issues.find((i) => i.code === 'E_LOOKAHEAD')).toBeTruthy();
  });
});
