import React from 'react';
import { fmt, num, monthSummary, owingCustomers, upcomingEvents, orderDue, today } from '../lib/model.js';
import { eventsHtml } from '../lib/prints.js';

export default function Dashboard({ store, go }) {
  const m = today().slice(0, 7);
  const sum = monthSummary(store, m);
  const owing = owingCustomers(store);
  const upcoming = upcomingEvents(store, today());
  return (
    <div className="panel">
      <h2 className="ptitle">Dashboard — {m}</h2>
      <div className="cards">
        <div className="pcard"><div className="clabel">Upcoming events</div><div className="cval">{upcoming.length}</div></div>
        <div className="pcard"><div className="clabel">Booked value (month events)</div><div className="cval">{fmt(sum.booked, store.settings.currency)}</div><div className="muted">{sum.guests} guests · {sum.orderCount} events</div></div>
        <div className="pcard"><div className="clabel">Collected this month</div><div className="cval">{fmt(sum.collected, store.settings.currency)}</div></div>
        <div className="pcard"><div className="clabel">Expenses this month</div><div className="cval">{fmt(sum.expenses, store.settings.currency)}</div></div>
        <div className="pcard" style={{ borderColor: owing.length ? '#f59e0b' : undefined }}><div className="clabel">Customers owing</div><div className="cval">{owing.length}</div><div className="muted">{fmt(owing.reduce((t, d) => t + d.owes, 0), store.settings.currency)}</div></div>
      </div>

      <h3 className="ptitle" style={{ fontSize: 15, marginTop: 18 }}>Upcoming events</h3>
      <table className="grid">
        <thead><tr><th>#</th><th>Customer</th><th>Date</th><th>Venue</th><th className="r">Guests</th><th className="r">Balance</th><th>Status</th></tr></thead>
        <tbody>
          {upcoming.slice(0, 10).map(o => {
            const c = (store.customers || []).find(x => x.id === o.customer_id) || {};
            const due = orderDue(store, o);
            return <tr key={o.id}><td>{o.no}</td><td>{c.name}</td><td>{o.event_date}</td><td>{o.venue || '—'}</td><td className="r">{o.guests}</td>
              <td className="r" style={{ color: due ? '#dc2626' : '#16a34a' }}>{due ? fmt(due, store.settings.currency) : '✓'}</td><td>{o.status}</td></tr>;
          })}
          {!upcoming.length && <tr><td colSpan="7" className="muted">Koi event booked nahi.</td></tr>}
        </tbody>
      </table>
      <div className="frow" style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => go('orders')}>New booking</button>
        <button className="btn ghost" onClick={() => go('payments')}>Receive payment</button>
        <button className="btn ghost" onClick={() => window.api.export.pdf({ html: eventsHtml(store), suggestedName: `events-${m}.pdf` })}>Print event calendar</button>
      </div>
    </div>
  );
}
