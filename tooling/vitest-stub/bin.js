#!/usr/bin/env node
const path = require('path');
const { describe, it, expect, afterAll, run } = require('./index');

global.describe = describe;
global.it = it;
global.expect = expect;
global.afterAll = afterAll;

const testFile = path.join(process.cwd(), 'tooling', 'pine-lint', 'test', 'index.test.js');
require(testFile);
run();
