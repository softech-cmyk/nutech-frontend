import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaTimes } from "react-icons/fa";
import "./LeavesApplied.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const LeavesApplied = () => {
  const navigate              = useNavigate();
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/leaves/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeaves(data.leaves || []);
    } catch (err) {
      console.error("LeavesApplied fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchLeaves();
    const interval = setInterval(fetchLeaves, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaves]);

  const handleAction = async (id, action) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/leaves/${id}/${action}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLeaves((prev) =>
          prev.map((l) =>
            l._id === id ? { ...l, status: action === "approve" ? "approved" : "rejected" } : l
          )
        );
      }
    } catch (err) {
      console.error("Action failed:", err.message);
    }
  };

  const pending = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="leaves-applied">
      <div className="present-table-container">
        <div className="table-actions">
          <div>
            <h2>Applied Leaves</h2>
            <p className="table-sub">Review and approve or reject leave requests.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {pending > 0 && <span className="la__pending-badge">{pending} pending</span>}
            <button className="la__refresh" onClick={fetchLeaves}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="present-table-wrap">
          {loading ? (
            <p className="la__empty">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="la__empty">No leave applications yet.</p>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l, i) => (
                  <tr key={l._id}>
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
                    <td><span className="la__type-badge">{l.leaveType}</span></td>
                    <td>{l.leaveDate}</td>
                    <td className="la__reason">{l.reason}</td>
                    <td>
                      <span className={`la__status la__status--${l.status}`}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {l.status === "pending" ? (
                        <div className="action-cell">
                          <button className="approve-btn" onClick={() => handleAction(l._id, "approve")}>
                            <FaCheck /> Approve
                          </button>
                          <button className="reject-btn" onClick={() => handleAction(l._id, "reject")}>
                            <FaTimes /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#aaa", fontSize: "0.82rem" }}>Done</span>
                      )}
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

export default LeavesApplied;
