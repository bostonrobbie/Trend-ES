const tests = [];
const afterAllHandlers = [];
let describeStack = [];

function describe(name, fn) {
    describeStack.push(name);
    try {
        fn();
    } finally {
        describeStack.pop();
    }
}

function it(name, fn) {
    const fullName = [...describeStack, name].join(' > ');
    tests.push({ name: fullName, fn });
}

function afterAll(fn) {
    afterAllHandlers.push(fn);
}

function toDisplay(value) {
    if (typeof value === 'string') return `"${value}"`;
    return JSON.stringify(value);
}

function expect(received) {
    return {
        toBe(expected) {
            if (received !== expected) {
                throw new Error(`Expected ${toDisplay(received)} to be ${toDisplay(expected)}`);
            }
        },
        toEqual(expected) {
            const r = JSON.stringify(received);
            const e = JSON.stringify(expected);
            if (r !== e) {
                throw new Error(`Expected ${r} to equal ${e}`);
            }
        },
        toHaveLength(len) {
            if (received == null || typeof received.length !== 'number') {
                throw new Error('Value has no length property');
            }
            if (received.length !== len) {
                throw new Error(`Expected length ${len} but got ${received.length}`);
            }
        }
    };
}

function run() {
    let failed = 0;
    tests.forEach(({ name, fn }) => {
        try {
            fn();
            process.stdout.write(`✓ ${name}\n`);
        } catch (err) {
            failed += 1;
            process.stderr.write(`✗ ${name}\n`);
            process.stderr.write(`${err.stack || err.message}\n`);
        }
    });

    afterAllHandlers.forEach((handler) => {
        try {
            handler();
        } catch (err) {
            failed += 1;
            process.stderr.write(`afterAll failed: ${err.stack || err.message}\n`);
        }
    });

    if (failed > 0) {
        process.exitCode = 1;
    }
}

module.exports = { describe, it, expect, afterAll, run };
