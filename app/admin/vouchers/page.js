"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../lib/firebase.js";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

export default function VouchersAdminPage() {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState(1000);
  const [bulk, setBulk] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [filterAmount, setFilterAmount] = useState(0);
  const [onlyUnused, setOnlyUnused] = useState(true);

  const baseQuery = useMemo(() => {
    const col = collection(db, "vouchers");
    const constraints = [];
    if (filterAmount && Number(filterAmount) > 0) constraints.push(where("amount", "==", Number(filterAmount)));
    if (onlyUnused) constraints.push(where("used", "==", false));
    constraints.push(orderBy("code", "asc"));
    constraints.push(limit(50));
    return query(col, ...constraints);
  }, [filterAmount, onlyUnused]);

  async function refreshList() {
    try {
      const snap = await getDocs(baseQuery);
      setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    refreshList();
  }, [baseQuery]);

  async function handleAddSingle(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!code.trim() || !amount) {
      setError("Code and amount are required");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "vouchers"), {
        code: code.trim(),
        amount: Number(amount),
        used: false,
        createdAt: serverTimestamp(),
      });
      setMessage("Voucher added");
      setCode("");
      await refreshList();
    } catch (e) {
      setError(e?.message || "Failed to add voucher");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBulk(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    const rows = bulk
      .split("\n")
      .map(r => r.trim())
      .filter(Boolean);
    if (rows.length === 0 || !amount) {
      setError("Provide codes and amount");
      return;
    }
    setLoading(true);
    let added = 0;
    try {
      for (const c of rows) {
        await addDoc(collection(db, "vouchers"), {
          code: c,
          amount: Number(amount),
          used: false,
          createdAt: serverTimestamp(),
        });
        added += 1;
      }
      setMessage(`Added ${added} vouchers`);
      setBulk("");
      await refreshList();
    } catch (e) {
      setError(e?.message || "Bulk add failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>Vouchers Admin</h1>

      {message && (
        <div style={{ background: "#e6ffed", border: "1px solid #b7eb8f", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", color: "#135200" }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: "#fff1f0", border: "1px solid #ffa39e", padding: "0.5rem 0.75rem", marginBottom: "0.75rem", color: "#a8071a" }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, marginBottom: "0.5rem" }}>Add Single</h2>
        <form onSubmit={handleAddSingle} style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 200px 120px" }}>
          <input placeholder="Code" value={code} onChange={e => setCode(e.target.value)} />
          <select value={amount} onChange={e => setAmount(Number(e.target.value))}>
            <option value={1000}>UGX 1,000</option>
            <option value={1500}>UGX 1,500</option>
            <option value={7000}>UGX 7,000</option>
          </select>
          <button type="submit" disabled={loading}>Add</button>
        </form>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, marginBottom: "0.5rem" }}>Add Bulk</h2>
        <form onSubmit={handleAddBulk}>
          <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "1fr 200px 120px" }}>
            <textarea placeholder="One code per line" rows={5} value={bulk} onChange={e => setBulk(e.target.value)} />
            <select value={amount} onChange={e => setAmount(Number(e.target.value))}>
              <option value={1000}>UGX 1,000</option>
              <option value={1500}>UGX 1,500</option>
              <option value={7000}>UGX 7,000</option>
            </select>
            <button type="submit" disabled={loading}>Add All</button>
          </div>
        </form>
      </section>

      <section>
        <h2 style={{ margin: 0, marginBottom: "0.5rem" }}>Inventory</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
          <select value={filterAmount} onChange={e => setFilterAmount(Number(e.target.value))}>
            <option value={0}>All amounts</option>
            <option value={1000}>UGX 1,000</option>
            <option value={1500}>UGX 1,500</option>
            <option value={7000}>UGX 7,000</option>
          </select>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={onlyUnused} onChange={e => setOnlyUnused(e.target.checked)} /> Only unused
          </label>
          <button onClick={refreshList}>Refresh</button>
        </div>
        <div style={{ border: "1px solid #eee" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.5rem", fontWeight: 600, background: "#fafafa" }}>
            <div>Code</div>
            <div>Amount</div>
            <div>Used</div>
            <div>Assigned To</div>
          </div>
          {vouchers.map(v => (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0.5rem", borderTop: "1px solid #f0f0f0" }}>
              <div>{v.code}</div>
              <div>{v.amount?.toLocaleString?.() ?? v.amount}</div>
              <div>{String(v.used)}</div>
              <div>{v.assignedTo || ""}</div>
            </div>
          ))}
          {vouchers.length === 0 && (
            <div style={{ padding: "0.75rem" }}>No vouchers found</div>
          )}
        </div>
      </section>
    </div>
  );
}
