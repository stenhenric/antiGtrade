const _esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function renderBotsTable(list) {
  const tbody = document.querySelector('#bots-table tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--text-3);text-align:center;">No bots</td></tr>`;
    return;
  }
  tbody.innerHTML = list.slice(0,100).map(b => `
    <tr>
      <td>${_esc(b.id)}</td>
      <td>${_esc(b.type || 'grid')}</td>
      <td>${_esc(b.sym)}</td>
      <td>${_esc(b.sz || '--')}</td>
      <td><span class="pill ${b.st==='running'?'green':'gray'}">${_esc(b.st)}</span></td>
      <td>${_esc(b.pnl || '')}</td>
    </tr>
  `).join('');
}

function renderHistoryTable(list) {
  const tbody = document.querySelector('#hist-table tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--text-3);text-align:center;">No history</td></tr>`;
    return;
  }
  tbody.innerHTML = list.slice(0,100).map(o => `
    <tr>
      <td>${_esc(new Date(Number(o.time || Date.now())).toLocaleString())}</td>
      <td>${_esc(o.sym)}</td>
      <td><span class="pill ${o.side==='buy'?'green':'red'}">${_esc(o.side)}</span></td>
      <td>${_esc(o.type || 'limit')}</td>
      <td>${_esc(o.qty)}</td>
      <td>${_esc(o.px || '--')}</td>
      <td>${_esc(o.st)}</td>
    </tr>
  `).join('');
}
