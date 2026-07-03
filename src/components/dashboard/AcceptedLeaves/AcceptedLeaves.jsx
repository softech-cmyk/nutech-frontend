import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./AcceptedLeaves.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const AcceptedLeaves = () => {
  const navigate              = useNavigate();
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApproved = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/leaves/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeaves((data.leaves || []).filter((l) => l.status === "approved"));
    } catch (err) {
      console.error("AcceptedLeaves fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchApproved();
    const interval = setInterval(fetchApproved, 30000);
    return () => clearInterval(interval);
  }, [fetchApproved]);

  return (
    <div className="accepted-leaves">
      <div className="present-table-container">
        <div className="table-actions">
          <div>
            <h2>On Leaves</h2>
            <p className="table-sub">Employees currently on approved leave.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="al__count">{leaves.length} approved</span>
            <button className="al__refresh" onClick={fetchApproved}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="present-table-wrap">
          {loading ? (
            <p className="al__empty">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="al__empty">No approved leaves yet.</p>
          ) : (
            <table className="present-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l, i) => (
                  <tr key={l._id} className="present-row">
                    <td>{i + 1}</td>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {(l.userId?.name || l.userId?.phone || "?")[0].toUpperCase()}
                        </div>
                        <span>{l.userId?.name || l.userId?.phone || "—"}</span>
                      </div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{l.userId?.role || "—"}</td>
                    <td><span className="al__type">{l.leaveType}</span></td>
                    <td>{l.leaveDate}</td>
                    <td>{l.reason}</td>
                    <td><span className="al__approved">Approved</span></td>
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

export default AcceptedLeaves;
