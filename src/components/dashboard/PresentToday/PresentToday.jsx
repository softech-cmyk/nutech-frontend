import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

const PresentToday = () => {
  const navigate          = useNavigate();
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const fetchPresent = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res  = await fetch(`${API}/attendance/all?date=${todayStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRows(data.records || []);
    } catch (err) {
      console.error("PresentToday fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchPresent();
    const interval = setInterval(fetchPresent, 30000);
    return () => clearInterval(interval);
  }, [fetchPresent]);

  return (
    <div className="present">
      <HomeButton />
      <div className="present__card">
        <div className="present__head">
          <div>
            <h2 className="present__title">Present Today</h2>
            <p className="present__sub">{today}</p>
          </div>
          <div className="present__head-right">
            <span className="present__count">{rows.length} present</span>
            <button className="present__refresh" onClick={fetchPresent}>
              <i className="ti ti-refresh" /> Refresh
            </button>
          </div>
        </div>

        <div className="present__table-wrap">
          {loading ? (
            <p className="present__empty">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="present__empty">No one has punched in yet today.</p>
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

export default PresentToday;
