import React, { useState } from 'react';
import { fmt, num, customer, menu, orderTotal, orderPaid, orderDue, newOrder, ORDER_STATUS, today, addDays } from '../lib/model.js';
import { bookingSlipHtml, costSheetHtml, prepListHtml, eventsHtml } from '../lib/prints.js';

export default function OrdersPanel({ store, update, user }) {
  const [form, setForm] = useState(null);
  const [tab, setTab] = useState('open');
  const [open, setOpen] = useState(null);
  const cur = store.settings.currency;
  const canOrder = !user || ['owner', 'manager', 'counter'].includes(user.role);

  const list = (store.orders || []).filter(o => tab === 'open' ? (o.status === 'booked' || o.status === 'confirmed') : o.status === tab)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const pickMenu = menuId => {
    const m = menu(store, menuId);
    if (!m) return;
    setForm({ ...form, menu_id: menuId, menu_note: m.name, rate_per_head: m.rate_per_head });
  };

  const book = () => {
    if (!form.customer_id || !num(form.guests) || !num(form.rate_per_head)) return;
    update(s => newOrder(s, form, num(form.advance), user?.name || 'app'), `booking for ${customer(store, form.customer_id)?.name}`);
    setForm(null);
  };

  const detail = open ? (store.orders || []).find(o => o.id === open) : null;

  return (
    <div className="panel">
      <div className="frow" style={{ alignItems: 'center' }}>
        <h2 className="ptitle" style={{ margin: 0, flex: 1 }}>Event orders — bookings</h2>
        <select className="in" value={tab} onChange={e => setTab(e.target.value)}>
          <option value="open">Upcoming</option>
          {ORDER_STATUS.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        {canOrder && <button className="btn" onClick={() => setForm({ customer_id: store.customers[0]?.id || '', event_date: addDays(today(), 7), venue: '', guests: '', menu_id: '', menu_note: '', rate_per_head: '', extras: [], advance: '', notes: '' })}>+ New booking</button>}
        <button className="btn ghost" onClick={() => window.api.export.pdf({ html: eventsHtml(store), suggestedName: `events-${today().slice(0, 7)}.pdf` })}>Print calendar</button>
      </div>

      {form && (
        <div className="pcard" style={{ marginTop: 10, marginBottom: 10 }}>
          <div className="frow">
            <select className="in" style={{ flex: 1 }} value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
              {(store.customers || []).map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </select>
            <select className="in" value={form.menu_id} onChange={e => pickMenu(e.target.value)}>
              <option value="">— menu —</option>
              {(store.menus || []).map(m => <option key={m.id} value={m.id}>{m.name} ({num(m.rate_per_head).toLocaleString()}/head)</option>)}
            </select>
            <label className="lbl">Event date <input className="in" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} /></label>
          </div>
          <div className="frow" style={{ marginTop: 8 }}>
            <input className="in" style={{ flex: 1 }} placeholder="Venue" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
            <label className="lbl">Guests <input className="in" style={{ width: 90 }} type="number" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} /></label>
            <label className="lbl">Rate/head <input className="in" style={{ width: 100 }} type="number" value={form.rate_per_head} onChange={e => setForm({ ...form, rate_per_head: e.target.value })} /></label>
            <label className="lbl">Advance <input className="in" style={{ width: 110 }} type="number" value={form.advance} onChange={e => setForm({ ...form, advance: e.target.value })} /></label>
            <input className="in" style={{ flex: 1 }} placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="frow" style={{ marginTop: 8 }}>
            <span className="muted">Estimated total: {fmt(num(form.rate_per_head) * num(form.guests), cur)}</span>
            <button className="btn small" onClick={book}>Book event</button>
            <button className="btn small ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="grid">
        <thead><tr><th>#</th><th>Customer</th><th>Date</th><th>Venue</th><th className="r">Guests</th><th className="r">Total</th><th className="r">Balance</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {list.map(o => {
            const c = customer(store, o.customer_id) || {};
            const due = orderDue(store, o);
            return (
              <tr key={o.id}>
                <td>{o.no}</td>
                <td><a href="#" onClick={e => { e.preventDefault(); setOpen(o.id); }}>{c.name}</a></td>
                <td style={o.event_date <= today() && o.status !== 'done' ? { color: '#dc2626', fontWeight: 700 } : {}}>{o.event_date}</td>
                <td>{o.venue || '—'}</td><td className="r">{o.guests}</td>
                <td className="r">{fmt(o.total || orderTotal(o), cur)}</td>
                <td className="r" style={{ color: due ? '#dc2626' : '#16a34a' }}>{due ? fmt(due, cur) : '✓'}</td>
                <td><span className={'tag ' + (o.status === 'done' || o.status === 'confirmed' ? 'ok' : 'warn')}>{o.status}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: bookingSlipHtml(store, o), suggestedName: `booking-${o.no}.pdf` })}>Slip</button>
                  {canOrder && o.status !== 'done' && o.status !== 'cancelled' && (
                    <select className="in" style={{ width: 110, padding: '2px 4px' }} value="" onChange={e => e.target.value && update(s => { const x = s.orders.find(z => z.id === o.id); x.status = e.target.value; }, `booking #${o.no} → ${e.target.value}`)}>
                      <option value="">status…</option>
                      {ORDER_STATUS.filter(x => x !== o.status).map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
          {!list.length && <tr><td colSpan="9" className="muted">No bookings.</td></tr>}
        </tbody>
      </table>

      {detail && (
        <div className="pcard" style={{ marginTop: 14 }}>
          <div className="frow" style={{ justifyContent: 'space-between' }}>
            <b>Booking #{detail.no} — {customer(store, detail.customer_id)?.name} · {detail.event_date}</b>
            <span>
              <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: costSheetHtml(store, detail), suggestedName: `cost-${detail.no}.pdf` })}>Cost sheet</button>
              <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: prepListHtml(store, detail), suggestedName: `prep-${detail.no}.pdf` })}>Prep list</button>
              <button className="btn small ghost" onClick={() => setOpen(null)}>Close</button>
            </span>
          </div>
          <table className="grid" style={{ marginTop: 8 }}>
            <tbody>
              <tr><td>Guests</td><td>{detail.guests}</td><td>Rate/head</td><td>{num(detail.rate_per_head).toLocaleString()}</td></tr>
              <tr><td>Menu</td><td colSpan="3">{detail.menu_note || 'custom'}</td></tr>
              <tr><td>Total</td><td>{fmt(orderTotal(detail), cur)}</td><td>Paid / Balance</td><td>{num(orderPaid(store, detail)).toLocaleString()} / <b>{fmt(orderDue(store, detail), cur)}</b></td></tr>
              {detail.notes && <tr><td>Notes</td><td colSpan="3">{detail.notes}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
