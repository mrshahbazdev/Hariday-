const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function csvText(rows) {
  return rows.map(r => r.map(q).join(',')).join('\n');
}

export function customersCsv(store) {
  const rows = [['code', 'name', 'phone', 'whatsapp', 'events', 'owes']];
  for (const c of store.customers || []) {
    const events = (store.events || []).filter(o => o.customer_id === c.id);
    const paid = id => (store.receipts || []).filter(r => r.order_id === id && r.status !== 'void').reduce((t, r) => t + (r.amount || 0), 0);
    const owes = events.reduce((t, o) => t + Math.max(0, (o.price || 0) - paid(o.id)), 0);
    rows.push([c.code || '', c.name, c.phone || '', c.whatsapp || '', events.length, owes]);
  }
  return csvText(rows);
}

export function parseCustomersCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const errors = [], rows = [];
  const start = /name/i.test(lines[0] || '') ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
    const [code, name, phone, whatsapp] = cells;
    if (!name) { errors.push(`Row ${i + 1}: name missing — skipped`); continue; }
    rows.push({ code, name, phone, whatsapp });
  }
  return { rows, errors };
}
