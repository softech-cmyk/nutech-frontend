import { useState, useEffect, useMemo, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TractorLoader from "../../../components/TractorLoader/TractorLoader";
import HomeButton from "../../../components/HomeButton/HomeButton";
import DeductionCard from "../../../components/DeductionCard/DeductionCard";
import InHandCard from "../../../components/InHandCard/InHandCard";
import { downloadPayslip } from "../../../utils/payslip";
import "./Payroll.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const initials = (name) =>
  (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

const fmtMoney = (n) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtMonth = (monthStr) => {
  if (!monthStr) return "";
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

const Payroll = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [payroll, setPayroll] = useState({});
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [expandedInHandId, setExpandedInHandId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [editingCtcId, setEditingCtcId] = useState(null);
  const [ctcInput, setCtcInput] = useState("");
  const [savingCtc, setSavingCtc] = useState(false);
  const [savingAdjustments, setSavingAdjustments] = useState(false);
  const [downloadingSlipId, setDownloadingSlipId] = useState(null);

  const loadPayroll = async (token) => {
    const res = await fetch(`${API}/payroll/summary`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const byUser = {};
    for (const r of data.results || []) byUser[r.userId] = r;
    setPayroll(byUser);
    setMonth(data.month || "");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || user?.role !== "manager") {
      navigate("/Login");
      return;
    }

    (async () => {
      try {
        const usersRes = await fetch(`${API}/users/all`, { headers: { Authorization: `Bearer ${token}` } });
        const usersData = await usersRes.json();
        if (!usersRes.ok) throw new Error(usersData.message);
        setUsers(usersData.users || []);
        await loadPayroll(token);
      } catch (err) {
        setError(err.message || "Could not load payroll.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const departments = useMemo(
    () => ["All", ...new Set(users.map((u) => u.department).filter(Boolean))],
    [users]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => {
        const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.phone?.includes(q);
        const matchesDept = department === "All" || u.department === department;
        return matchesSearch && matchesDept;
      })
      .map((u) => ({ user: u, p: payroll[u._id] }));
  }, [users, payroll, search, department]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, { p }) => ({
          gross: acc.gross + (p?.monthlySalary || 0),
          deduction: acc.deduction + (p?.deduction || 0),
          net: acc.net + (p?.finalNetSalary ?? p?.netSalary ?? 0),
        }),
        { gross: 0, deduction: 0, net: 0 }
      ),
    [rows]
  );

  const handlePay = async (u) => {
    const p = payroll[u._id];
    const amount = p?.finalNetSalary ?? p?.netSalary;
    if (amount == null) return;
    if (!window.confirm(`Mark ${fmtMoney(amount)} as paid to ${u.name || u.phone} for ${fmtMonth(month)}?`)) return;

    const token = localStorage.getItem("token");
    setPayingId(u._id);
    try {
      const res = await fetch(`${API}/payroll/${u._id}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message || "Could not record payment.");
    } finally {
      await loadPayroll(token);
      setPayingId(null);
    }
  };

  const handleUnpay = async (u) => {
    if (!window.confirm(`Undo this month's payment mark for ${u.name || u.phone}?`)) return;

    const token = localStorage.getItem("token");
    setPayingId(u._id);
    try {
      const res = await fetch(`${API}/payroll/${u._id}/pay`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message || "Could not undo payment.");
    } finally {
      await loadPayroll(token);
      setPayingId(null);
    }
  };

  const handlePayout = async (u) => {
    const p = payroll[u._id];
    const amount = p?.finalNetSalary;
    if (amount == null) return;
    if (!window.confirm(`Send ${fmtMoney(amount)} to ${u.name || u.phone}'s bank account for ${fmtMonth(month)}? This initiates a real bank transfer.`)) return;

    const token = localStorage.getItem("token");
    setPayingId(u._id);
    try {
      const res = await fetch(`${API}/payroll/${u._id}/payout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message || "Could not initiate bank transfer.");
    } finally {
      await loadPayroll(token);
      setPayingId(null);
    }
  };

  const startEditCtc = (u) => {
    setEditingCtcId(u._id);
    setCtcInput(String(payroll[u._id]?.monthlySalary ?? u.monthlySalary ?? ""));
  };

  const cancelEditCtc = () => {
    setEditingCtcId(null);
    setCtcInput("");
  };

  const saveCtc = async (u) => {
    if (ctcInput === "" || isNaN(ctcInput) || Number(ctcInput) < 0) {
      toast.error("Enter a valid, non-negative CTC.");
      return;
    }
    const token = localStorage.getItem("token");
    setSavingCtc(true);
    try {
      const res = await fetch(`${API}/users/${u._id}/salary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monthlySalary: Number(ctcInput) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`CTC updated for ${u.name || u.phone}.`);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, monthlySalary: data.user.monthlySalary } : x)));
      setEditingCtcId(null);
      await loadPayroll(token);
    } catch (err) {
      toast.error(err.message || "Could not update CTC.");
    } finally {
      setSavingCtc(false);
    }
  };

  const saveAdjustments = async (u, adjustments) => {
    const token = localStorage.getItem("token");
    setSavingAdjustments(true);
    try {
      const res = await fetch(`${API}/users/${u._id}/salary-adjustments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(adjustments),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Adjustments saved.");
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, salaryAdjustments: data.user.salaryAdjustments } : x)));
      await loadPayroll(token);
    } catch (err) {
      toast.error(err.message || "Could not save adjustments.");
    } finally {
      setSavingAdjustments(false);
    }
  };

  const handleDownloadPayslip = async (u) => {
    const token = localStorage.getItem("token");
    setDownloadingSlipId(u._id);
    try {
      let bankAccount = null;
      try {
        const res = await fetch(`${API}/users/${u._id}/bank-account`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) bankAccount = data.bankAccount;
      } catch {
        // Bank details are a nice-to-have on the slip — proceed without them if this fails.
      }
      downloadPayslip({ user: u, payroll: payroll[u._id], month, bankAccount });
    } finally {
      setDownloadingSlipId(null);
    }
  };

  return (
    <div className="pay">
      <HomeButton />
      <header className="pay__header">
        <div>
          <h1>Payroll</h1>
          <p>{month ? `${fmtMonth(month)} — ${rows.length} employee(s)` : `${rows.length} employee(s)`}</p>
        </div>
        <button className="pay__manage-btn" onClick={() => navigate("/Employees")}>
          <i className="ti ti-users" aria-hidden="true" /> Manage employees
        </button>
      </header>

      {!loading && !error && (
        <div className="pay__stats">
          <div className="pay__stat">
            <div className="pay__stat-icon pay__stat-icon--gross"><i className="ti ti-report-money" aria-hidden="true" /></div>
            <div>
              <p className="pay__stat-value">{fmtMoney(totals.gross)}</p>
              <p className="pay__stat-label">Total CTC</p>
            </div>
          </div>
          <div className="pay__stat">
            <div className="pay__stat-icon pay__stat-icon--deduction"><i className="ti ti-minus" aria-hidden="true" /></div>
            <div>
              <p className="pay__stat-value">{fmtMoney(totals.deduction)}</p>
              <p className="pay__stat-label">Total deductions</p>
            </div>
          </div>
          <div className="pay__stat">
            <div className="pay__stat-icon pay__stat-icon--net"><i className="ti ti-wallet" aria-hidden="true" /></div>
            <div>
              <p className="pay__stat-value">{fmtMoney(totals.net)}</p>
              <p className="pay__stat-label">Total net payable</p>
            </div>
          </div>
        </div>
      )}

      <div className="pay__filters">
        <div className="pay__search">
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={department} onChange={(e) => setDepartment(e.target.value)}>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {error && (
        <div className="pay__error">
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <div className="pay__table-wrap">
          <TractorLoader label="Loading payroll..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="pay__table-wrap">
          <div className="pay__empty">
            <i className="ti ti-report-money" aria-hidden="true" />
            <p>No employees match these filters.</p>
          </div>
        </div>
      ) : (
        <div className="pay__table-wrap">
          <table className="pay__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>CTC</th>
                <th>In-hand</th>
                <th>Present</th>
                <th>Half-day</th>
                <th>Absent</th>
                <th>Paid leave</th>
                <th>Unpaid leave</th>
                <th>Deduction</th>
                <th>Net Salary</th>
                <th>Slip</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user: u, p }) => {
                const isOpen = expandedId === u._id;
                const isInHandOpen = expandedInHandId === u._id;
                return (
                  <Fragment key={u._id}>
                    <tr>
                      <td>
                        <div className="pay__person">
                          <span className={`pay__avatar pay__avatar--${u.role}`}>{initials(u.name)}</span>
                          <span className="pay__name">{u.name || "—"}</span>
                        </div>
                      </td>
                      <td>{u.department || "—"}</td>
                      <td className="pay__cell-strong">
                        {editingCtcId === u._id ? (
                          <div className="pay__ctc-edit">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="pay__ctc-input"
                              value={ctcInput}
                              onChange={(e) => setCtcInput(e.target.value)}
                              disabled={savingCtc}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveCtc(u);
                                if (e.key === "Escape") cancelEditCtc();
                              }}
                            />
                            <button type="button" className="pay__ctc-save" onClick={() => saveCtc(u)} disabled={savingCtc} title="Save">
                              <i className="ti ti-check" aria-hidden="true" />
                            </button>
                            <button type="button" className="pay__ctc-cancel" onClick={cancelEditCtc} disabled={savingCtc} title="Cancel">
                              <i className="ti ti-x" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <button type="button" className="pay__ctc-btn" onClick={() => startEditCtc(u)} title="Edit CTC">
                            {fmtMoney(p?.monthlySalary ?? u.monthlySalary)}
                            <i className="ti ti-pencil" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                      <td className="pay__cell-net">
                        {p?.netSalary != null || u.monthlySalary != null ? (
                          <button
                            type="button"
                            className="pay__inhand-btn"
                            onClick={() => setExpandedInHandId(isInHandOpen ? null : u._id)}
                            aria-expanded={isInHandOpen}
                          >
                            {fmtMoney(p?.netSalary ?? u.monthlySalary)}
                            <i className={`ti ${isInHandOpen ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" />
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{p?.presentDays ?? "—"}</td>
                      <td>{p?.halfDays ?? "—"}</td>
                      <td>{p?.absentDays ?? "—"}</td>
                      <td>{p?.paidLeaveDays ?? "—"}</td>
                      <td>{p?.unpaidLeaveDays ?? "—"}</td>
                      <td>
                        {p ? (
                          <button
                            type="button"
                            className="pay__deduction-btn"
                            onClick={() => setExpandedId(isOpen ? null : u._id)}
                            aria-expanded={isOpen}
                          >
                            − {fmtMoney(p.deduction)}
                            <i className={`ti ${isOpen ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" />
                          </button>
                        ) : (
                          <span className="pay__cell-deduction">—</span>
                        )}
                      </td>
                      <td className="pay__cell-finalnet">{fmtMoney(p?.finalNetSalary ?? p?.netSalary ?? u.monthlySalary)}</td>
                      <td>
                        <button
                          type="button"
                          className="pay__slip-btn"
                          onClick={() => handleDownloadPayslip(u)}
                          disabled={downloadingSlipId === u._id || (!p && u.monthlySalary == null)}
                          title="Download salary slip"
                        >
                          <i className={`ti ${downloadingSlipId === u._id ? "ti-loader-2" : "ti-file-download"}`} aria-hidden="true" />
                        </button>
                      </td>
                      <td>
                        {!p || p.netSalary == null ? (
                          <span className="pay__cell-deduction">—</span>
                        ) : p.payoutStatus === "processing" || p.payoutStatus === "queued" ? (
                          <span className="pay__paid-badge pay__paid-badge--pending">
                            <i className="ti ti-clock-hour-4" aria-hidden="true" /> Processing…
                          </span>
                        ) : p.payoutStatus === "processed" ? (
                          <span className="pay__paid-badge">
                            <i className="ti ti-circle-check" aria-hidden="true" /> Paid {p.paidAt ? fmtDate(p.paidAt) : ""}
                          </span>
                        ) : p.payoutStatus === "recorded" ? (
                          <div className="pay__paid">
                            <span className="pay__paid-badge">
                              <i className="ti ti-circle-check" aria-hidden="true" /> Paid {p.paidAt ? fmtDate(p.paidAt) : ""}
                            </span>
                            <button
                              type="button"
                              className="pay__undo-btn"
                              onClick={() => handleUnpay(u)}
                              disabled={payingId === u._id}
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <div className="pay__pay-actions">
                            {(p.payoutStatus === "failed" || p.payoutStatus === "reversed") && (
                              <span className="pay__failed-note" title={p.failureReason || ""}>
                                <i className="ti ti-alert-triangle" aria-hidden="true" /> {p.payoutStatus === "reversed" ? "Reversed" : "Failed"}
                              </span>
                            )}
                            <button
                              type="button"
                              className="pay__pay-btn"
                              onClick={() => handlePayout(u)}
                              disabled={payingId === u._id}
                            >
                              <i className="ti ti-building-bank" aria-hidden="true" />
                              {payingId === u._id ? "Sending…" : "Pay via bank"}
                            </button>
                            <button
                              type="button"
                              className="pay__manual-link"
                              onClick={() => handlePay(u)}
                              disabled={payingId === u._id}
                            >
                              mark as paid manually
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="pay__breakdown-row">
                        <td colSpan={13}>
                          <div className="pay__breakdown">
                            <DeductionCard p={p} />
                          </div>
                        </td>
                      </tr>
                    )}
                    {isInHandOpen && (
                      <tr className="pay__breakdown-row">
                        <td colSpan={13}>
                          <div className="pay__breakdown">
                            <InHandCard
                              netSalary={p?.netSalary ?? u.monthlySalary}
                              adjustments={u.salaryAdjustments}
                              onSave={(adjustments) => saveAdjustments(u, adjustments)}
                              saving={savingAdjustments}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payroll;
