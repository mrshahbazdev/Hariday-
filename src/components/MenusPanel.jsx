import React, { useState } from 'react';
import { uid, fmt, num } from '../lib/model.js';

export default function MenusPanel({ store, update }) {
  const [m, setM] = useState(null);
  const cur = store.settings.currency;

  const setItem = (i, k, v) => { const items = (m.items || []).slice(); items[i] = { ...items[i], [k]: v }; setM({ ...m, items }); };

  return (
    <div className="panel">
      <h2 className="ptitle">Menus & rates — مینو ریٹس</h2>
      <table className="grid" style={{ marginBottom: 10 }}>
        <thead><tr><th>Menu</th><th className="r">Rate/head</th><th className="r">Items</th><th className="r">Times booked</th><th></th></tr></thead>
        <tbody>
          {(store.menus || []).map(x => (
            <tr key={x.id}>
              <td>{x.name}</td><td className="r">{fmt(x.rate_per_head, cur)}</td>
              <td className="r">{(x.items || []).length}</td>
              <td className="r">{(store.orders || []).filter(o => o.menu_id === x.id).length}</td>
              <td>
                <button className="btn small ghost" onClick={() => setM({ ...x, items: (x.items || []).slice() })}>Edit</button>
                <button className="icon" onClick={() => { if (confirm('Remove menu?')) update(s => s.menus = s.menus.filter(z => z.id !== x.id), 'remove menu'); }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn small ghost" onClick={() => setM({ name: '', rate_per_head: '', items: [{ name: '', per_head: '' }] })}>+ New menu</button>

      {m && (
        <div className="pcard" style={{ marginTop: 10 }}>
          <div className="frow">
            <input className="in" style={{ flex: 2 }} placeholder="Menu name" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} />
            <label className="lbl">Rate/head <input className="in" style={{ width: 110 }} type="number" value={m.rate_per_head} onChange={e => setM({ ...m, rate_per_head: e.target.value })} /></label>
          </div>
          <table className="grid" style={{ marginTop: 8 }}>
            <thead><tr><th>Prep item</th><th className="r">Qty per head</th><th></th></tr></thead>
            <tbody>
              {(m.items || []).map((it, i) => (
                <tr key={i}>
                  <td><input className="in" value={it.name} onChange={e => setItem(i, 'name', e.target.value)} /></td>
                  <td><input className="in" style={{ width: 100 }} type="number" step="0.05" value={it.per_head} onChange={e => setItem(i, 'per_head', e.target.value)} /></td>
                  <td><button className="icon" onClick={() => setM({ ...m, items: m.items.filter((_, j) => j !== i) })}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="frow" style={{ marginTop: 8 }}>
            <button className="btn small ghost" onClick={() => setM({ ...m, items: [...(m.items || []), { name: '', per_head: '' }] })}>+ item</button>
            <button className="btn small" onClick={() => {
              if (!m.name) return;
              const row = { ...m, rate_per_head: num(m.rate_per_head), items: (m.items || []).filter(i => i.name).map(i => ({ name: i.name, per_head: num(i.per_head) })) };
              update(s => { if (m.id) Object.assign(s.menus.find(z => z.id === m.id), row); else s.menus.push({ ...row, id: uid('m') }); }, 'save menu');
              setM(null);
            }}>Save</button>
            <button className="btn small ghost" onClick={() => setM(null)}>✕</button>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Prep items × guests = prep list (e.g. Korma 0.25 kg/head × 200 guests = 50 kg)</div>
        </div>
      )}
    </div>
  );
}
