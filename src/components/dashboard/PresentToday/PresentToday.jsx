import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import HomeButton from "../../HomeButton/HomeButton";
import "./PresentToday.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const fmtTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

const fmtMins = (mins) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

// Only an employee with an open (punched-in, not punched-out) session is
// actively pushing a live location — everyone else has nothing to track.
const isOnDuty = (r) => {
  const last = r.sessions?.[r.sessions.length - 1];
  return !!(last && !last.punchOut);
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const PresentToday = () => {
  const navigate          = useNavigate();
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markUserId, setMarkUserId] = useState("");
  const [markStatus, setMarkStatus] = useState("present");
  const [markNote, setMarkNote] = useState("");
  const [markError, setMarkError] = useState("");
  const [marking, setMarking] = useState(false);
  const [statusRec, setStatusRec] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusError, setStatusError] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const isToday = selectedDate === todayStr();
  const dateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const fetchPresent = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/attendance/all?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(data.records || []);
    } catch (err) {
      console.error("PresentToday fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate, selectedDate]);

  useEffect(() => {
    // Deferred via setTimeout rather than called directly, so the effect
    // itself never synchronously invokes a function that sets state.
    const initialFetch = setTimeout(fetchPresent, 0);
    // Live polling only makes sense while looking at today — a past date's
    // records won't change on their own.
    if (!isToday) return () => clearTimeout(initialFetch);
    const interval = setInterval(fetchPresent, 30000);
    return () => { clearTimeout(initialFetch); clearInterval(interval); };
  }, [fetchPresent, isToday]);

  // Employees who don't already have a record for today — the only ones a
  // manager can mark, since anyone already listed already has one.
  const markableEmployees = employees.filter(
    (e) => !rows.some((r) => r.userId?._id === e._id)
  );

  const openMarkModal = async () => {
    setShowMarkModal(true);
    setMarkUserId("");
    setMarkStatus("present");
    setMarkNote("");
    setMarkError("");
    if (employees.length === 0) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/users/all`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setEmployees(data.users || []);
      } catch {
        // If this fails the dropdown is just empty — the modal still opens.
      }
    }
  };

  const closeMarkModal = () => setShowMarkModal(false);

  const handleMarkAttendance = async () => {
    if (!markUserId) { setMarkError("Select an employee."); return; }
    if (!markNote.trim()) { setMarkError("A reason is required."); return; }
    setMarkError("");
    setMarking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: markUserId, status: markStatus, note: markNote.trim(), date: selectedDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      setShowMarkModal(false);
      fetchPresent();
    } catch (err) {
      setMarkError(err.message || "Could not mark attendance.");
    } finally {
      setMarking(false);
    }
  };

  const openStatusModal = (rec) => {
    setStatusRec(rec);
    setStatusNote("");
    setStatusError("");
  };

  const closeStatusModal = () => setStatusRec(null);

  const handleChangeStatus = async (action) => {
    if (action !== "reset" && !statusNote.trim()) {
      setStatusError("A reason is required.");
      return;
    }
    setStatusError("");
    setStatusSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/attendance/${statusRec._id}/regularize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note: statusNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      setRows((prev) => prev.map((r) => (r._id === data.attendance._id ? data.attendance : r)));
      setStatusRec(null);
    } catch (err) {
      setStatusError(err.message || "Could not update status.");
    } finally {
      setStatusSubmitting(false);
    }
  };

  return (
    <div className="present">
      <HomeButton />
      <div className="present__card">
        <div className="present__head">
          <div>
            <h2 className="present__title">{isToday ? "Present Today" : "Present"}</h2>
            <p className="present__sub">{dateLabel}</p>
          </div>
          <div className="present__head-right">
            <input
              type="date"
              className="present__date-input"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <span className="present__count">{rows.length} present</span>
            <button className="present__mark-btn" onClick={openMarkModal}>
              <i className="ti ti-calendar-plus" /> Mark Attendance
            </button>
            <button className="present__refresh" onClick={fetchPresent}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="present__table-wrap">
          {loading ? (
            <p className="present__empty">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="present__empty">
              {isToday ? "No one has punched in yet today." : "No attendance records for this date."}
            </p>
          ) : (
            <table className="present__table">
              <colgroup>
                <col style={{ width: "48px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "80px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "130px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Company</th>
                  <th>Punch In</th>
                  <th>Punch In Location</th>
                  <th>Punch Out</th>
                  <th>Punch Out Location</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Live</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r._id}>
                    <td>{idx + 1}</td>
                    <td className="present__name" title={r.userId?.name || r.userId?.phone || ""}>{r.userId?.name || r.userId?.phone || "—"}</td>
                    <td>{r.userId?.department || "—"}</td>
                    <td>{r.company || "—"}</td>
                    <td>{fmtTime(r.punchIn)}</td>
                    <td className="present__loc" data-tooltip={r.punchInAddress || undefined}>{r.punchInAddress || "—"}</td>
                    <td>{fmtTime(r.punchOut)}</td>
                    <td className="present__loc" data-tooltip={r.punchOutAddress || undefined}>{r.punchOutAddress || "—"}</td>
                    <td>{fmtMins(r.totalMinutes)}</td>
                    <td>
                      <span className={`present__badge present__badge--${r.status}`}>
                        {r.status === "present" ? "Present" : r.status === "half-day" ? "Half Day" : "Absent"}
                      </span>
                    </td>
                    <td>
                      {isOnDuty(r) ? (
                        <button
                          className="present__track-btn"
                          onClick={() =>
                            navigate("/LiveTracking", {
                              state: { userId: r.userId?._id, name: r.userId?.name },
                            })
                          }
                        >
                          <i className="ti ti-map-pin" /> Track
                        </button>
                      ) : (
                        <span className="present__track-off">Off duty</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="present__status-btn"
                        onClick={() => openStatusModal(r)}
                        title="Change attendance status for this record"
                      >
                        <i className="ti ti-pencil" /> Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showMarkModal && (
        <div className="present__modal-backdrop" onClick={closeMarkModal}>
          <div className="present__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="present__modal-icon">
              <i className="ti ti-calendar-plus" aria-hidden="true" />
            </div>
            <h3 className="present__modal-title">Mark attendance</h3>
            <p className="present__modal-sub">
              For an employee who has no record on {selectedDate} yet. To change an existing
              record's status, use the Status button on that row instead.
            </p>

            <div className="present__modal-field">
              <select value={markUserId} onChange={(e) => setMarkUserId(e.target.value)}>
                <option value="">-- Select employee --</option>
                {markableEmployees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name || e.phone} {e.department ? `— ${e.department}` : ""}
                  </option>
                ))}
              </select>
            </div>
            {employees.length > 0 && markableEmployees.length === 0 && (
              <p className="present__modal-note">Everyone already has a record for this date.</p>
            )}

            <div className="present__modal-status-row">
              {["present", "half-day", "absent"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`present__modal-status ${markStatus === s ? "present__modal-status--active" : ""}`}
                  onClick={() => setMarkStatus(s)}
                >
                  {s === "present" ? "Present" : s === "half-day" ? "Half Day" : "Absent"}
                </button>
              ))}
            </div>

            <div className="present__modal-field">
              <textarea
                rows={2}
                placeholder="Reason (e.g. Forgot to punch in, confirmed with employee)"
                value={markNote}
                onChange={(e) => setMarkNote(e.target.value)}
              />
            </div>

            {markError && <p className="present__modal-error">{markError}</p>}

            <div className="present__modal-actions">
              <button className="present__modal-cancel" onClick={closeMarkModal} disabled={marking}>
                Cancel
              </button>
              <button className="present__modal-confirm" onClick={handleMarkAttendance} disabled={marking}>
                {marking ? "Marking…" : "Mark attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusRec && (
        <div className="present__modal-backdrop" onClick={closeStatusModal}>
          <div className="present__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="present__modal-icon">
              <i className="ti ti-pencil" aria-hidden="true" />
            </div>
            <h3 className="present__modal-title">Change status</h3>
            <p className="present__modal-sub">
              {statusRec.userId?.name || statusRec.userId?.phone || "Employee"} — {statusRec.date}
              <br />
              Current:{" "}
              {statusRec.status === "present" ? "Present" : statusRec.status === "half-day" ? "Half Day" : "Absent"}
              {statusRec.regularized && (
                <> · regularized by {statusRec.regularizedBy?.name || "a manager"}</>
              )}
            </p>

            <div className="present__modal-field">
              <textarea
                rows={2}
                placeholder="Reason (required for Present / Half Day)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>

            {statusError && <p className="present__modal-error">{statusError}</p>}

            <div className="present__modal-status-row">
              <button
                type="button"
                className="present__modal-status"
                disabled={statusSubmitting}
                onClick={() => handleChangeStatus("full-day")}
              >
                Present
              </button>
              <button
                type="button"
                className="present__modal-status"
                disabled={statusSubmitting}
                onClick={() => handleChangeStatus("half-day")}
              >
                Half Day
              </button>
              {statusRec.regularized && (
                <button
                  type="button"
                  className="present__modal-status"
                  disabled={statusSubmitting}
                  onClick={() => handleChangeStatus("reset")}
                >
                  Reset
                </button>
              )}
            </div>

            <div className="present__modal-actions">
              <button className="present__modal-cancel" onClick={closeStatusModal} disabled={statusSubmitting}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresentToday;
