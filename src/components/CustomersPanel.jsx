import React, { useState } from 'react';
import { uid, fmt, customer, customerOwes, ordersFor, orderDue, waLink } from '../lib/model.js';
import { statementHtml } from '../lib/prints.js';
import { parseCustomersCsv } from '../lib/csv.js';

export default function CustomersPanel({ store, update }) {
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [q, setQ] = useState('');
  const cur = store.settings.currency;

  const save = () => update(s => {
    if (edit.id) Object.assign(s.customers.find(x => x.id === edit.id), edit);
    else {
      s.counters.customer = (s.counters.customer || 0) + 1;
      s.customers.push({ ...edit, id: uid('c'), code: `H-${String(s.counters.customer).padStart(3, '0')}`, note: '' });
    }
  }, 'save customer');

  const doImport = async () => {
    const f = await window.api.app.openFile({ filters: [{ name: 'CSV', extensions: ['csv', 'txt'] }] });
    if (!f?.text) return;
    setImportRows(parseCustomersCsv(f.text));
  };
  const applyImport = () => update(s => {
    for (const r of importRows.rows) {
      s.counters.customer = (s.counters.customer || 0) + 1;
      s.customers.push({ id: uid('c'), code: r.code || `H-${String(s.counters.customer).padStart(3, '0')}`, name: r.name, phone: r.phone, whatsapp: r.whatsapp, address: '', note: '' });
    }
  }, `import ${importRows.rows.length} customers`);

  const detail = open ? customer(store, open) : null;
  const remind = (c) => {
    const url = waLink(c.whatsapp || c.phone, `Assalam-o-alaikum ${c.name}, aap ka ${store.settings.companyName || ''} balance ${fmt(customerOwes(store, c.id), cur)} hai.`);
    if (url) window.open(url, '_blank');
  };

  const list = (store.customers || []).filter(c => !q || (c.name + ' ' + (c.code || '') + ' ' + (c.phone || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="panel">
      <h2 className="ptitle">Customers — کسٹمرز</h2>
      <div className="frow" style={{ marginBottom: 10 }}>
        <input className="in" style={{ flex: 1 }} placeholder="Search name / code / phone" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn small ghost" onClick={() => setEdit({ name: '', phone: '', whatsapp: '', address: '' })}>+ New customer</button>
        <button className="btn small ghost" onClick={doImport}>Import CSV</button>
      </div>
      <table className="grid">
        <thead><tr><th>Code</th><th>Customer</th><th>Phone</th><th className="r">Events</th><th className="r">Owes</th><th></th></tr></thead>
        <tbody>
          {list.map(c => {
            const owes = customerOwes(store, c.id);
            return (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td><a href="#" onClick={e => { e.preventDefault(); setOpen(c.id); }}>{c.name}</a></td>
                <td>{c.phone}</td><td className="r">{ordersFor(store, c.id).length}</td>
                <td className="r" style={{ color: owes > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{owes ? fmt(owes, cur) : '✓'}</td>
                <td>
                  <button className="btn small ghost" onClick={() => remind(c)}>WhatsApp</button>
                  <button className="btn small ghost" onClick={() => setEdit({ ...c })}>Edit</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {edit && (
        <div className="pcard" style={{ marginTop: 12 }}>
          <div className="frow">
            <input className="in" style={{ flex: 1 }} placeholder="Customer name" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
            <input className="in" placeholder="Phone" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
            <input className="in" placeholder="WhatsApp" value={edit.whatsapp || ''} onChange={e => setEdit({ ...edit, whatsapp: e.target.value })} />
            <input className="in" style={{ flex: 1 }} placeholder="Address" value={edit.address || ''} onChange={e => setEdit({ ...edit, address: e.target.value })} />
            <button className="btn small" onClick={() => { save(); setEdit(null); }}>Save</button>
            <button className="btn small ghost" onClick={() => setEdit(null)}>Cancel</button>
          </div>
        </div>
      )}

      {importRows && (
        <div className="pcard" style={{ marginTop: 12 }}>
          <b>{importRows.rows.length} customers</b> parse hue — apply karein?
          {importRows.errors.map((e, i) => <div key={i} style={{ color: '#b45309', fontSize: 12 }}>⚠ {e}</div>)}
          <div className="frow" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => { applyImport(); setImportRows(null); }}>Apply import</button>
            <button className="btn small ghost" onClick={() => setImportRows(null)}>Cancel</button>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Columns: code, name, phone, whatsapp</div>
        </div>
      )}

      {detail && (
        <div className="pcard" style={{ marginTop: 14 }}>
          <div className="frow" style={{ justifyContent: 'space-between' }}>
            <b>{detail.code} · {detail.name} — bookings & khata</b>
            <span>
              <button className="btn small ghost" onClick={() => window.api.export.pdf({ html: statementHtml(store, detail), suggestedName: `khata-${detail.name}.pdf` })}>Print statement</button>
              <button className="btn small ghost" onClick={() => setOpen(null)}>Close</button>
            </span>
          </div>
          <table className="grid" style={{ marginTop: 8 }}>
            <thead><tr><th>#</th><th>Event</th><th className="r">Guests</th><th>Status</th><th className="r">Balance</th></tr></thead>
            <tbody>
              {ordersFor(store, detail.id).map(o => (
                <tr key={o.id}><td>{o.no}</td><td>{o.event_date} {o.venue || ''}</td><td className="r">{o.guests}</td><td>{o.status}</td><td className="r">{orderDue(store, o).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
