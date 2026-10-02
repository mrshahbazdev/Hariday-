// Hariday document model — offline catering/tandoor order book:
// customers → event orders (date, guests, menu/per-head rate, advance)
// → receipts (advance + balance). Cost sheet + prep list prints.
// Money rows never deleted; numbers gap-free; voids keep rows.

export const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 10);
export const fmt = (n, cur = 'Rs') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export const today = () => new Date().toISOString().slice(0, 10);
export const ym = iso => (iso || '').slice(0, 7);
export const addDays = (iso, k) => { const d = new Date(iso || today()); d.setDate(d.getDate() + k); return d.toISOString().slice(0, 10); };
export const addMonths = (m, k) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

export const ORDER_STATUS = ['booked', 'confirmed', 'done', 'cancelled'];

export const ROLES = {
  owner: 'Owner — full access',
  manager: 'Manager — orders & receipts, no user management',
  counter: 'Counter — orders only',
  clerk: 'Clerk — customer records only'
};

export function emptyStore() {
  return {
    version: 1,
    customers: [],   // {id, code, name, phone, whatsapp, address, note}
    menus: [],       // {id, name, rate_per_head, items:[{name,per_head}]}
    orders: [],      // {id, no, customer_id, event_date, venue, guests, menu_note, rate_per_head, extras:[{name,amount}], total, status, notes, created}
    receipts: [],    // {id, no, customer_id, order_id|null, date, amount, mode, ref, status, void_reason, voided_on, by}
    expenses: [],    // {id, date, head, amount, order_id|null, note, by}
    auditLog: [],
    settings: defaultSettings(),
    counters: { order: 0, receipt: 0, customer: 0 },
    updatedAt: Date.now()
  };
}

export function defaultSettings() {
  return {
    companyName: '', companyAddress: '', companyPhone: '',
    currency: 'Rs',
    receiptFooter: 'Booking confirm karwane ke liye advance zaroori hai — receipt sambhal kar rakhein.',
    letterheadOffset: 0,
    users: [],
    backupFolder: '', lastBackupAt: '',
    syncFolder: '', syncAuto: true, syncCode: '', hostOn: false,
    uiUrdu: false, printUrdu: true,
    firstRunDone: false, consent: null
  };
}

// ---------- lookups ----------
export const customer = (s, id) => (s.customers || []).find(c => c.id === id) || null;
export const order = (s, id) => (s.orders || []).find(o => o.id === id) || null;
export const menu = (s, id) => (s.menus || []).find(m => m.id === id) || null;
export const openOrders = s => (s.orders || []).filter(o => o.status === 'booked' || o.status === 'confirmed');
export const ordersFor = (s, customerId) => (s.orders || []).filter(o => o.customer_id === customerId && o.status !== 'cancelled');
export const orderExtrasTotal = o => (o.extras || []).reduce((t, e) => t + num(e.amount), 0);
export const orderTotal = o => num(o.rate_per_head) * num(o.guests) + orderExtrasTotal(o);

export function orderPaid(s, o) {
  return (s.receipts || []).filter(r => r.order_id === o.id && r.status !== 'void').reduce((t, r) => t + num(r.amount), 0);
}
export function orderDue(s, o) { return Math.max(0, orderTotal(o) - orderPaid(s, o)); }
export function orderCost(s, orderId) {
  return (s.expenses || []).filter(e => e.order_id === orderId).reduce((t, e) => t + num(e.amount), 0);
}
export function customerOwes(s, customerId) { return ordersFor(s, customerId).reduce((t, o) => t + orderDue(s, o), 0); }

export function newOrder(store, { customer_id, event_date, venue, guests, menu_note, rate_per_head, extras, notes }, advance, by) {
  store.counters.order = (store.counters.order || 0) + 1;
  const o = {
    id: uid('o'), no: store.counters.order, customer_id,
    event_date: event_date || addDays(today(), 7), created: today(),
    venue: venue || '', guests: num(guests), menu_note: menu_note || '',
    rate_per_head: num(rate_per_head), extras: (extras || []).filter(e => e.name && num(e.amount)).map(e => ({ name: e.name, amount: num(e.amount) })),
    status: 'booked', notes: notes || ''
  };
  o.total = orderTotal(o);
  store.orders.push(o);
  if (num(advance) > 0) receivePayment(store, { customer_id, order_id: o.id, amount: advance, mode: 'cash' }, by);
  return o;
}

export function receivePayment(store, { customer_id, order_id, amount, mode, ref, date }, by) {
  store.counters.receipt = (store.counters.receipt || 0) + 1;
  const r = {
    id: uid('r'), no: store.counters.receipt, customer_id, order_id: order_id || null,
    date: date || today(), amount: num(amount), mode: mode || 'cash', ref: ref || '',
    status: 'received', by: by || ''
  };
  store.receipts.push(r);
  return r;
}

export function voidReceipt(store, receiptId, reason) {
  const r = (store.receipts || []).find(x => x.id === receiptId);
  if (!r || r.status === 'void') return null;
  r.status = 'void'; r.void_reason = reason || ''; r.voided_on = today();
  return r;
}

