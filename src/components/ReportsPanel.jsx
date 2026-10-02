import React from 'react';
import { fmt, num, monthSummary, addMonths, owingCustomers, upcomingEvents, orderTotal, orderPaid, orderCost, today } from '../lib/model.js';
import { eventsHtml } from '../lib/prints.js';

export default function ReportsPanel({ store }) {
  const cur = store.settings.currency;
  const m0 = today().slice(0, 7);
  const months = [...Array(6)].map((_, i) => addMonths(m0, -i)).reverse();
  const owing = owingCustomers(store);
  const trend = months.map(m => ({ m, ...monthSummary(store, m) }));
  const byStatus = {};
  for (const o of store.orders || []) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  const margins = (store.orders || []).filter(o => o.status !== 'cancelled').map(o => ({
    o, total: num(o.total || orderTotal(o)), cost: orderCost(store, o.id)
  })).filter(x => x.cost > 0).sort((a, b) => (b.total - b.cost) - (a.total - a.cost)).slice(0, 10);
  const topCustomers = {};
  for (const o of store.orders || []) if (o.status !== 'cancelled') topCustomers[o.customer_id] = (topCustomers[o.customer_id] || 0) + num(o.total || orderTotal(o));
  const top = Object.entries(topCustomers).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return (
    <div className="panel">
      <h2 className="ptitle">Reports</h2>
      <div className="frow" style={{ marginBottom: 14 }}>
        <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: eventsHtml(store), suggestedName: `events-${m0}.pdf` })}>Print event calendar</button>
      </div>

      <h3 className="ptitle" style={{ fontSize: 14 }}>6-month trend</h3>
      <table className="grid">
        <thead><tr><th>Month</th><th className="r">Events</th><th className="r">Guests</th><th className="r">Booked</th><th className="r">Collected</th><th className="r">Expenses</th><th className="r">Net</th></tr></thead>
        <tbody>
          {trend.map(t => (
            <tr key={t.m}>
              <td>{t.m}</td><td className="r">{t.orderCount}</td><td className="r">{t.guests}</td><td className="r">{t.booked.toLocaleString()}</td>
              <td className="r">{t.collected.toLocaleString()}</td><td className="r">{t.expenses.toLocaleString()}</td>
              <td className="r"><b>{(t.collected - t.expenses).toLocaleString()}</b></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Events by status</h3>
      <table className="grid">
        <tbody>
          {Object.entries(byStatus).map(([k, v]) => <tr key={k}><td>{k}</td><td className="r">{v}</td></tr>)}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Margin per event (with cost sheet)</h3>
      <table className="grid">
        <thead><tr><th>#</th><th>Event</th><th className="r">Total</th><th className="r">Cost</th><th className="r">Margin</th></tr></thead>
        <tbody>
          {margins.map(x => (
            <tr key={x.o.id}><td>{x.o.no}</td><td>{x.o.event_date}</td><td className="r">{x.total.toLocaleString()}</td><td className="r">{x.cost.toLocaleString()}</td>
              <td className="r" style={{ color: x.total - x.cost >= 0 ? '#16a34a' : '#dc2626' }}><b>{(x.total - x.cost).toLocaleString()}</b></td></tr>
          ))}
          {!margins.length && <tr><td colSpan="5" className="muted">No event expenses logged yet.</td></tr>}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Top customers by value</h3>
      <table className="grid">
        <thead><tr><th>Customer</th><th className="r">Booked value</th></tr></thead>
        <tbody>
          {top.map(([id, v]) => { const c = (store.customers || []).find(x => x.id === id); return <tr key={id}><td>{c?.name || id}</td><td className="r">{v.toLocaleString()}</td></tr>; })}
        </tbody>
      </table>

      <h3 className="ptitle" style={{ fontSize: 14 }}>Customers owing</h3>
      <table className="grid">
        <thead><tr><th>Customer</th><th>Phone</th><th className="r">Owes</th></tr></thead>
        <tbody>
          {owing.map(d => (
            <tr key={d.customer.id}><td>{d.customer.name}</td><td>{d.customer.phone}</td>
              <td className="r" style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(d.owes, cur)}</td></tr>
          ))}
          {!owing.length && <tr><td colSpan="3" className="muted">Sab clear.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
