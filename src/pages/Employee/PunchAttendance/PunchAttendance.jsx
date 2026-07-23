import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { getSocket, disconnectSocket } from "../../../utils/socket";
import "./PunchAttendance.css";

const employeeNav = [
  { id: "dashboard",  label: "Dashboard",        icon: "ti-layout-dashboard", path: "/EmployeeDashboard"     },
  { id: "punch",      label: "Punch Attendance", icon: "ti-fingerprint",      path: "/PunchAttendance"        },
  { id: "attendance", label: "My Attendance",    icon: "ti-calendar-check",   path: "/AttendanceRecords"      },
  { id: "leave",      label: "Apply Leave",      icon: "ti-calendar-plus",    path: "/LeaveApplicationButton" },
  { id: "holidays",   label: "Holidays",         icon: "ti-calendar-star",    path: "/Holidays"                },
];

const managerNav = [
  { id: "dashboard",  label: "Dashboard",          icon: "ti-layout-dashboard", path: "/managerdashboard"   },
  { id: "punch",      label: "Punch Attendance",   icon: "ti-fingerprint",      path: "/PunchAttendance"    },
  { id: "live",       label: "Live Tracking",      icon: "ti-map-pin",          path: "/LiveTracking"       },
  { id: "present",    label: "Present Today",      icon: "ti-user-check",       path: "/PresentToday"       },
  { id: "absent",     label: "Absent Today",       icon: "ti-user-x",           path: "/AbsentToday"        },
  { id: "leaves",     label: "Applied Leaves",     icon: "ti-calendar-event",   path: "/LeavesApplied"      },
  { id: "onleaves",   label: "Leave Reports",      icon: "ti-calendar-check",   path: "/AcceptedLeaves"     },
  { id: "records",    label: "Attendance Records", icon: "ti-history",          path: "/AttendanceRecords"  },
  { id: "rejected",   label: "Rejected Leaves",    icon: "ti-calendar-x",       path: "/RejectedLeaves"     },
  { id: "holidays",   label: "Holidays",           icon: "ti-calendar-star",    path: "/Holidays"           },
];

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const API      = `${API_BASE}/attendance`;
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MAP_STYLE = { width: "100%", height: "260px", borderRadius: "16px" };

// Resolves { coords, reason } — coords is null on failure, and reason explains
// why (so the UI can tell the employee something actionable instead of just
// silently punching them in with no location on record).
const getLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({ coords: null, reason: "unsupported" }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, reason: null }),
      () => {
        // A fresh high-accuracy fix can fail or time out on back-to-back
        // punches (common for punch-out right after punch-in) — fall back to
        // a coarser, faster lookup rather than sending no location at all.
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ coords: { lat: pos.coords.latitude, lng: pos.coords.longitude }, reason: null }),
          (err) => resolve({ coords: null, reason: err.code === 1 ? "denied" : "unavailable" }),
          { timeout: 8000, enableHighAccuracy: false, maximumAge: 60000 }
        );
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  });

const LOCATION_WARNINGS = {
  unsupported: "This browser doesn't support location — your manager won't be able to verify where you punched in from.",
  denied: "Location permission is blocked for this site. Enable it in your browser's site settings so your manager can verify your location.",
  unavailable: "Couldn't get a location fix (weak GPS signal or timeout) — your punch was still recorded, but without a location.",
};

