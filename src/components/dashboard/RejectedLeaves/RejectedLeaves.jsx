import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaTimesCircle, FaCheck } from "react-icons/fa";
import toast from "react-hot-toast";
import HomeButton from "../../HomeButton/HomeButton";
import "./RejectedLeaves.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const RejectedLeaves = () => {
  const navigate              = useNavigate();
  const user                  = JSON.parse(localStorage.getItem("user") || "null");
  const isManager              = user?.role === "manager";
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);

  const fetchRejected = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/leaves/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeaves((data.leaves || []).filter((l) => l.status === "rejected"));
    } catch (err) {
      console.error("RejectedLeaves fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchRejected();
    const interval = setInterval(fetchRejected, 30000);
    return () => clearInterval(interval);
  }, [fetchRejected]);

  const handleApprove = async (leave) => {
    const token = localStorage.getItem("token");
    setApprovingId(leave._id);
    try {
      const res = await fetch(`${API}/leaves/${leave._id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLeaves((prev) => prev.filter((l) => l._id !== leave._id));
      toast.success(`Moved ${leave.userId?.name || "leave"} to approved.`);
    } catch (err) {
      toast.error(err.message || "Could not approve leave.");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="rejected-leaves">
      <HomeButton />
      <div className="rejected-card">
        <div className="header-section">
          <div>
            <h2>Rejected Leaves</h2>
            <p>Manage and review rejected employee leave requests</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="rl__count">{leaves.length} rejected</span>
            <button className="rl__refresh" onClick={fetchRejected}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <p className="rl__empty">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="rl__empty">No rejected leaves yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  {isManager && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l, i) => (
                  <tr key={l._id}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="employee">
                        <div className="avatar">
                          {(l.userId?.name || l.userId?.phone || "?")[0].toUpperCase()}
                        </div>
                        <span>{l.userId?.name || l.userId?.phone || "—"}</span>
                      </div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{l.userId?.role || "—"}</td>
                    <td>{l.userId?.department || "—"}</td>
                    <td><span className="leave-type">{l.leaveType}</span></td>
                    <td>{l.leaveDate}</td>
                    <td>{l.reason}</td>
                    <td>
                      <span className="rejected-status">
                        <FaTimesCircle /> Rejected
                      </span>
                    </td>
                    {isManager && (
                      <td>
                        <button
                          className="rl__approve-btn"
                          onClick={() => handleApprove(l)}
                          disabled={approvingId === l._id}
                        >
                          <FaCheck /> {approvingId === l._id ? "Approving…" : "Move to approved"}
                        </button>
                      </td>
                    )}
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

export default RejectedLeaves;
