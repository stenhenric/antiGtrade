function renderBotsTable(list) {
  const tbody = document.querySelector('#bots-table tbody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:var(--text-3);text-align:center;">No bots</td></tr>`;
    return;
  }
  tbody.innerHTML = list.slice(0,100).map(b => `
    <tr>
      <td>${b.id}</td>
      <td>${b.type || 'grid'}</td>
      <td>${b.sym}</td>
      <td>${b.sz || '--'}</td>
      <td><span class="pill ${b.st==='running'?'green':'gray'}">${b.st}</span></td>
      <td>${b.pnl || ''}</td>
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
      <td>${new Date(Number(o.time || Date.now())).toLocaleString()}</td>
      <td>${o.sym}</td>
      <td><span class="pill ${o.side==='buy'?'green':'red'}">${o.side}</span></td>
      <td>${o.type || 'limit'}</td>
      <td>${o.qty}</td>
      <td>${o.px || '--'}</td>
      <td>${o.st}</td>
    </tr>
  `).join('');
}
