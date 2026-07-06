import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import "./AttendanceRecords.css";

const API      = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MAP_STYLE = { width: "100%", height: "340px", borderRadius: "12px" };

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

const LocationModal = ({ rec, onClose }) => {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: MAPS_KEY });
  const [activeMarker, setActiveMarker] = useState(null);

  const inLoc  = rec.punchInLocation?.lat  ? rec.punchInLocation  : null;
  const outLoc = rec.punchOutLocation?.lat ? rec.punchOutLocation : null;
  const center = inLoc || outLoc || { lat: 28.6139, lng: 77.2090 };

  return (
    <div className="ar__modal-backdrop" onClick={onClose}>
      <div className="ar__modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar__modal-header">
          <div>
            <h3>{rec.userId?.name || rec.userId?.phone || "Employee"}</h3>
            <p>{rec.date} &nbsp;·&nbsp; {fmtTime(rec.punchIn)} – {fmtTime(rec.punchOut)}</p>
          </div>
          <button className="ar__modal-close" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="ar__modal-legend">
          <span className="ar__legend ar__legend--in">● Punch In</span>
          <span className="ar__legend ar__legend--out">● Punch Out</span>
        </div>

        {isLoaded ? (
          <GoogleMap mapContainerStyle={MAP_STYLE} center={center} zoom={15}>
            {inLoc && (
              <Marker
                position={inLoc}
                onClick={() => setActiveMarker("in")}
                icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
              >
                {activeMarker === "in" && (
                  <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                    <div style={{ fontWeight: 700, color: "#166534" }}>
                      Punch In<br />{fmtTime(rec.punchIn)}
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            )}
            {outLoc && (
              <Marker
                position={outLoc}
                onClick={() => setActiveMarker("out")}
                icon={{ url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" }}
              >
                {activeMarker === "out" && (
                  <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                    <div style={{ fontWeight: 700, color: "#991b1b" }}>
                      Punch Out<br />{fmtTime(rec.punchOut)}
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            )}
          </GoogleMap>
        ) : (
          <div className="ar__map-loading">Loading map…</div>
        )}

        {!inLoc && !outLoc && (
          <p className="ar__modal-no-loc">No location data recorded for this entry.</p>
        )}
      </div>
    </div>
  );
};

const RegularizeModal = ({ rec, onClose, onUpdated }) => {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const runAction = async (action) => {
    setSubmitting(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/attendance/${rec._id}/regularize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdated(data.attendance);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ar__modal-backdrop" onClick={onClose}>
      <div className="ar__modal" onClick={(e) => e.stopPropagation()}>
        <div className="ar__modal-header">
          <div>
            <h3>Regularize attendance</h3>
            <p>{rec.userId?.name || rec.userId?.phone || "Employee"} &nbsp;·&nbsp; {rec.date}</p>
          </div>
          <button className="ar__modal-close" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>

        <div className="ar__reg-current">
          Current status:{" "}
          <span className={`ar__status-badge ${rec.status}`}>
            {rec.status === "present" ? "Present" : rec.status === "half-day" ? "Half Day" : "Absent"}
          </span>
          {rec.regularized && (
            <span className="ar__reg-tag" title={rec.regularizationNote || ""}>
              <i className="ti ti-pencil" /> Already regularized by {rec.regularizedBy?.name || "a manager"}
            </span>
          )}
        </div>

        <label className="ar__reg-label" htmlFor="reg-note">Reason (optional)</label>
        <textarea
          id="reg-note"
          className="ar__reg-note"
          rows={2}
          placeholder="e.g. Approved late arrival, client visit before office…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <p className="ar__reg-error"><i className="ti ti-alert-circle" /> {error}</p>}

        <div className="ar__reg-actions">
          <button className="ar__reg-btn ar__reg-btn--full" disabled={submitting} onClick={() => runAction("full-day")}>
            <i className="ti ti-circle-check" /> Mark Full Day
          </button>
          <button className="ar__reg-btn ar__reg-btn--half" disabled={submitting} onClick={() => runAction("half-day")}>
            <i className="ti ti-circle-half-2" /> Mark Half Day
          </button>
          {rec.regularized && (
            <button className="ar__reg-btn ar__reg-btn--reset" disabled={submitting} onClick={() => runAction("reset")}>
              <i className="ti ti-refresh" /> Reset to Automatic
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const AttendanceRecords = () => {
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState("today");
  const [startDate, setStartDate]   = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate]       = useState(new Date().toISOString().slice(0, 10));
  const [yearInput, setYearInput]   = useState(String(new Date().getFullYear()));
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [records, setRecords]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedRec, setSelectedRec] = useState(null);
  const [regularizingRec, setRegularizingRec] = useState(null);

  const handleRegularized = (updated) => {
    setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
  };

  const fetchRecords = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    setLoading(true);
    try {
      let url = `${API}/attendance/all?`;
      if (filterType === "today") {
        url += `date=${new Date().toISOString().slice(0, 10)}`;
      } else if (filterType === "range") {
        url += `startDate=${startDate}&endDate=${endDate}`;
      } else if (filterType === "year") {
        url += `year=${activeYear}`;
      }

      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error("Failed to fetch records:", err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, startDate, endDate, activeYear, navigate]);

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  return (
    <div className="attendance-records">
      <div className="present-table-container">
        <div className="table-actions">
          <div>
            <h2>Attendance Records</h2>
            <p className="table-sub">Real-time attendance data from the database.</p>
          </div>
          <button className="ar__refresh-btn" onClick={fetchRecords}>
            <i className="ti ti-refresh" /> Refresh
          </button>
        </div>

        {/* Date Filter */}
        <div className="ar__filter">
          <div className="ar__filter-tabs">
            <button
              className={`ar__tab ${filterType === "today" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("today")}
            >
              <i className="ti ti-calendar-today" /> Today
            </button>
            <button
              className={`ar__tab ${filterType === "range" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("range")}
            >
              <i className="ti ti-calendar-event" /> Date Range
            </button>
            <button
              className={`ar__tab ${filterType === "year" ? "ar__tab--active" : ""}`}
              onClick={() => setFilterType("year")}
            >
              <i className="ti ti-calendar-stats" /> Year
            </button>
          </div>

          {filterType === "range" && (
            <div className="ar__range-inputs">
              <input type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="ar__date-input" />
              <span className="ar__date-sep">→</span>
              <input type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="ar__date-input" />
            </div>
          )}

          {filterType === "year" && (
            <div className="ar__range-inputs">
              <input
                type="number"
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="ar__date-input ar__year-input"
                min="2020"
                max={new Date().getFullYear()}
                placeholder="e.g. 2026"
              />
              <button
                className="ar__apply-btn"
                onClick={() => {
                  const y = parseInt(yearInput);
                  if (!isNaN(y) && y >= 2020 && y <= new Date().getFullYear()) setActiveYear(y);
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="present-table-wrap">
          {loading ? (
            <p className="ar__loading">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="ar__empty">No attendance records found.</p>
          ) : (
            <table className="present-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => {
                  const rowClass =
                    rec.status === "present" ? "present-row" :
                    rec.status === "half-day" ? "half-day-row" : "absent-row";

                  return (
                    <tr key={rec._id} className={rowClass}>
                      <td>{i + 1}</td>
                      <td className="ar__name-cell">{rec.userId?.name || rec.userId?.phone || "—"}</td>
                      <td>{rec.company || "—"}</td>
                      <td>{rec.date}</td>
                      <td>{fmtTime(rec.punchIn)}</td>
                      <td>{fmtTime(rec.punchOut)}</td>
                      <td>{fmtMins(rec.totalMinutes)}</td>
                      <td className="ar__status-cell">
                        <span className={`ar__status-badge ${rec.status}`}>
                          {rec.status === "present" ? "Present" : rec.status === "half-day" ? "Half Day" : "Absent"}
                        </span>
                        {rec.regularized && (
                          <span
                            className="ar__reg-dot"
                            title={`Regularized by ${rec.regularizedBy?.name || "a manager"}${rec.regularizationNote ? ` — ${rec.regularizationNote}` : ""}`}
                          >
                            <i className="ti ti-pencil" />
                          </span>
                        )}
                      </td>
                      <td className="ar__actions-cell">
                        <div className="ar__actions-inner">
                          <button className="ar__loc-btn" onClick={() => setSelectedRec(rec)} title="View on map">
                            <i className="ti ti-map-pin" />
                          </button>
                          <button className="ar__loc-btn" onClick={() => setRegularizingRec(rec)} title="Regularize attendance">
                            <i className="ti ti-pencil" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedRec && (
        <LocationModal rec={selectedRec} onClose={() => setSelectedRec(null)} />
      )}

      {regularizingRec && (
        <RegularizeModal
          rec={regularizingRec}
          onClose={() => setRegularizingRec(null)}
          onUpdated={handleRegularized}
        />
      )}
    </div>
  );
};

export default AttendanceRecords;