const reverseGeocode = async (lat, lng) => {
  try {
    const token = localStorage.getItem("token");
    const res   = await fetch(`${API}/geocode?lat=${lat}&lng=${lng}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data  = await res.json();
    return data.address || null;
  } catch {
    return null;
  }
};

const PunchAttendance = () => {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const navItems = user.role === "manager" ? managerNav : employeeNav;
  const homePath = user.role === "manager" ? "/managerdashboard" : "/EmployeeDashboard";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime]               = useState(new Date());
  const [sessions, setSessions]       = useState([]); // today's punch in/out cycles
  const [totalMinutes, setTotalMinutes] = useState(null);
  const [livePos, setLivePos]               = useState(null);
  const [dayStatus, setDayStatus]     = useState(null); // "present" | "half-day"
  const [lateNotice, setLateNotice]   = useState(null);
  const [error, setError]             = useState("");
  const [locationWarning, setLocationWarning] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [activeMarker, setActiveMarker] = useState(null);
  const [holiday, setHoliday] = useState(null);
  const watchRef = useRef(null);

  // Derived from sessions — an employee can punch in/out multiple times a
  // day, so "status" is really just "is there an open session right now".
  const lastSession = sessions[sessions.length - 1] || null;
  const openSession  = !!(lastSession && !lastSession.punchOut);
  const status = sessions.length === 0 ? "not-started" : openSession ? "on-duty" : "off-duty";

  const { isLoaded } = useLoadScript({ googleMapsApiKey: MAPS_KEY });

  // live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // load today's record
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(({ attendance }) => {
        if (!attendance) return;
        setSessions(attendance.sessions || []);
        if (attendance.totalMinutes != null) setTotalMinutes(attendance.totalMinutes);
        if (attendance.status) setDayStatus(attendance.status);
        if (attendance.lateArrival) {
          setLateNotice(
            attendance.lateRebateApplied
              ? "Late arrival — forgiven under this month's rebate."
              : "Late arrival — marked half-day (monthly rebate already used up)."
          );
        }
      })
      .catch(() => {});
  }, []);

  // check whether today is a holiday
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/holidays/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(({ holiday }) => setHoliday(holiday || null))
      .catch(() => {});
  }, []);

  // watch live location while on-duty, and push it to managers over the socket
  useEffect(() => {
    if (status === "on-duty" && navigator.geolocation) {
      const socket = getSocket();
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLivePos(coords);
          socket.emit("location:update", coords);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    } else {
      getSocket().emit("location:stop");
    }
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [status]);

  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtShort = (iso) =>
    iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const calcHours = () => {
    if (totalMinutes == null) return "—";
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };
  const sessionDuration = (s) => {
    if (!s.punchOut) return "in progress";
    const mins = Math.floor((new Date(s.punchOut) - new Date(s.punchIn)) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const handlePunch = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Please log in first."); return; }
    setLoading(true);
    setError("");
    setLocationWarning(null);

    try {
      const { coords: loc, reason } = await getLocation();
      if (!loc) setLocationWarning(LOCATION_WARNINGS[reason] || LOCATION_WARNINGS.unavailable);
      const address = loc ? await reverseGeocode(loc.lat, loc.lng) : null;
      const payload = { ...(loc || {}), ...(address ? { address } : {}) };

      if (!openSession) {
        const res  = await fetch(`${API}/punch-in`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSessions(data.attendance.sessions || []);
        setDayStatus(data.attendance.status);
        if (data.attendance.lateArrival) {
          setLateNotice(
            data.attendance.lateRebateApplied
              ? `Late arrival — rebate applied (${data.lateRebatesUsed}/3 used this month). Today still counts as present if you complete your hours.`
              : "Late arrival — this month's 3 rebate days are already used, so today is marked half-day."
          );
        } else {
          setLateNotice(null);
        }

      } else {
        const res  = await fetch(`${API}/punch-out`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setSessions(data.attendance.sessions || []);
        setTotalMinutes(data.attendance.totalMinutes);
        setDayStatus(data.attendance.status);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasLoc = (loc) => loc?.lat != null && loc?.lng != null;
  const inLoc  = hasLoc(lastSession?.punchInLocation)  ? lastSession.punchInLocation  : null;
  const outLoc = hasLoc(lastSession?.punchOutLocation) ? lastSession.punchOutLocation : null;
  const mapCenter = inLoc || livePos || { lat: 28.6139, lng: 77.2090 };

  const today = time.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <div className="pa">

      {/* Overlay */}
      {sidebarOpen && (
        <div className="pa__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`pa__sidebar ${sidebarOpen ? "pa__sidebar--open" : ""}`}>
        <button className="pa__sidebar-close" onClick={() => setSidebarOpen(false)}>
          <i className="ti ti-x" />
        </button>
        <nav className="pa__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`pa__nav-item ${item.path === "/PunchAttendance" ? "is-active" : ""}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              <i className={`ti ${item.icon}`} />
              {item.label}
            </button>
          ))}
        </nav>
        <button className="pa__nav-logout" onClick={handleLogout}>
          <i className="ti ti-logout" /> Logout
        </button>
      </aside>

      {/* Main content */}
      <div className="pa__content">
        {/* Top bar with hamburger */}
        <div className="pa__topbar">
          <button className="pa__hamburger" onClick={() => setSidebarOpen(true)}>
            <i className="ti ti-menu-2" />
          </button>
          <span className="pa__topbar-title">Punch Attendance</span>
          <button className="pa__topbar-back" onClick={() => navigate(homePath)}>
            <i className="ti ti-arrow-left" /> Back
          </button>
        </div>

      <div className="pa__card">

        <div className="pa__header">
          <h1 className="pa__title">Punch Attendance</h1>
          <p className="pa__date">{today}</p>
        </div>

        {holiday && (
          <p className="pa__notice">
            <i className="ti ti-calendar-star" /> Today is a holiday — {holiday.name}. You don't need to punch in.
          </p>
        )}

        <div className="pa__clock">{fmt(time)}</div>

        <div className={`pa__badge pa__badge--${status}`}>
          {status === "not-started" && <><i className="ti ti-circle" /> Not Started</>}
          {status === "on-duty"     && <><i className="ti ti-circle-check" /> On Duty</>}
          {status === "off-duty"    && <><i className="ti ti-circle-off" /> Off Duty</>}
        </div>

        {dayStatus === "half-day" && (
          <div className="pa__badge pa__badge--half-day">
            <i className="ti ti-clock-exclamation" /> Half-day
          </div>
        )}

        {lateNotice && (
          <p className={lateNotice.includes("already used") ? "pa__error" : "pa__notice"}>
            <i className="ti ti-info-circle" /> {lateNotice}
          </p>
        )}

        {error && <p className="pa__error">{error}</p>}

        {locationWarning && (
          <p className="pa__notice">
            <i className="ti ti-map-pin-off" /> {locationWarning}
          </p>
        )}

        <button
          className={`pa__btn ${openSession ? "pa__btn--out" : "pa__btn--in"}`}
          onClick={handlePunch}
          disabled={loading}
        >
          <i className={`ti ${openSession ? "ti-logout" : "ti-login"}`} />
          {loading ? "Please wait…" : openSession ? "Punch Out" : sessions.length > 0 ? "Punch In Again" : "Punch In"}
        </button>

        {status === "off-duty" && (
          <p className="pa__done">
            <i className="ti ti-check" /> Stepped out? You can punch in again any time today.
          </p>
        )}

        <div className="pa__info">
          <div className="pa__info-box">
            <span className="pa__info-label">First Punch In</span>
            <span className="pa__info-value">{fmtShort(sessions[0]?.punchIn)}</span>
          </div>
          <div className="pa__info-divider" />
          <div className="pa__info-box">
            <span className="pa__info-label">Last Punch Out</span>
            <span className="pa__info-value">{openSession ? "—" : fmtShort(lastSession?.punchOut)}</span>
          </div>
          <div className="pa__info-divider" />
          <div className="pa__info-box">
            <span className="pa__info-label">Total Hours</span>
            <span className="pa__info-value">{calcHours()}</span>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="pa__sessions">
            <p className="pa__sessions-title"><i className="ti ti-list-details" /> Today's sessions</p>
            <ul className="pa__sessions-list">
              {sessions.map((s, idx) => (
                <li key={idx} className="pa__session-row">
                  <span className="pa__session-num">{idx + 1}</span>
                  <span>{fmtShort(s.punchIn)} → {s.punchOut ? fmtShort(s.punchOut) : "in progress"}</span>
                  <span className="pa__session-dur">{sessionDuration(s)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Google Map */}
        <div className="pa__map-wrap">
          <p className="pa__map-label">
            <i className="ti ti-map-pin" />
            {status === "not-started" && "Location will appear after punch in"}
            {status === "on-duty"     && "Live Location — On Duty"}
            {status === "off-duty"    && "Latest Punch In & Out Locations"}
          </p>

          {/* Address pills */}
          {(lastSession?.punchInAddress || lastSession?.punchOutAddress) && (
            <div className="pa__addresses">
              {lastSession?.punchInAddress && (
                <div className="pa__address pa__address--in">
                  <i className="ti ti-map-pin" /> <strong>In:</strong> {lastSession.punchInAddress}
                </div>
              )}
              {lastSession?.punchOutAddress && (
                <div className="pa__address pa__address--out">
                  <i className="ti ti-map-pin" /> <strong>Out:</strong> {lastSession.punchOutAddress}
                </div>
              )}
            </div>
          )}

          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={MAP_STYLE}
              center={mapCenter}
              zoom={15}
              options={{ disableDefaultUI: false, zoomControl: true }}
            >
              {/* Punch In marker — green */}
              {inLoc && (
                <Marker
                  position={inLoc}
                  title="Punch In"
                  onClick={() => setActiveMarker("in")}
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                  }}
                >
                  {activeMarker === "in" && (
                    <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                      <div style={{ color: "#166534", fontWeight: 700 }}>
                        Punch In<br />{fmtShort(lastSession.punchIn)}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              )}

              {/* Punch Out marker — red */}
              {outLoc && (
                <Marker
                  position={outLoc}
                  title="Punch Out"
                  onClick={() => setActiveMarker("out")}
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  }}
                >
                  {activeMarker === "out" && (
                    <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                      <div style={{ color: "#991b1b", fontWeight: 700 }}>
                        Punch Out<br />{fmtShort(lastSession.punchOut)}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              )}

              {/* Live location marker — blue (while on duty) */}
              {status === "on-duty" && livePos && (
                <Marker
                  position={livePos}
                  title="Your current location"
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  }}
                />
              )}
            </GoogleMap>
          ) : (
            <div className="pa__map-loading">Loading map…</div>
          )}
        </div>

      </div>
      </div>{/* pa__content */}
    </div>
  );
};

export default PunchAttendance;
