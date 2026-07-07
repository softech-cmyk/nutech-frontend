import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TractorLoader from "../../../components/TractorLoader/TractorLoader";
import HomeButton from "../../../components/HomeButton/HomeButton";
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
    </div>
  );
};

export default Employees;
