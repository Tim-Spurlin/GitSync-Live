const assert = require('node:assert');
const { parseLogQuery, parseStatsQuery } = require('../server');

// Valid parsing for logs
assert.deepStrictEqual(parseLogQuery({ lines: '50', since: '2d' }), { lines: 50, since: '2d' });

// Default values when params missing
assert.deepStrictEqual(parseLogQuery({}), { lines: 100, since: '1d' });

// Invalid lines should throw
assert.deepStrictEqual(parseLogQuery({ lines: '-1' }), { lines: 1, since: '1d' });

// Statistics schema defaults and overrides
assert.deepStrictEqual(parseStatsQuery({}), { timeRange: '1d' });
assert.deepStrictEqual(parseStatsQuery({ timeRange: '7d' }), { timeRange: '7d' });

console.log('All tests passed');
