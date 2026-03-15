const { validateMessage } = require('../validation');
const assert = require('assert');
let pass = 0, fail = 0;

function test(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.error(`  ✗ ${name}: ${e.message}`); }
}

console.log('validateMessage tests');

// -- null / bad input
test('rejects null', () => assert.strictEqual(validateMessage(null).valid, false));
test('rejects non-object', () => assert.strictEqual(validateMessage('hi').valid, false));

// -- unknown commands pass through
test('allows unknown command', () => assert.strictEqual(validateMessage({ command: 'check_auth' }).valid, true));

// -- save_keys
test('save_keys: rejects missing keys', () => assert.strictEqual(validateMessage({ command: 'save_keys' }).valid, false));
test('save_keys: rejects empty apiKey', () => {
  assert.strictEqual(validateMessage({ command: 'save_keys', keys: { apiKey: '', secret: 's', passphrase: 'p' } }).valid, false);
});
test('save_keys: accepts valid keys', () => {
  assert.strictEqual(validateMessage({ command: 'save_keys', keys: { apiKey: 'a', secret: 's', passphrase: 'p' } }).valid, true);
});

// -- place_order
test('place_order: rejects missing instId', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', side: 'buy', type: 'limit', sz: 1 }).valid, false);
});
test('place_order: rejects bad instId', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'ab', side: 'buy', type: 'limit', sz: 1 }).valid, false);
});
test('place_order: rejects bad side', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'hold', type: 'limit', sz: 1 }).valid, false);
});
test('place_order: rejects bad type', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'foo', sz: 1 }).valid, false);
});
test('place_order: rejects zero size', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'market', sz: 0 }).valid, false);
});
test('place_order: rejects negative size', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'market', sz: -1 }).valid, false);
});
test('place_order: rejects bad price', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'limit', sz: 1, px: -5 }).valid, false);
});
test('place_order: accepts valid limit order', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'limit', sz: 1, px: 100 }).valid, true);
});
test('place_order: accepts valid market order', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'sell', type: 'market', sz: 0.5 }).valid, true);
});
test('place_order: accepts stop order type', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'stop', sz: 1, px: 100 }).valid, true);
});
test('place_order: accepts trailing stop order type', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'trailing stop', sz: 1, px: 100 }).valid, true);
});
test('place_order: accepts uppercase order type', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'LIMIT', sz: 1, px: 100 }).valid, true);
});
test('place_order: accepts mixed-case order type', () => {
  assert.strictEqual(validateMessage({ command: 'place_order', instId: 'BTC-USDT', side: 'buy', type: 'Market', sz: 1 }).valid, true);
});

// -- set_leverage
test('set_leverage: rejects missing instId', () => {
  assert.strictEqual(validateMessage({ command: 'set_leverage', lever: 10 }).valid, false);
});
test('set_leverage: rejects lever < 1', () => {
  assert.strictEqual(validateMessage({ command: 'set_leverage', instId: 'BTC-USDT-SWAP', lever: 0 }).valid, false);
});
test('set_leverage: rejects lever > 125', () => {
  assert.strictEqual(validateMessage({ command: 'set_leverage', instId: 'BTC-USDT-SWAP', lever: 200 }).valid, false);
});
test('set_leverage: accepts valid', () => {
  assert.strictEqual(validateMessage({ command: 'set_leverage', instId: 'BTC-USDT-SWAP', lever: 10 }).valid, true);
});

// -- stop_bot
test('stop_bot: rejects missing algoId', () => {
  assert.strictEqual(validateMessage({ command: 'stop_bot', instId: 'BTC-USDT', algoOrdType: 'grid' }).valid, false);
});
test('stop_bot: rejects missing instId', () => {
  assert.strictEqual(validateMessage({ command: 'stop_bot', algoId: '123', algoOrdType: 'grid' }).valid, false);
});
test('stop_bot: rejects missing algoOrdType', () => {
  assert.strictEqual(validateMessage({ command: 'stop_bot', algoId: '123', instId: 'BTC-USDT' }).valid, false);
});
test('stop_bot: rejects invalid algoOrdType pattern', () => {
  assert.strictEqual(validateMessage({ command: 'stop_bot', algoId: '123', instId: 'BTC-USDT', algoOrdType: '--inject' }).valid, false);
});
test('stop_bot: accepts valid', () => {
  assert.strictEqual(validateMessage({ command: 'stop_bot', algoId: '123', instId: 'BTC-USDT', algoOrdType: 'grid' }).valid, true);
});

// -- close_position
test('close_position: rejects missing instId', () => {
  assert.strictEqual(validateMessage({ command: 'close_position' }).valid, false);
});
test('close_position: accepts valid', () => {
  assert.strictEqual(validateMessage({ command: 'close_position', instId: 'BTC-USDT-SWAP' }).valid, true);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
