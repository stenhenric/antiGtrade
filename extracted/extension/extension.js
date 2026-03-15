/**
 * AntiGTrade — Antigravity / VS Code Extension
 * Opens a live OKX trading dashboard as a webview panel.
 * No proxy server needed — WebSocket connects directly to OKX.
 */

const vscode = require('vscode');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const os     = require('os');
const { execFile } = require('child_process');
const { validateMessage } = require('./validation');
const OUTPUT = vscode.window.createOutputChannel('AntiGTrade');

const npxCmd = os.platform() === 'win32' ? 'npx.cmd' : 'npx';

let panel = null;

// OKX API Service helper
class OkxService {
  constructor(context) {
    this.context = context;
    const envDir = process.env.OKX_CONFIG_DIR;
    this.configDir = envDir || path.join(os.homedir(), '.okx');
    this.configPath = path.join(this.configDir, 'config.toml');
  }

  async hasKeys() {
    const cfg = await this.loadConfig();
    return Boolean(cfg.apiKey && cfg.secret && cfg.passphrase);
  }

  async saveKeys(keys, isDemo = true) {
    const clean = v => (typeof v === 'string' ? v.trim() : '');
    const apiKey = clean(keys.apiKey);
    const secret = clean(keys.secret);
    const passphrase = clean(keys.passphrase);

    if (!apiKey || !secret || !passphrase) {
      throw new Error('API key, secret, and passphrase are required.');
    }

    await this.writeConfig({ apiKey, secret, passphrase, isDemo });
  }

  async writeConfig({ apiKey, secret, passphrase, isDemo }) {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    const profile = isDemo ? 'demo' : 'live';
    const tomlContent = `default_profile = "${profile}"

[profiles.${profile}]
demo = ${isDemo}
api_key = "${apiKey}"
secret_key = "${secret}"
passphrase = "${passphrase}"
`;

    fs.writeFileSync(this.configPath, tomlContent, { encoding: 'utf8' });
    try { fs.chmodSync(this.configPath, 0o600); } catch (_) { /* best effort */ }
  }

  async buildEnv() {
    const cfg = await this.loadConfig();
    return cfg;
  }

  async executeCli(args, extraEnv = {}) {
    try {
      const envKeys = await this.buildEnv();
      if (!envKeys.apiKey || !envKeys.secret || !envKeys.passphrase) {
        throw new Error('Missing OKX credentials');
      }

      const env = {
        ...process.env,
        OKX_API_KEY: envKeys.apiKey,
        OKX_SECRET_KEY: envKeys.secret,
        OKX_PASSPHRASE: envKeys.passphrase,
        OKX_SIMULATED: envKeys.isDemo ? '1' : '0',
        ...extraEnv
      };

      const argv = ['-y', '@okx_ai/okx-trade-cli', ...args, '--json'];
      OUTPUT.appendLine(`[CLI] npx ${argv.join(' ')}`);
      const { stdout } = await execFileAsync(npxCmd, argv, { timeout: 15000, env });
      return JSON.parse(stdout);
    } catch (e) {
      OUTPUT.appendLine(`[CLI ERROR] ${e.message}`);
      console.error('CLI Error', e);
      return { error: e.message };
    }
  }

  async getBalance() { return this.executeCli(['account', 'balance']); }
  async getPositions() { return this.executeCli(['account', 'positions']); }
  async getOrders() { return this.executeCli(['trade', 'orders-pending']); }
  async getBots() { return this.executeCli(['bot', 'grid', 'orders', '--algoOrdType', 'grid']); }

  async loadConfig() {
    if (!fs.existsSync(this.configPath)) return { apiKey: '', secret: '', passphrase: '', isDemo: true };
    const txt = fs.readFileSync(this.configPath, 'utf8');
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
}

function execFileAsync(cmd, argv, opts) {
  return new Promise((resolve, reject) => {
    execFile(cmd, argv, opts, (err, stdout, stderr) => {
      if (err) {
        const info = stderr || err.message;
        return reject(new Error(info));
      }
      resolve({ stdout, stderr });
    });
  });
}

function getDashboardHtml(context, webview) {
  const dashPath = path.join(context.extensionPath, 'dashboard.html');

  const escHtml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let html;
  try {
    html = fs.readFileSync(dashPath, 'utf8');
  } catch (e) {
    return `<!DOCTYPE html><html><body style="background:#000;color:#00d26a;font-family:monospace;padding:32px;">
      <h2>AntiGTrade</h2><p style="color:#888;margin-top:8px;">Could not load dashboard: ${escHtml(e.message)}</p>
    </body></html>`;
  }

  const nonce = crypto.randomBytes(16).toString('base64');
  html = html.replace(/<script(?=[\s>])/gi, `<script nonce="${nonce}"`);
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '');

  const chartUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'vendor', 'lightweight-charts.standalone.production.js')));
  const renderersUri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'renderers.js')));

  const csp = [
    `default-src 'none'`,
    `script-src 'nonce-${nonce}' ${webview.cspSource}`,
    `style-src 'unsafe-inline' ${webview.cspSource}`,
    `connect-src wss://ws.okx.com:8443 https://www.okx.com`,
    `img-src data: ${webview.cspSource}`,
    `frame-ancestors 'none'`,
    `base-uri 'none'`,
  ].join('; ');

  html = html.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  html = html.replace('vscode-resource:lightweight-charts.standalone.production.js', chartUri.toString());
  html = html.replace('"renderers.js"', `"${renderersUri.toString()}"`);
  return html;
}

