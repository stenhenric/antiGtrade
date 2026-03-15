const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
let pass = 0, fail = 0;

function test(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.error(`  ✗ ${name}: ${e.message}`); }
}

// We can test OkxService without the vscode dependency by mocking it
// Since the extension requires 'vscode', we test the config-related logic directly

console.log('OkxService (config) tests');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okx-test-'));
const configPath = path.join(tmpDir, 'config.toml');

// Helper to write and read TOML config like OkxService does
function writeConfig({ apiKey, secret, passphrase, isDemo }) {
  const profile = isDemo ? 'demo' : 'live';
  const tomlContent = `default_profile = "${profile}"

[profiles.${profile}]
demo = ${isDemo}
api_key = "${apiKey}"
secret_key = "${secret}"
passphrase = "${passphrase}"
`;
  fs.writeFileSync(configPath, tomlContent, { encoding: 'utf8' });
  try { fs.chmodSync(configPath, 0o600); } catch (_) {}
}

function loadConfig() {
  if (!fs.existsSync(configPath)) return { apiKey: '', secret: '', passphrase: '', isDemo: true };
  const txt = fs.readFileSync(configPath, 'utf8');
  const grab = key => {
    const m = txt.match(new RegExp(`${key}\\s*=\\s*\"([^\"]*)\"`));
    return m ? m[1] : '';
  };
  const apiKey = grab('api_key');
  const secret = grab('secret_key');
  const passphrase = grab('passphrase');
  const isDemo = /demo\s*=\s*true/i.test(txt) || /default_profile\s*=\s*"demo"/i.test(txt);
  return { apiKey, secret, passphrase, isDemo };
}

// Tests
test('loadConfig returns defaults when no file', () => {
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  const cfg = loadConfig();
  assert.strictEqual(cfg.apiKey, '');
  assert.strictEqual(cfg.secret, '');
  assert.strictEqual(cfg.passphrase, '');
  assert.strictEqual(cfg.isDemo, true);
});

test('writeConfig + loadConfig round-trips demo credentials', () => {
  writeConfig({ apiKey: 'ak1', secret: 'sk1', passphrase: 'pp1', isDemo: true });
  const cfg = loadConfig();
  assert.strictEqual(cfg.apiKey, 'ak1');
  assert.strictEqual(cfg.secret, 'sk1');
  assert.strictEqual(cfg.passphrase, 'pp1');
  assert.strictEqual(cfg.isDemo, true);
});

test('writeConfig + loadConfig round-trips live credentials', () => {
  writeConfig({ apiKey: 'ak2', secret: 'sk2', passphrase: 'pp2', isDemo: false });
  const cfg = loadConfig();
  assert.strictEqual(cfg.apiKey, 'ak2');
  assert.strictEqual(cfg.secret, 'sk2');
  assert.strictEqual(cfg.passphrase, 'pp2');
  assert.strictEqual(cfg.isDemo, false);
});

test('config file has restricted permissions', () => {
  writeConfig({ apiKey: 'ak3', secret: 'sk3', passphrase: 'pp3', isDemo: true });
  const stat = fs.statSync(configPath);
  const mode = (stat.mode & 0o777).toString(8);
  assert.strictEqual(mode, '600');
});

test('hasKeys equivalent returns true when all keys present', () => {
  writeConfig({ apiKey: 'a', secret: 's', passphrase: 'p', isDemo: true });
  const cfg = loadConfig();
  assert.strictEqual(Boolean(cfg.apiKey && cfg.secret && cfg.passphrase), true);
});

test('hasKeys equivalent returns false when empty', () => {
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  const cfg = loadConfig();
  assert.strictEqual(Boolean(cfg.apiKey && cfg.secret && cfg.passphrase), false);
});

// Cleanup
try { fs.unlinkSync(configPath); } catch (_) {}
try { fs.rmdirSync(tmpDir); } catch (_) {}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
