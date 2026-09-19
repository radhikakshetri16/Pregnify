import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CreditCard, RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api";

const formatAmount = (paisa) =>
  `NPR ${(Number(paisa || 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("REFUND_REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = filter ? `?status=${filter}` : "";
      const response = await fetch(`${API_BASE}/admin/payments${query}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load payments");
      setPayments(data.payments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    queueMicrotask(() => loadPayments());
  }, [loadPayments]);

  const markRefunded = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API_BASE}/admin/payments/${editing.payment_id}/refund`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund_reference: reference, admin_note: note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update refund");
      setEditing(null);
      setReference("");
      setNote("");
      setNotice("Refund marked complete.");
      await loadPayments();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <CreditCard className="text-pink-600" /> Payments & Refunds
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track gateway payments and refunds completed in provider dashboards.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            <option value="REFUND_REQUESTED">Refund requested</option>
            <option value="COMPLETED">Completed</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PENDING">Pending</option>
            <option value="">All payments</option>
          </select>
          <button onClick={loadPayments} className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50">
            <RefreshCw size={17} />
          </button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{notice}</div>}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Patient / Appointment</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400">Loading payments…</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400">No payments match this filter.</td></tr>
            ) : payments.map((payment) => (
              <tr key={payment.payment_id} className="text-gray-700">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{payment.user_name}</div>
                  <div className="text-xs text-gray-500">Dr. {payment.doctor_name} · {payment.appointment_date} {payment.appointment_time}</div>
                </td>
                <td className="px-4 py-3 font-semibold">{payment.provider}</td>
                <td className="px-4 py-3">{formatAmount(payment.amount_paisa)}</td>
                <td className="max-w-48 truncate px-4 py-3 font-mono text-xs" title={payment.provider_transaction_id || payment.merchant_transaction_id}>
                  {payment.provider_transaction_id || payment.merchant_transaction_id}
                </td>
                <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{payment.status.replaceAll("_", " ")}</span></td>
                <td className="px-4 py-3 text-right">
                  {payment.status === "REFUND_REQUESTED" && (
                    <button onClick={() => setEditing(payment)} className="rounded-lg bg-pink-600 px-3 py-2 text-xs font-semibold text-white hover:bg-pink-700">Mark refunded</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <form onSubmit={markRefunded} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div>
              <h2 className="font-bold text-gray-800">Confirm manual refund</h2>
              <p className="mt-1 text-xs text-gray-500">Only continue after refunding {formatAmount(editing.amount_paisa)} in the {editing.provider} merchant dashboard.</p>
            </div>
            <input value={reference} onChange={(event) => setReference(event.target.value)} required placeholder="Provider refund reference" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm" />
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional admin note" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm">Cancel</button>
              <button type="submit" className="rounded-xl bg-pink-600 px-4 py-2 text-sm font-semibold text-white">Confirm refunded</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminPayments;
