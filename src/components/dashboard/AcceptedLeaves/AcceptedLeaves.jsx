import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import HomeButton from "../../HomeButton/HomeButton";
import "./AcceptedLeaves.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const halfDayLabel = (l) => {
  if (!l.isHalfDay) return null;
  const session = l.halfDaySession === "first-half" ? "First Half" : "Second Half";
  return l.halfDayTime ? `${session}, ${l.halfDayTime}` : session;
};

const AcceptedLeaves = () => {
  const navigate              = useNavigate();
  const user                  = JSON.parse(localStorage.getItem("user") || "null");
  const isManager              = user?.role === "manager";
  const [leaves, setLeaves]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError]   = useState("");
  const [submitting, setSubmitting]     = useState(false);

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
      setRejectError("Please enter a reason for changing this to rejected.");
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
      setLeaves((prev) => prev.filter((l) => l._id !== rejectTarget._id));
      toast.success(`Moved ${rejectTarget.userId?.name || "leave"} to rejected.`);
      closeRejectModal();
    } catch (err) {
      setRejectError(err.message || "Failed to reject leave.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="accepted-leaves">
      <HomeButton />
      <div className="present-table-container">
        <div className="table-actions">
          <div>
            <h2>Leave Reports</h2>
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
                  {isManager && <th>Action</th>}
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
                    <td>
                      <span className="al__type">{l.leaveType}</span>
                      {l.isHalfDay && <span className="al__halfday-badge">{halfDayLabel(l)}</span>}
                    </td>
                    <td>{l.startDate}{l.startDate !== l.endDate ? ` → ${l.endDate}` : ""}</td>
                    <td>{l.reason}</td>
                    <td><span className="al__approved">Approved</span></td>
                    {isManager && (
                      <td>
                        <button className="al__reject-btn" onClick={() => openRejectModal(l)}>
                          <i className="ti ti-x" aria-hidden="true" /> Move to rejected
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

      {rejectTarget && (
        <div className="al__modal-backdrop" onClick={closeRejectModal}>
          <div className="al__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="al__modal-icon">
              <i className="ti ti-x" aria-hidden="true" />
            </div>
            <h3 className="al__modal-title">Move to rejected</h3>
            <p className="al__modal-sub">
              Provide a reason for changing{" "}
              <strong>{rejectTarget.userId?.name || rejectTarget.userId?.phone || "this employee"}</strong>&apos;s
              approved leave to rejected.
            </p>

            <textarea
              className="al__modal-textarea"
              placeholder="e.g. Reassessed staffing needs for this date"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              autoFocus
            />

            {rejectError && <p className="al__modal-error">{rejectError}</p>}

            <div className="al__modal-actions">
              <button className="al__modal-cancel" onClick={closeRejectModal} disabled={submitting}>
                Cancel
              </button>
              <button className="al__modal-confirm" onClick={confirmReject} disabled={submitting}>
                {submitting ? "Saving…" : "Move to rejected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptedLeaves;
