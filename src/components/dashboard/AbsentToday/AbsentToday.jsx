import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import HomeButton from "../../HomeButton/HomeButton";
import "./AbsentToday.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const todayStr = () => new Date().toISOString().slice(0, 10);

const AbsentToday = () => {
  const navigate          = useNavigate();
  const [absent, setAbsent]   = useState([]);
  const [holiday, setHoliday] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mark Attendance (for an employee with no record at all yet today)
  const [markingUser, setMarkingUser]         = useState(null);
  const [markStatus, setMarkStatus]           = useState("absent");
  const [markPunchInTime, setMarkPunchInTime] = useState("");
  const [markNote, setMarkNote]               = useState("");
  const [markError, setMarkError]             = useState("");
  const [marking, setMarking]                 = useState(false);

  // Change Status (for an employee already explicitly marked absent)
  const [statusRec, setStatusRec]                 = useState(null);
  const [statusNote, setStatusNote]               = useState("");
  const [statusError, setStatusError]             = useState("");
  const [statusSubmitting, setStatusSubmitting]   = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const fetchAbsent = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    setLoading(true);
    try {
      const [usersRes, attRes, holidayRes] = await Promise.all([
        fetch(`${API}/users/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/attendance/all?date=${todayStr()}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/holidays/today`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const usersData   = await usersRes.json();
      const attData     = await attRes.json();
      const holidayData = await holidayRes.json();

      setHoliday(holidayData.holiday || null);

      const records = attData.records || [];

      // A record with status "absent" (manually marked by a manager) means
      // the employee IS absent — it must not count as "has a record, so
      // they're present", or manager-marked absences would silently
      // disappear from this list instead of showing up here.
      const presentIds = new Set(
        records.filter((r) => r.status !== "absent").map((r) => String(r.userId?._id || r.userId))
      );

      // Keep the explicit-absent record alongside each user it belongs to,
      // so already-recorded absences get a "Change Status" action instead of
      // "Mark Attendance" (which would just 409 — a record already exists).
      const absentRecordByUser = new Map(
        records.filter((r) => r.status === "absent").map((r) => [String(r.userId?._id || r.userId), r])
      );

      const absentUsers = (usersData.users || [])
        .filter((u) => !presentIds.has(String(u._id)))
        .map((u) => ({ ...u, existingRecord: absentRecordByUser.get(String(u._id)) || null }));

      setAbsent(absentUsers);
    } catch (err) {
      console.error("AbsentToday fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // Deferred via setTimeout rather than called directly, so the effect
    // itself never synchronously invokes a function that sets state.
    const initialFetch = setTimeout(fetchAbsent, 0);
    const interval = setInterval(fetchAbsent, 30000);
    return () => { clearTimeout(initialFetch); clearInterval(interval); };
  }, [fetchAbsent]);

  const initials = (name, phone) => {
    if (name) return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return phone ? phone.slice(-2) : "??";
  };

  const openMarkModal = (user) => {
    setMarkingUser(user);
    setMarkStatus("absent");
    setMarkPunchInTime("");
    setMarkNote("");
    setMarkError("");
  };
  const closeMarkModal = () => setMarkingUser(null);

  const handleMarkAttendance = async () => {
    if (!markNote.trim()) { setMarkError("A reason is required."); return; }
    setMarkError("");
    setMarking(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: markingUser._id,
          status: markStatus,
          note: markNote.trim(),
          date: todayStr(),
          ...(markStatus !== "absent" && markPunchInTime ? { punchInTime: markPunchInTime } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(data.message);
      setMarkingUser(null);
      fetchAbsent();
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
      setStatusRec(null);
      fetchAbsent();
    } catch (err) {
      setStatusError(err.message || "Could not update status.");
    } finally {
      setStatusSubmitting(false);
    }
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
            <span className="absent__count">{holiday ? 0 : absent.length} absent</span>
            <button className="absent__refresh" onClick={fetchAbsent}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        {holiday && (
          <p className="absent__empty" style={{ padding: "0 0 1rem" }}>
            <i className="ti ti-calendar-star" /> Today is a holiday — {holiday.name}. No one is marked absent.
          </p>
        )}

        <div className="present-table-wrap">
          {holiday ? null : loading ? (
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
                  <th>Actions</th>
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
                    <td>
                      {u.existingRecord ? (
                        <button className="absent__action-btn" onClick={() => openStatusModal(u.existingRecord)}>
                          <i className="ti ti-pencil" /> Change Status
                        </button>
                      ) : (
                        <button className="absent__action-btn" onClick={() => openMarkModal(u)}>
                          <i className="ti ti-calendar-plus" /> Mark Attendance
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {markingUser && (
        <div className="absent__modal-backdrop" onClick={closeMarkModal}>
          <div className="absent__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="absent__modal-icon">
              <i className="ti ti-calendar-plus" aria-hidden="true" />
            </div>
            <h3 className="absent__modal-title">Mark attendance</h3>
            <p className="absent__modal-sub">
              {markingUser.name || markingUser.phone} — {todayStr()}. No record exists for this employee yet today.
            </p>

            <div className="absent__modal-status-row">
              {["present", "half-day", "absent"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`absent__modal-status ${markStatus === s ? "absent__modal-status--active" : ""}`}
                  onClick={() => setMarkStatus(s)}
                >
                  {s === "present" ? "Present" : s === "half-day" ? "Half Day" : "Absent"}
                </button>
              ))}
            </div>

            {markStatus !== "absent" && (
              <div className="absent__modal-field">
                <label className="absent__modal-label">Punch-in time (optional)</label>
                <input
                  type="time"
                  value={markPunchInTime}
                  onChange={(e) => setMarkPunchInTime(e.target.value)}
                />
              </div>
            )}

            <div className="absent__modal-field">
              <textarea
                rows={2}
                placeholder="Reason (e.g. Confirmed on leave by phone, forgot to punch in)"
                value={markNote}
                onChange={(e) => setMarkNote(e.target.value)}
              />
            </div>

            {markError && <p className="absent__modal-error">{markError}</p>}

            <div className="absent__modal-actions">
              <button className="absent__modal-cancel" onClick={closeMarkModal} disabled={marking}>
                Cancel
              </button>
              <button className="absent__modal-confirm" onClick={handleMarkAttendance} disabled={marking}>
                {marking ? "Marking…" : "Mark attendance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusRec && (
        <div className="absent__modal-backdrop" onClick={closeStatusModal}>
          <div className="absent__modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="absent__modal-icon">
              <i className="ti ti-pencil" aria-hidden="true" />
            </div>
            <h3 className="absent__modal-title">Change status</h3>
            <p className="absent__modal-sub">
              {statusRec.userId?.name || statusRec.userId?.phone || "Employee"} — {statusRec.date}
              <br />
              Currently marked Absent
              {statusRec.regularizedBy?.name && <> · by {statusRec.regularizedBy.name}</>}
            </p>

            <div className="absent__modal-field">
              <textarea
                rows={2}
                placeholder="Reason (required for Present / Half Day)"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>

            {statusError && <p className="absent__modal-error">{statusError}</p>}

            <div className="absent__modal-status-row">
              <button
                type="button"
                className="absent__modal-status"
                disabled={statusSubmitting}
                onClick={() => handleChangeStatus("full-day")}
              >
                Present
              </button>
              <button
                type="button"
                className="absent__modal-status"
                disabled={statusSubmitting}
                onClick={() => handleChangeStatus("half-day")}
              >
                Half Day
              </button>
            </div>

            <div className="absent__modal-actions">
              <button className="absent__modal-cancel" onClick={closeStatusModal} disabled={statusSubmitting}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AbsentToday;
