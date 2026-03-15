const assert = require('assert');
const crypto = require('crypto');
let pass = 0, fail = 0;

function test(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.error(`  ✗ ${name}: ${e.message}`); }
}

console.log('getDashboardHtml nonce tests');

// Simulate the nonce replacement regex used in getDashboardHtml
function applyNonce(html, nonce) {
  return html.replace(/<script(?=[\s>])/gi, `<script nonce="${nonce}"`);
}

const NONCE = crypto.randomBytes(16).toString('base64');

test('adds nonce to bare inline <script> tag', () => {
  const input = '<script>console.log("hi")</script>';
  const result = applyNonce(input, NONCE);
  assert.strictEqual(result, `<script nonce="${NONCE}">console.log("hi")</script>`);
});

test('adds nonce to <script src="..."> tag', () => {
  const input = '<script src="app.js"></script>';
  const result = applyNonce(input, NONCE);
  assert.strictEqual(result, `<script nonce="${NONCE}" src="app.js"></script>`);
});

test('adds nonce to ALL script tags, not just the first', () => {
  const input = [
    '<script src="chart.js"></script>',
    '<script src="renderers.js"></script>',
    '<script>var x = 1;</script>'
  ].join('\n');
  const result = applyNonce(input, NONCE);
  const escaped = NONCE.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const matches = result.match(new RegExp(`nonce="${escaped}"`, 'g'));
  assert.strictEqual(matches.length, 3, 'Expected 3 nonce attributes');
});

test('does NOT add nonce to </script> closing tags', () => {
  const input = '<script>x()</script>';
  const result = applyNonce(input, NONCE);
  assert.ok(!result.includes('</script nonce'), 'Closing tag should not get nonce');
  assert.strictEqual(result, `<script nonce="${NONCE}">x()</script>`);
});

test('does not modify non-script tags', () => {
  const input = '<div><span>hello</span></div>';
  const result = applyNonce(input, NONCE);
  assert.strictEqual(result, input);
});

test('handles dashboard.html-like structure correctly', () => {
  const html = [
    '<!DOCTYPE html><html><head><style>body{}</style></head><body>',
    '<header><button>Spot</button><button>Futures</button></header>',
    '<script src="vscode-resource:chart.js"></script>',
    '<script src="renderers.js"></script>',
    '<script>',
    "'use strict';",
    'const vscode = acquireVsCodeApi();',
    'document.querySelectorAll(".n-btn").forEach(b => {});',
    '</script>',
    '</body></html>'
  ].join('\n');
  const result = applyNonce(html, NONCE);

  // All three script tags should have nonces
  const noncePattern = new RegExp(`<script nonce="${NONCE.replace(/[+/=]/g, '\\$&')}"`, 'g');
  const matches = result.match(noncePattern);
  assert.strictEqual(matches.length, 3, 'All 3 script tags should have nonces');

  // No closing tags should be modified
  assert.ok(!result.includes('</script nonce'), 'Closing tags untouched');

  // HTML structure preserved
  assert.ok(result.includes('<header>'), 'Header preserved');
  assert.ok(result.includes('<button>Spot</button>'), 'Tab buttons preserved');
});

test('case-insensitive match for <SCRIPT> tags', () => {
  const input = '<SCRIPT src="app.js"></SCRIPT>';
  const result = applyNonce(input, NONCE);
  assert.ok(result.includes(`nonce="${NONCE}"`), 'Should add nonce to uppercase SCRIPT');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
