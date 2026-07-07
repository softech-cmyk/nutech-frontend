import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import HomeButton from "../../HomeButton/HomeButton";
import "./AbsentToday.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const AbsentToday = () => {
  const navigate          = useNavigate();
  const [absent, setAbsent]   = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const fetchAbsent = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);

      const [usersRes, attRes] = await Promise.all([
        fetch(`${API}/users/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/attendance/all?date=${todayStr}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const usersData = await usersRes.json();
      const attData   = await attRes.json();

      const presentIds = new Set(
        (attData.records || []).map((r) => r.userId?._id || r.userId)
      );

      const absentUsers = (usersData.users || []).filter(
        (u) => !presentIds.has(String(u._id))
      );

      setAbsent(absentUsers);
    } catch (err) {
      console.error("AbsentToday fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAbsent();
    const interval = setInterval(fetchAbsent, 30000);
    return () => clearInterval(interval);
  }, [fetchAbsent]);

  const initials = (name, phone) => {
    if (name) return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return phone ? phone.slice(-2) : "??";
  };

  return (
    <div className="absent-today">
      <HomeButton />
      <div className="present-table-container">
        <div className="table-actions">
          <div>
            <h2>Absent Today</h2>
            <p className="table-sub">{today}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="absent__count">{absent.length} absent</span>
            <button className="absent__refresh" onClick={fetchAbsent}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="present-table-wrap">
          {loading ? (
            <p className="absent__empty">Loading...</p>
          ) : absent.length === 0 ? (
            <p className="absent__empty">Everyone has punched in today!</p>
          ) : (
            <table className="present-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {absent.map((u, i) => (
                  <tr key={u._id} className="absent-row">
                    <td>{i + 1}</td>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">{initials(u.name, u.phone)}</div>
                        <span>{u.name || u.phone}</span>
                      </div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                    <td>{u.department || "—"}</td>
                    <td>{u.company || "—"}</td>
                    <td>
                      <span className="absent__badge">Absent</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AbsentToday;