function openPanel(context) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Two);
    return;
  }

  const okx = new OkxService(context);

  panel = vscode.window.createWebviewPanel(
    'antigtrade',
    'AntiGTrade',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)]
    }
  );

  panel.webview.html = getDashboardHtml(context, panel.webview);

  panel.webview.onDidReceiveMessage(
    async message => {
      try {
        const ok = validateMessage(message);
        if (!ok.valid) {
          panel.webview.postMessage({ type: 'toast', msg: ok.reason, style: 'error' });
          return;
        }
        switch (message.command) {
          case 'check_auth':
            const hasKeys = await okx.hasKeys();
            const { isDemo } = await okx.buildEnv();
            panel.webview.postMessage({ type: 'auth_status', authenticated: hasKeys, isDemo });
            break;
            
          case 'save_keys':
            await okx.saveKeys(message.keys, message.isDemo);
            panel.webview.postMessage({ type: 'toast', msg: 'OKX credentials stored securely', style: 'success' });
            panel.webview.postMessage({ type: 'auth_status', authenticated: true, isDemo: message.isDemo });
            break;
            
          case 'fetch_backend_data':
            if (!(await okx.hasKeys())) return;
            const [balRes, posRes, ordRes, botRes] = await Promise.all([
              okx.getBalance(), okx.getPositions(), okx.getOrders(), okx.getBots()
            ]);
            
            panel.webview.postMessage({ 
              type: 'backend_data', 
              balance: (balRes && balRes.length) ? balRes[0] : null,
              positions: Array.isArray(posRes) ? posRes : [],
              orders: Array.isArray(ordRes) ? ordRes : [],
              bots: Array.isArray(botRes) ? botRes : []
            });
            break;

          case 'place_order':
            if (!(await okx.hasKeys())) return;
            try {
              const mktType = message.instId.endsWith('-SWAP') ? 'swap' : 'spot';
              const args = [mktType, 'place', '--instId', message.instId, '--side', message.side, '--ordType', message.type, '--sz', String(message.sz)];
              if (message.px) args.push('--px', String(message.px));
              if (mktType === 'swap') args.push('--tdMode', 'cross');
              const res = await okx.executeCli(args);
              
              if (res && res.code === '0') {
                panel.webview.postMessage({ type: 'order_result', success: true, msg: `${message.side.toUpperCase()} ${message.sz} ${message.instId}` });
              } else {
                panel.webview.postMessage({ type: 'order_result', success: false, msg: (res && res.msg) || (res && res.error) || 'Unknown error' });
              }
            } catch (e) {
              panel.webview.postMessage({ type: 'order_result', success: false, msg: e.message });
            }
            break;

          case 'stop_bot':
            if (!(await okx.hasKeys())) return;
            try {
              const args = ['bot', 'grid', 'stop', '--algoId', message.algoId, '--algoOrdType', message.algoOrdType, '--instId', message.instId];
              const res = await okx.executeCli(args);
              if (res && res.code === '0') {
                panel.webview.postMessage({ type: 'bot_result', success: true, msg: `Stopped bot ${message.algoId}` });
              } else {
                panel.webview.postMessage({ type: 'bot_result', success: false, msg: (res && res.msg) || (res && res.error) || 'Unknown error' });
              }
            } catch (e) {
              panel.webview.postMessage({ type: 'bot_result', success: false, msg: e.message });
            }
            break;

          case 'close_position':
            if (!(await okx.hasKeys())) return;
            try {
              const args = ['swap', 'close', '--instId', message.instId, '--mgnMode', message.mgnMode || 'cross'];
              const res = await okx.executeCli(args);
              if (res && res.code === '0') {
                panel.webview.postMessage({ type: 'action_result', success: true, msg: 'Position closed' });
              } else {
                panel.webview.postMessage({ type: 'action_result', success: false, msg: (res && res.msg) || (res && res.error) || 'Unknown error' });
              }
            } catch (e) {
              panel.webview.postMessage({ type: 'action_result', success: false, msg: e.message });
            }
            break;

          case 'set_leverage':
            if (!(await okx.hasKeys())) return;
            try {
              const args = ['swap', 'leverage', '--instId', message.instId, '--mgnMode', message.mgnMode || 'cross', '--lever', String(message.lever)];
              const res = await okx.executeCli(args);
              if (res && res.code === '0') {
                panel.webview.postMessage({ type: 'action_result', success: true, msg: `Leverage set to ${message.lever}x` });
              } else {
                panel.webview.postMessage({ type: 'action_result', success: false, msg: (res && res.msg) || (res && res.error) || 'Unknown error' });
              }
            } catch (e) {
              panel.webview.postMessage({ type: 'action_result', success: false, msg: e.message });
            }
            break;
        }
      } catch(e) {
        OUTPUT.appendLine(`[WEBVIEW ERROR] ${e.message}`);
        console.error("Webview Message Error", e);
        panel.webview.postMessage({ type: 'toast', msg: `Error: ${e.message}`, style: 'error' });
      }
    },
    undefined,
    context.subscriptions
  );

  panel.onDidDispose(() => { panel = null; }, null, context.subscriptions);
}

function activate(context) {
  openPanel(context);
  const cmd = vscode.commands.registerCommand('antigtrade.open', () => openPanel(context));
  context.subscriptions.push(cmd);
}

function deactivate() {}

module.exports = { activate, deactivate, validateMessage, OkxService };
