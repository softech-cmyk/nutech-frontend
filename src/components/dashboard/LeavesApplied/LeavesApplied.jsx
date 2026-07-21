import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheck, FaTimes } from "react-icons/fa";
import HomeButton from "../../HomeButton/HomeButton";
import "./LeavesApplied.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const LeavesApplied = () => {
  const navigate              = useNavigate();
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null); // leave being rejected
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError]   = useState("");
  const [submitting, setSubmitting]     = useState(false);

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

  const handleApprove = async (id) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/leaves/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLeaves((prev) =>
          prev.map((l) => (l._id === id ? { ...l, status: "approved" } : l))
        );
      }
    } catch (err) {
      console.error("Action failed:", err.message);
    }
  };

  const openRejectModal = (leave) => {
    setRejectTarget(leave);
    setRejectReason("");
    setRejectError("");
  };

  const closeRejectModal = () => {
    setRejectTarget(null);
    setRejectReason("");
    setRejectError("");
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      setRejectError("Please enter a reason for rejecting this leave.");
      return;
    }
    const token = localStorage.getItem("token");
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/leaves/${rejectTarget._id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLeaves((prev) =>
        prev.map((l) =>
          l._id === rejectTarget._id
            ? { ...l, status: "rejected", rejectionReason: rejectReason.trim() }
            : l
        )
      );
      closeRejectModal();
    } catch (err) {
      setRejectError(err.message || "Failed to reject leave.");
    } finally {
      setSubmitting(false);
    }
  };

  const pending = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="leaves-applied">
      <HomeButton />
      <div className="la__container">
        <div className="la__header">
          <div>
            <h2>Applied Leaves</h2>
            <p className="la__sub">Review and approve or reject leave requests.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {pending > 0 && <span className="la__pending-badge">{pending} pending</span>}
            <button className="la__refresh" onClick={fetchLeaves}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="la__table-wrap">
          {loading ? (
            <p className="la__empty">Loading...</p>
          ) : leaves.length === 0 ? (
            <p className="la__empty">No leave applications yet.</p>
          ) : (
            <table className="la__table">
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
                      <div className="la__user-info">
                        <div className="la__user-avatar">
                          {(l.userId?.name || l.userId?.phone || "?")[0].toUpperCase()}
                        </div>
                        <span>{l.userId?.name || l.userId?.phone || "—"}</span>
                      </div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{l.userId?.role || "—"}</td>
                    <td>
                      <span className="la__type-badge">{l.leaveType}</span>
                      {l.isHalfDay && <span className="la__halfday-badge">Half Day</span>}
                    </td>
                    <td>{l.startDate}{l.startDate !== l.endDate ? ` → ${l.endDate}` : ""}</td>
                    <td className="la__reason">{l.reason}</td>
                    <td>
                      <span className={`la__status la__status--${l.status}`}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      {l.status === "pending" ? (
                        <div className="la__action-cell">
                          <button className="la__approve-btn" onClick={() => handleApprove(l._id)}>
                            <FaCheck /> Approve
                          </button>
                          <button className="la__reject-btn" onClick={() => openRejectModal(l)}>
                            <FaTimes /> Reject
                          </button>
                        </div>
                      ) : l.status === "rejected" && l.rejectionReason ? (
                        <div className="la__reason-card">
                          <span className="la__reason-card-label">
                            <FaTimes /> Rejection reason
                          </span>
                          <p className="la__reason-card-text">{l.rejectionReason}</p>
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

      {rejectTarget && (
        <div className="la__modal-backdrop" onClick={closeRejectModal}>
          <div className="la__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="la__modal-icon">
              <FaTimes />
            </div>
            <h3 className="la__modal-title">Reject leave request</h3>
            <p className="la__modal-sub">
              Provide a reason for rejecting{" "}
              <strong>{rejectTarget.userId?.name || rejectTarget.userId?.phone || "this employee"}</strong>&apos;s
              leave request.
            </p>

            <textarea
              className="la__modal-textarea"
              placeholder="e.g. Insufficient staffing on this date"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              autoFocus
            />

            {rejectError && <p className="la__modal-error">{rejectError}</p>}

            <div className="la__modal-actions">
              <button className="la__modal-cancel" onClick={closeRejectModal} disabled={submitting}>
                Cancel
              </button>
              <button className="la__modal-confirm" onClick={confirmReject} disabled={submitting}>
                {submitting ? "Rejecting…" : "Reject leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavesApplied;