// prep list: items needed per order — from menu items × guests
export function prepList(store, o) {
  const m = o.menu_id ? menu(store, o.menu_id) : null;
  return (m?.items || []).map(i => ({ name: i.name, qty: Math.ceil(num(i.per_head) * num(o.guests)) }));
}

// ---------- reports ----------
export function monthSummary(store, month) {
  const receipts = (store.receipts || []).filter(r => ym(r.date) === month && r.status !== 'void');
  const expenses = (store.expenses || []).filter(e => ym(e.date) === month);
  const orders = (store.orders || []).filter(o => ym(o.event_date) === month && o.status !== 'cancelled');
  return {
    booked: orders.reduce((t, o) => t + num(o.total || orderTotal(o)), 0),
    guests: orders.reduce((t, o) => t + num(o.guests), 0),
    collected: receipts.reduce((t, r) => t + num(r.amount), 0),
    expenses: expenses.reduce((t, e) => t + num(e.amount), 0),
    orderCount: orders.length
  };
}

export function upcomingEvents(store, fromDate) {
  return (store.orders || []).filter(o => o.event_date >= fromDate && o.status !== 'cancelled' && o.status !== 'done')
    .sort((a, b) => a.event_date.localeCompare(b.event_date));
}

export function owingCustomers(store) {
  return (store.customers || []).map(c => ({ customer: c, owes: customerOwes(store, c.id) }))
    .filter(x => x.owes > 0).sort((a, b) => b.owes - a.owes);
}

export function waLink(phone, text) {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  const intl = d.startsWith('92') ? d : d.startsWith('0') ? '92' + d.slice(1) : d;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

// ---------- sample data ----------
export function sampleStore() {
  const s = emptyStore();
  s.settings.companyName = 'Hariday Caterers & Tandoor';
  s.settings.companyAddress = 'Main Bazar, Gujranwala';
  s.settings.companyPhone = '055-5550400';
  s.menus = [
    { id: 'm1', name: 'Standard (korma + pulao + roti)', rate_per_head: 550, items: [{ name: 'Korma (kg)', per_head: 0.25 }, { name: 'Pulao (kg)', per_head: 0.3 }, { name: 'Roti', per_head: 1.5 }, { name: 'Salad/raita (kg)', per_head: 0.1 }] },
    { id: 'm2', name: 'Special (biryani + karahi + naan)', rate_per_head: 850, items: [{ name: 'Biryani (kg)', per_head: 0.35 }, { name: 'Chicken karahi (kg)', per_head: 0.25 }, { name: 'Naan', per_head: 1 }, { name: 'Cold drink (btl)', per_head: 0.5 }] },
    { id: 'm3', name: 'Budget (daal + roti)', rate_per_head: 300, items: [{ name: 'Daal (kg)', per_head: 0.2 }, { name: 'Roti', per_head: 2 }] }
  ];
  const cust = (id, code, name, phone) => ({ id, code, name, phone, whatsapp: phone, address: '', note: '' });
  s.customers = [
    cust('c1', 'H-001', 'Malik Riaz', '0300-1112233'),
    cust('c2', 'H-002', 'Ch. Imran', '0321-5556677'),
    cust('c3', 'H-003', 'Kaka Wedding Hall', '0333-8889900'),
    cust('c4', 'H-004', 'School Function', '0345-7778889')
  ];
  s.counters.customer = 4;
  let n = 0;
  const mkOrder = (custId, menu_id, guests, days, status, adv, venue) => {
    const m = menu(s, menu_id);
    const o = {
      id: uid('o'), no: ++n, customer_id: custId, menu_id,
      event_date: addDays(today(), days), created: addDays(today(), -7),
      venue: venue || '', guests, menu_note: m?.name || '',
      rate_per_head: m?.rate_per_head || 0, extras: [], status, notes: ''
    };
    o.total = orderTotal(o);
    s.orders.push(o);
    if (adv > 0) { s.counters.receipt++; s.receipts.push({ id: uid('r'), no: s.counters.receipt, customer_id: custId, order_id: o.id, date: o.created, amount: adv, mode: 'cash', ref: '', status: 'received', by: 'owner' }); }
    return o;
  };
  mkOrder('c1', 'm2', 200, 5, 'confirmed', 100000, 'Local ground');
  mkOrder('c2', 'm1', 350, 12, 'booked', 50000, 'Wedding hall');
  mkOrder('c3', 'm2', 500, 25, 'booked', 0, 'Kaka Wedding Hall');
  mkOrder('c4', 'm3', 400, -10, 'done', 120000, 'School ground');
  s.counters.order = n;
  s.expenses = [
    { id: uid('e'), date: addDays(today(), -10), head: 'Chicken purchase', amount: 45000, order_id: s.orders[3]?.id, note: '', by: 'owner' },
    { id: uid('e'), date: addDays(today(), -2), head: 'Gas cylinder', amount: 4200, order_id: null, note: '', by: 'owner' }
  ];
  s.settings.firstRunDone = false;
  return s;
}
