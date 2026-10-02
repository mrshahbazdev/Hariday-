// Print HTML: booking slip (A5), receipt (A5), cost sheet (A4),
// prep list (A4), event calendar (A4), statement (A4).
import { fmt, num, customer, orderTotal, orderPaid, orderDue, orderCost, prepList, ordersFor, upcomingEvents, today } from './model.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const baseCss = extra => `
  body{font:10pt 'Segoe UI',sans-serif;color:#111}
  .co-name{font-size:13pt;font-weight:700;text-align:center}
  .co-sub{text-align:center;font-size:8.5pt;color:#444;margin-bottom:5mm}
  table{width:100%;border-collapse:collapse} td{padding:1.8mm;border-bottom:1px solid #e2e8f0}
  .r{text-align:right}.big{font-size:12pt;font-weight:700}
  .sign{display:flex;justify-content:space-between;margin:14mm 2mm 0;font-size:8pt;color:#444}
  .sign span{border-top:1px solid #555;padding-top:1mm;min-width:26mm;text-align:center}
  .foot{margin-top:8mm;text-align:center;font-size:8pt;color:#666}
  ${extra || ''}`;
const head = (store, label) => {
  const s = store.settings;
  return `<div class="co-name">${esc(s.companyName || 'Caterer')}</div>
    <div class="co-sub" style="padding-top:${num(s.letterheadOffset)}mm">${esc(s.companyAddress || '')} ${s.companyPhone ? ' · ' + esc(s.companyPhone) : ''}</div>
    <div style="text-align:center;font-weight:600;margin-bottom:4mm">${esc(label)}</div>`;
};
const foot = store => `<div class="foot">${esc(store.settings.receiptFooter || '')}</div>`;
const doc = (title, css, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${baseCss(css)}</style></head><body>${body}</body></html>`;

export function bookingSlipHtml(store, o) {
  const c = customer(store, o.customer_id) || {};
  const paid = orderPaid(store, o), due = orderDue(store, o);
  return doc(`Booking #${o.no}`, '.nb td{border:none}', `${head(store, 'Event Booking' + (o.status === 'confirmed' ? ' — CONFIRMED' : ''))}
    <table>
      <tr><td><b>Booking #${o.no}</b></td><td class="r">Booked: ${esc(o.created)}</td></tr>
      <tr><td colspan="2">Customer: <b>${esc(c.name)}</b> ${c.code ? '(' + esc(c.code) + ')' : ''} · ${esc(c.phone || '')}</td></tr>
      <tr><td>Event date: <b>${esc(o.event_date)}</b></td><td class="r">Venue: ${esc(o.venue || '—')}</td></tr>
      <tr><td>Guests: <b>${num(o.guests)}</b> · Menu: ${esc(o.menu_note || 'custom')}</td><td class="r">@ ${num(o.rate_per_head).toLocaleString()}/head</td></tr>
      ${(o.extras || []).map(e => `<tr><td>Extra: ${esc(e.name)}</td><td class="r">${num(e.amount).toLocaleString()}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td class="r big">${fmt(orderTotal(o), store.settings.currency)}</td></tr>
      <tr><td>Advance paid</td><td class="r">${num(paid).toLocaleString()}</td></tr>
      <tr><td><b>Balance</b></td><td class="r"><b>${fmt(due, store.settings.currency)}</b></td></tr>
    </table>
    ${o.notes ? `<p style="font-size:8.5pt">Notes: ${esc(o.notes)}</p>` : ''}
    <div class="sign"><span>Customer signature</span><span>For ${esc(store.settings.companyName || '')}</span></div>
    ${foot(store)}`);
}

export function receiptHtml(store, r) {
  const c = customer(store, r.customer_id) || {};
  const o = r.order_id ? (store.orders || []).find(x => x.id === r.order_id) : null;
  return doc(`Receipt #${r.no}`, '.nb td{border:none}', `${head(store, 'Payment Receipt')}
    <table>
      <tr><td><b>Receipt #${r.no}</b>${r.status === 'void' ? ' — VOID' : ''}</td><td class="r">Date: ${esc(r.date)}</td></tr>
      <tr><td colspan="2">Received from: <b>${esc(c.name)}</b> ${c.code ? '(' + esc(c.code) + ')' : ''}</td></tr>
      <tr><td>${o ? 'Booking #' + o.no + ' — ' + esc(o.event_date) : 'On account'}</td><td class="r">Mode: ${esc(r.mode)}${r.ref ? ' · ' + esc(r.ref) : ''}</td></tr>
      <tr><td><b>Amount</b></td><td class="r big">${fmt(r.amount, store.settings.currency)}</td></tr>
    </table>
    <div class="sign"><span>Received by: ${esc(r.by || '')}</span><span>Signature</span></div>
    ${foot(store)}`);
}

export function costSheetHtml(store, o) {
  const c = customer(store, o.customer_id) || {};
  const cost = orderCost(store, o.id);
  const total = orderTotal(o);
  const exps = (store.expenses || []).filter(e => e.order_id === o.id);
  return doc(`Cost sheet #${o.no}`, '', `${head(store, 'Cost Sheet — Booking #' + o.no)}
    <table><tr><td><b>${esc(c.name)}</b> · ${esc(o.event_date)} · ${num(o.guests)} guests</td><td class="r">${esc(o.venue || '')}</td></tr></table>
    <table style="margin-top:3mm"><tr><th style="text-align:left">Expense</th><th style="text-align:left">Date</th><th class="r">Amount</th></tr>
    ${exps.map(e => `<tr><td>${esc(e.head)}</td><td>${e.date}</td><td class="r">${num(e.amount).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">No expenses logged.</td></tr>'}
    <tr><td colspan="2"><b>Total cost</b></td><td class="r"><b>${num(cost).toLocaleString()}</b></td></tr>
    <tr><td colspan="2">Booking value</td><td class="r">${num(total).toLocaleString()}</td></tr>
    <tr><td colspan="2"><b>Margin</b></td><td class="r big"><b>${fmt(total - cost, store.settings.currency)}</b></td></tr>
    </table>${foot(store)}`);
}

export function prepListHtml(store, o) {
  const c = customer(store, o.customer_id) || {};
  const list = prepList(store, o);
  return doc(`Prep list #${o.no}`, '', `${head(store, 'Prep List — Booking #' + o.no)}
    <table><tr><td><b>${esc(c.name)}</b> · ${esc(o.event_date)}</td><td class="r">${num(o.guests)} guests · ${esc(o.menu_note || '')}</td></tr></table>
    <table style="margin-top:3mm"><tr><th style="text-align:left">Item</th><th class="r">Qty needed</th><th style="text-align:center">Done</th></tr>
    ${list.map(i => `<tr><td>${esc(i.name)}</td><td class="r">${i.qty}</td><td style="text-align:center">☐</td></tr>`).join('') || '<tr><td colspan="3">No menu items defined.</td></tr>'}
    </table>${foot(store)}`);
}

export function eventsHtml(store) {
  const list = upcomingEvents(store, today());
  return doc('Upcoming events', '', `${head(store, 'Event Calendar')}
    <table><tr><th>#</th><th style="text-align:left">Customer</th><th style="text-align:left">Date</th><th style="text-align:left">Venue</th><th class="r">Guests</th><th class="r">Total</th><th class="r">Balance</th><th style="text-align:left">Status</th></tr>
    ${list.map(o => { const c = customer(store, o.customer_id) || {}; return `<tr><td>${o.no}</td><td>${esc(c.name)}</td><td>${o.event_date}</td><td>${esc(o.venue)}</td><td class="r">${num(o.guests)}</td><td class="r">${num(o.total || orderTotal(o)).toLocaleString()}</td><td class="r">${orderDue(store, o).toLocaleString()}</td><td>${o.status}</td></tr>`; }).join('') || '<tr><td colspan="8">No upcoming events.</td></tr>'}
    </table>${foot(store)}`);
}

export function statementHtml(store, c) {
  const orders = ordersFor(store, c.id);
  const receipts = (store.receipts || []).filter(r => r.customer_id === c.id);
  return doc(`Statement — ${c.name}`, '', `${head(store, 'Customer Khata')}
    <table><tr><td><b>${esc(c.name)}</b> ${c.code ? '(' + esc(c.code) + ')' : ''}</td><td class="r">${esc(c.phone || '')}</td></tr></table>
    <table style="margin-top:4mm"><tr><th>#</th><th style="text-align:left">Event</th><th class="r">Guests</th><th class="r">Total</th><th class="r">Paid</th><th class="r">Due</th><th style="text-align:left">Status</th></tr>
    ${orders.map(o => `<tr><td>${o.no}</td><td>${o.event_date} ${esc(o.venue || '')}</td><td class="r">${num(o.guests)}</td><td class="r">${num(o.total || orderTotal(o)).toLocaleString()}</td><td class="r">${orderPaid(store, o).toLocaleString()}</td><td class="r">${orderDue(store, o).toLocaleString()}</td><td>${o.status}</td></tr>`).join('')}</table>
    <table style="margin-top:4mm"><tr><th style="text-align:left">Date</th><th style="text-align:left">Receipt</th><th class="r">Amount</th><th style="text-align:left">Mode</th></tr>
    ${receipts.map(r => `<tr><td>${r.date}</td><td>#${r.no}${r.status === 'void' ? ' (void)' : ''}</td><td class="r">${r.status === 'void' ? '—' : num(r.amount).toLocaleString()}</td><td>${esc(r.mode)}</td></tr>`).join('')}</table>
    ${foot(store)}`);
}
