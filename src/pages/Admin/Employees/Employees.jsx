import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TractorLoader from "../../../components/TractorLoader/TractorLoader";
import HomeButton from "../../../components/HomeButton/HomeButton";
import DeductionCard from "../../../components/DeductionCard/DeductionCard";
import "./Employees.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

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

const Employees = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [role, setRole] = useState("All");
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [payroll, setPayroll] = useState({});
  const [payrollMonth, setPayrollMonth] = useState("");
  const [salaryTarget, setSalaryTarget] = useState(null);
  const [salaryInput, setSalaryInput] = useState("");
  const [salaryError, setSalaryError] = useState("");
  const [savingSalary, setSavingSalary] = useState(false);
  const [editingSalary, setEditingSalary] = useState(false);
  const [showDeductionDetail, setShowDeductionDetail] = useState(false);
  const [payingSalary, setPayingSalary] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({ accountHolderName: "", accountNumber: "", ifsc: "" });
  const [bankError, setBankError] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [initiatingPayout, setInitiatingPayout] = useState(false);

  const loadPayroll = async (token) => {
    try {
      const res = await fetch(`${API}/payroll/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const byUser = {};
      for (const r of data.results || []) byUser[r.userId] = r;
      setPayroll(byUser);
      setPayrollMonth(data.month || "");
    } catch (err) {
      // Salary breakdown is a bonus layer over the employee list — don't
      // block the page if it fails, just leave the column blank.
      console.error("payroll summary error:", err.message);
    }
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
        const res = await fetch(`${API}/users/all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setUsers(data.users || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      await loadPayroll(token);
    })();
  }, [navigate]);

  const departments = useMemo(
    () => ["All", ...new Set(users.map((u) => u.department).filter(Boolean))],
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.phone?.includes(q);
      const matchesDept = department === "All" || u.department === department;
      const matchesRole = role === "All" || u.role === role;
      return matchesSearch && matchesDept && matchesRole;
    });
  }, [users, search, department, role]);

  const stats = useMemo(() => ({
    total: users.length,
    managers: users.filter((u) => u.role === "manager").length,
    employees: users.filter((u) => u.role === "employee").length,
    departments: new Set(users.map((u) => u.department).filter(Boolean)).size,
  }), [users]);

  const openResetModal = (user) => {
    setResetTarget(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setResetError("");
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setNewPassword("");
    setConfirmPassword("");
    setResetError("");
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match."); return; }
    setResetError("");
    setResetting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/${resetTarget._id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Password reset for ${resetTarget.name || resetTarget.phone}.`);
      closeResetModal();
    } catch (err) {
      setResetError(err.message || "Could not reset password.");
    } finally {
      setResetting(false);
    }
  };

  const openSalaryModal = async (user) => {
    setSalaryTarget(user);
    setSalaryInput(String(payroll[user._id]?.monthlySalary ?? user.monthlySalary ?? ""));
    setSalaryError("");
    setEditingSalary(false);
    setShowDeductionDetail(false);
    setEditingBank(false);
    setBankError("");
    setBankAccount(null);

    setBankLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/${user._id}/bank-account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setBankAccount(data.bankAccount);
    } catch {
      // Bank details are supplementary here — the modal still works without them.
    } finally {
      setBankLoading(false);
    }
  };

  const closeSalaryModal = () => {
    setSalaryTarget(null);
    setSalaryInput("");
    setSalaryError("");
    setEditingSalary(false);
    setShowDeductionDetail(false);
    setBankAccount(null);
    setEditingBank(false);
    setBankError("");
  };

  const openEditBank = () => {
    setBankForm({
      accountHolderName: bankAccount?.accountHolderName || salaryTarget?.name || "",
      accountNumber: "",
      ifsc: bankAccount?.ifsc || "",
    });
    setBankError("");
    setEditingBank(true);
  };

  const handleSaveBankAccount = async () => {
    const { accountHolderName, accountNumber, ifsc } = bankForm;
    if (!accountHolderName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      setBankError("Account holder name, account number, and IFSC are all required.");
      return;
    }
    setBankError("");
    setSavingBank(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/${salaryTarget._id}/bank-account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountHolderName, accountNumber, ifsc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success("Bank details saved.");
      setBankAccount(data.bankAccount);
      setEditingBank(false);
    } catch (err) {
      setBankError(err.message || "Could not save bank details.");
    } finally {
      setSavingBank(false);
    }
  };

  const handleSaveSalary = async () => {
    if (salaryInput === "" || isNaN(salaryInput) || Number(salaryInput) < 0) {
      setSalaryError("Enter a valid, non-negative salary.");
      return;
    }
    setSalaryError("");
    setSavingSalary(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/users/${salaryTarget._id}/salary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ monthlySalary: Number(salaryInput) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Salary updated for ${salaryTarget.name || salaryTarget.phone}.`);
      setUsers((prev) => prev.map((u) => (u._id === salaryTarget._id ? { ...u, monthlySalary: data.user.monthlySalary } : u)));
      setEditingSalary(false);
      await loadPayroll(token);
    } catch (err) {
      setSalaryError(err.message || "Could not update salary.");
    } finally {
      setSavingSalary(false);
    }
  };

  const handlePaySalary = async () => {
    const p = payroll[salaryTarget._id];
    if (!p || p.netSalary == null) return;
    if (!window.confirm(`Mark ${fmtMoney(p.netSalary)} as paid to ${salaryTarget.name || salaryTarget.phone} for ${fmtMonth(payrollMonth)}?`)) return;

    setPayingSalary(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/payroll/${salaryTarget._id}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      setPayroll((prev) => ({ ...prev, [salaryTarget._id]: { ...prev[salaryTarget._id], paid: true, paidAt: data.payment.paidAt } }));
    } catch (err) {
      toast.error(err.message || "Could not record payment.");
    } finally {
      setPayingSalary(false);
    }
  };

  const handleUnpaySalary = async () => {
    if (!window.confirm(`Undo this month's payment mark for ${salaryTarget.name || salaryTarget.phone}?`)) return;

    setPayingSalary(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/payroll/${salaryTarget._id}/pay`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      setPayroll((prev) => ({ ...prev, [salaryTarget._id]: { ...prev[salaryTarget._id], paid: false, paidAt: null } }));
    } catch (err) {
      toast.error(err.message || "Could not undo payment.");
    } finally {
      setPayingSalary(false);
    }
  };

  const handlePayout = async () => {
    const p = payroll[salaryTarget._id];
    if (!p || p.netSalary == null) return;
    if (!window.confirm(`Send ${fmtMoney(p.netSalary)} to ${salaryTarget.name || salaryTarget.phone}'s bank account for ${fmtMonth(payrollMonth)}? This initiates a real bank transfer.`)) return;

    const token = localStorage.getItem("token");
    setInitiatingPayout(true);
    try {
      const res = await fetch(`${API}/payroll/${salaryTarget._id}/payout`, {
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
      setInitiatingPayout(false);
    }
  };

  return (
    <div className="emps">
      <HomeButton />
      <header className="emps__header">
        <div>
          <h1>Company employees</h1>
          <p>{filtered.length} of {users.length} accounts</p>
        </div>
        <button className="emps__add-btn" onClick={() => navigate("/CreateEmployee")}>
          <i className="ti ti-user-plus" aria-hidden="true" /> Add employee
        </button>
      </header>

      {!loading && !error && (
        <div className="emps__stats">
          <button
            type="button"
            className={`emps__stat ${role === "All" ? "emps__stat--active" : ""}`}
            onClick={() => setRole("All")}
          >
            <div className="emps__stat-icon emps__stat-icon--total"><i className="ti ti-users" aria-hidden="true" /></div>
            <div>
              <p className="emps__stat-value">{stats.total}</p>
              <p className="emps__stat-label">No. of users</p>
            </div>
          </button>
          <button
            type="button"
            className={`emps__stat ${role === "manager" ? "emps__stat--active" : ""}`}
            onClick={() => setRole("manager")}
          >
            <div className="emps__stat-icon emps__stat-icon--manager"><i className="ti ti-shield-check" aria-hidden="true" /></div>
            <div>
              <p className="emps__stat-value">{stats.managers}</p>
              <p className="emps__stat-label">Managers</p>
            </div>
          </button>
          <button
            type="button"
            className={`emps__stat ${role === "employee" ? "emps__stat--active" : ""}`}
            onClick={() => setRole("employee")}
          >
            <div className="emps__stat-icon emps__stat-icon--employee"><i className="ti ti-user" aria-hidden="true" /></div>
            <div>
              <p className="emps__stat-value">{stats.employees}</p>
              <p className="emps__stat-label">Employees</p>
            </div>
          </button>
          <button
            type="button"
            className={`emps__stat ${department !== "All" ? "emps__stat--active" : ""}`}
            onClick={() => setDepartment("All")}
          >
            <div className="emps__stat-icon emps__stat-icon--dept"><i className="ti ti-building" aria-hidden="true" /></div>
            <div>
              <p className="emps__stat-value">{stats.departments}</p>
              <p className="emps__stat-label">Departments</p>
            </div>
          </button>
        </div>
      )}

      <div className="emps__filters">
        <div className="emps__search">
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
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="All">All roles</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {error && (
        <div className="emps__error">
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <div className="emps__table-wrap">
          <TractorLoader label="Loading employees..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="emps__table-wrap">
          <div className="emps__empty">
            <i className="ti ti-users-group" aria-hidden="true" />
            <p>No employees match these filters.</p>
          </div>
        </div>
      ) : (
        <div className="emps__table-wrap">
          <table className="emps__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Company</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Net salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="emps__person">
                      <span className={`emps__avatar emps__avatar--${u.role}`}>{initials(u.name)}</span>
                      <span className="emps__name">{u.name || "—"}</span>
                    </div>
                  </td>
                  <td>{u.countryCode} {u.phone}</td>
                  <td>{u.department || "—"}</td>
                  <td>{u.company || "—"}</td>
                  <td>
                    <span className={`emps__badge emps__badge--${u.role}`}>{u.role}</span>
                  </td>
                  <td>{u.createdAt ? formatDate(u.createdAt) : "—"}</td>
                  <td>
                    <button className="emps__salary-link" onClick={() => openSalaryModal(u)}>
                      {fmtMoney(payroll[u._id]?.netSalary ?? u.monthlySalary)}
                      {payroll[u._id]?.paid && <i className="ti ti-circle-check emps__salary-paid-icon" aria-hidden="true" title="Paid this month" />}
                    </button>
                  </td>
                  <td>
                    <button className="emps__reset-btn" onClick={() => openResetModal(u)}>
                      <i className="ti ti-key" aria-hidden="true" /> Reset password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetTarget && (
        <div className="emps__modal-backdrop" onClick={closeResetModal}>
          <div className="emps__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="emps__modal-icon">
              <i className="ti ti-key" aria-hidden="true" />
            </div>
            <h3 className="emps__modal-title">Reset password</h3>
            <p className="emps__modal-sub">
              Set a new password for <strong>{resetTarget.name || resetTarget.phone}</strong>.
            </p>

            <div className="emps__modal-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="emps__modal-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
              </button>
            </div>
            <div className="emps__modal-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {resetError && <p className="emps__modal-error">{resetError}</p>}

            <div className="emps__modal-actions">
              <button className="emps__modal-cancel" onClick={closeResetModal} disabled={resetting}>
                Cancel
              </button>
              <button className="emps__modal-confirm" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {salaryTarget && (() => {
        const p = payroll[salaryTarget._id];
        return (
          <div className="emps__modal-backdrop" onClick={closeSalaryModal}>
            <div className="emps__modal-card emps__modal-card--wide" onClick={(e) => e.stopPropagation()}>
              <div className="emps__modal-icon">
                <i className="ti ti-currency-rupee" aria-hidden="true" />
              </div>
              <h3 className="emps__modal-title">Salary — {salaryTarget.name || salaryTarget.phone}</h3>
              <p className="emps__modal-sub">
                {p ? fmtMonth(payrollMonth) : "Set this employee's gross monthly salary."}
              </p>

              {editingSalary ? (
                <>
                  <div className="emps__modal-field">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Gross monthly salary"
                      value={salaryInput}
                      onChange={(e) => setSalaryInput(e.target.value)}
                    />
                  </div>
                  {salaryError && <p className="emps__modal-error">{salaryError}</p>}
                  <div className="emps__modal-actions">
                    <button className="emps__modal-cancel" onClick={() => setEditingSalary(false)} disabled={savingSalary}>
                      Cancel
                    </button>
                    <button className="emps__modal-confirm" onClick={handleSaveSalary} disabled={savingSalary}>
                      {savingSalary ? "Saving…" : "Save salary"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="emps__salary-grid">
                    <div className="emps__salary-row emps__salary-row--gross">
                      <span>Gross salary</span>
                      <strong>{fmtMoney(p?.monthlySalary ?? salaryTarget.monthlySalary)}</strong>
                    </div>
                    <div className="emps__salary-row">
                      <span>Working days this month</span>
                      <strong>{p?.workingDaysInMonth ?? "—"}</strong>
                    </div>
                    <div className="emps__salary-row">
                      <span>Present days</span>
                      <strong>{p?.presentDays ?? "—"}</strong>
                    </div>
                    <div className="emps__salary-row">
                      <span>Half days</span>
                      <strong>{p?.halfDays ?? "—"}</strong>
                    </div>
                    <div className="emps__salary-row">
                      <span>Absent days</span>
                      <strong>{p?.absentDays ?? "—"}</strong>
                    </div>
                    <div className="emps__salary-row">
                      <span>Approved leave (paid)</span>
                      <strong>{p?.paidLeaveDays ?? "—"}</strong>
                    </div>
                    <div className="emps__salary-row emps__salary-row--deduction">
                      <span>Deduction (half-days + absents)</span>
                      <button
                        type="button"
                        className="emps__deduction-btn"
                        onClick={() => setShowDeductionDetail((s) => !s)}
                        aria-expanded={showDeductionDetail}
                      >
                        − {fmtMoney(p?.deduction)}
                        <i className={`ti ${showDeductionDetail ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" />
                      </button>
                    </div>
                    {showDeductionDetail && (
                      <div className="emps__deduction-detail">
                        <DeductionCard p={p} />
                      </div>
                    )}
                    <div className="emps__salary-row emps__salary-row--net">
                      <span>Net salary</span>
                      <strong>{fmtMoney(p?.netSalary ?? salaryTarget.monthlySalary)}</strong>
                    </div>
                  </div>

                  <div className="emps__bank-section">
                    <div className="emps__bank-header">
                      <span>Bank account</span>
                      {!editingBank && !bankLoading && (
                        <button type="button" className="emps__bank-edit-link" onClick={openEditBank}>
                          {bankAccount ? "Edit" : "Add"}
                        </button>
                      )}
                    </div>

                    {bankLoading ? (
                      <p className="emps__bank-summary">Loading…</p>
                    ) : editingBank ? (
                      <>
                        <div className="emps__modal-field">
                          <input
                            type="text"
                            placeholder="Account holder name"
                            value={bankForm.accountHolderName}
                            onChange={(e) => setBankForm((f) => ({ ...f, accountHolderName: e.target.value }))}
                          />
                        </div>
                        <div className="emps__modal-field">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Account number"
                            value={bankForm.accountNumber}
                            onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))}
                          />
                        </div>
                        <div className="emps__modal-field">
                          <input
                            type="text"
                            placeholder="IFSC code"
                            value={bankForm.ifsc}
                            onChange={(e) => setBankForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                          />
                        </div>
                        {bankError && <p className="emps__modal-error">{bankError}</p>}
                        <div className="emps__modal-actions">
                          <button className="emps__modal-cancel" onClick={() => setEditingBank(false)} disabled={savingBank}>
                            Cancel
                          </button>
                          <button className="emps__modal-confirm" onClick={handleSaveBankAccount} disabled={savingBank}>
                            {savingBank ? "Saving…" : "Save bank details"}
                          </button>
                        </div>
                      </>
                    ) : bankAccount ? (
                      <p className="emps__bank-summary">
                        {bankAccount.accountHolderName} · {bankAccount.accountNumberMasked} · {bankAccount.ifsc}
                      </p>
                    ) : (
                      <p className="emps__bank-summary emps__bank-summary--empty">No bank account on file yet.</p>
                    )}
                  </div>

                  {p?.netSalary != null && !editingBank && (
                    <div className="emps__payment-actions">
                      {p.payoutStatus === "processing" || p.payoutStatus === "queued" ? (
                        <div className="emps__paid-banner emps__paid-banner--pending">
                          <span className="emps__paid-badge emps__paid-badge--pending">
                            <i className="ti ti-clock-hour-4" aria-hidden="true" /> Bank transfer processing…
                          </span>
                        </div>
                      ) : p.payoutStatus === "processed" ? (
                        <div className="emps__paid-banner">
                          <span className="emps__paid-badge">
                            <i className="ti ti-circle-check" aria-hidden="true" /> Paid via bank transfer {p.paidAt ? fmtDate(p.paidAt) : ""}
                          </span>
                        </div>
                      ) : p.payoutStatus === "recorded" ? (
                        <div className="emps__paid-banner">
                          <span className="emps__paid-badge">
                            <i className="ti ti-circle-check" aria-hidden="true" /> Paid {p.paidAt ? fmtDate(p.paidAt) : ""}
                          </span>
                          <button type="button" className="emps__undo-btn" onClick={handleUnpaySalary} disabled={payingSalary}>
                            Undo
                          </button>
                        </div>
                      ) : (
                        <>
                          {(p.payoutStatus === "failed" || p.payoutStatus === "reversed") && (
                            <p className="emps__bank-error-note">
                              <i className="ti ti-alert-triangle" aria-hidden="true" />
                              {p.payoutStatus === "reversed" ? " Previous transfer was reversed" : " Previous transfer failed"}
                              {p.failureReason ? `: ${p.failureReason}` : ""}. You can retry below.
                            </p>
                          )}
                          <button
                            type="button"
                            className="emps__pay-btn"
                            onClick={handlePayout}
                            disabled={initiatingPayout || !bankAccount}
                            title={!bankAccount ? "Add bank details first" : undefined}
                          >
                            <i className="ti ti-building-bank" aria-hidden="true" />
                            {initiatingPayout ? "Sending…" : `Pay ${fmtMoney(p.netSalary)} via bank transfer`}
                          </button>
                          <button type="button" className="emps__mark-paid-link" onClick={handlePaySalary} disabled={payingSalary}>
                            or mark as paid manually
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  <div className="emps__modal-actions">
                    <button className="emps__modal-cancel" onClick={closeSalaryModal}>
                      Close
                    </button>
                    <button className="emps__modal-confirm" onClick={() => setEditingSalary(true)}>
                      Edit salary
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Employees;
