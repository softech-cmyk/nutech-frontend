import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import logo from "../../../assets/Nutech-removebg-preview.png";
import "./PunchAttendance.css";

const employeeNav = [
  { id: "dashboard",  label: "Dashboard",        icon: "ti-layout-dashboard", path: "/EmployeeDashboard"     },
  { id: "punch",      label: "Punch Attendance", icon: "ti-fingerprint",      path: "/PunchAttendance"        },
  { id: "attendance", label: "My Attendance",    icon: "ti-calendar-check",   path: "/AttendanceRecords"      },
  { id: "leave",      label: "Apply Leave",      icon: "ti-calendar-plus",    path: "/LeaveApplicationButton" },
];

const managerNav = [
  { id: "dashboard",  label: "Dashboard",          icon: "ti-layout-dashboard", path: "/managerdashboard"   },
  { id: "punch",      label: "Punch Attendance",   icon: "ti-fingerprint",      path: "/PunchAttendance"    },
  { id: "present",    label: "Present Today",      icon: "ti-user-check",       path: "/PresentToday"       },
  { id: "absent",     label: "Absent Today",       icon: "ti-user-x",           path: "/AbsentToday"        },
  { id: "leaves",     label: "Applied Leaves",     icon: "ti-calendar-event",   path: "/LeavesApplied"      },
  { id: "onleaves",   label: "On Leaves",          icon: "ti-calendar-check",   path: "/AcceptedLeaves"     },
  { id: "records",    label: "Attendance Records", icon: "ti-history",          path: "/AttendanceRecords"  },
  { id: "rejected",   label: "Rejected Leaves",    icon: "ti-calendar-x",       path: "/RejectedLeaves"     },
];

const API      = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/attendance`;
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MAP_STYLE = { width: "100%", height: "260px", borderRadius: "16px" };

const getLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, enableHighAccuracy: true }
    );
  });

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
  const [punchIn, setPunchIn]         = useState(null);
  const [punchOut, setPunchOut]       = useState(null);
  const [punchInLoc, setPunchInLoc]         = useState(null);
  const [punchOutLoc, setPunchOutLoc]       = useState(null);
  const [punchInAddress, setPunchInAddress] = useState(null);
  const [punchOutAddress, setPunchOutAddress] = useState(null);
  const [livePos, setLivePos]               = useState(null);
  const [status, setStatus]           = useState("not-started");
  const [dayStatus, setDayStatus]     = useState(null); // "present" | "half-day"
  const [lateNotice, setLateNotice]   = useState(null);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [activeMarker, setActiveMarker] = useState(null);
  const watchRef = useRef(null);

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
        if (attendance.punchIn)  setPunchIn(new Date(attendance.punchIn));
        if (attendance.punchOut) setPunchOut(new Date(attendance.punchOut));
        if (attendance.punchInLocation?.lat)  setPunchInLoc(attendance.punchInLocation);
        if (attendance.punchOutLocation?.lat) setPunchOutLoc(attendance.punchOutLocation);
        if (attendance.punchInAddress)        setPunchInAddress(attendance.punchInAddress);
        if (attendance.punchOutAddress)       setPunchOutAddress(attendance.punchOutAddress);
        if (attendance.punchIn && !attendance.punchOut) setStatus("on-duty");
        if (attendance.punchOut) setStatus("off-duty");
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

  // watch live location while on-duty
  useEffect(() => {
    if (status === "on-duty" && navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => setLivePos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [status]);

  const fmt = (d) =>
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtShort = (d) =>
    d ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const calcHours = () => {
    if (!punchIn || !punchOut) return "—";
    const ms = punchOut - punchIn;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const handlePunch = async () => {
    const token = localStorage.getItem("token");
    if (!token) { setError("Please log in first."); return; }
    setLoading(true);
    setError("");

    try {
      const loc     = await getLocation();
      const address = loc ? await reverseGeocode(loc.lat, loc.lng) : null;
      const payload = { ...(loc || {}), ...(address ? { address } : {}) };

      if (status === "not-started") {
        const res  = await fetch(`${API}/punch-in`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setPunchIn(new Date(data.attendance.punchIn));
        if (loc)     setPunchInLoc(loc);
        if (address) setPunchInAddress(address);
        setStatus("on-duty");
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

      } else if (status === "on-duty") {
        const res  = await fetch(`${API}/punch-out`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setPunchOut(new Date(data.attendance.punchOut));
        if (loc)     setPunchOutLoc(loc);
        if (address) setPunchOutAddress(address);
        setStatus("off-duty");
        setDayStatus(data.attendance.status);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = punchInLoc || livePos || { lat: 28.6139, lng: 77.2090 };

  const today = time.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const handleLogout = () => {
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
        <div className="pa__sidebar-logo">
          <img src={logo} alt="Nutech" />
        </div>
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

        {status !== "off-duty" && (
          <button
            className={`pa__btn ${status === "on-duty" ? "pa__btn--out" : "pa__btn--in"}`}
            onClick={handlePunch}
            disabled={loading}
          >
            <i className={`ti ${status === "on-duty" ? "ti-logout" : "ti-login"}`} />
            {loading ? "Please wait…" : status === "on-duty" ? "Punch Out" : "Punch In"}
          </button>
        )}

        {status === "off-duty" && (
          <p className="pa__done"><i className="ti ti-check" /> Attendance marked for today</p>
        )}

        <div className="pa__info">
          <div className="pa__info-box">
            <span className="pa__info-label">Punch In</span>
            <span className="pa__info-value">{fmtShort(punchIn)}</span>
          </div>
          <div className="pa__info-divider" />
          <div className="pa__info-box">
            <span className="pa__info-label">Punch Out</span>
            <span className="pa__info-value">{fmtShort(punchOut)}</span>
          </div>
          <div className="pa__info-divider" />
          <div className="pa__info-box">
            <span className="pa__info-label">Total Hours</span>
            <span className="pa__info-value">{calcHours()}</span>
          </div>
        </div>

        {/* Google Map */}
        <div className="pa__map-wrap">
          <p className="pa__map-label">
            <i className="ti ti-map-pin" />
            {status === "not-started" && "Location will appear after punch in"}
            {status === "on-duty"     && "Live Location — On Duty"}
            {status === "off-duty"    && "Punch In & Out Locations"}
          </p>

          {/* Address pills */}
          {(punchInAddress || punchOutAddress) && (
            <div className="pa__addresses">
              {punchInAddress && (
                <div className="pa__address pa__address--in">
                  <i className="ti ti-map-pin" /> <strong>In:</strong> {punchInAddress}
                </div>
              )}
              {punchOutAddress && (
                <div className="pa__address pa__address--out">
                  <i className="ti ti-map-pin" /> <strong>Out:</strong> {punchOutAddress}
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
              {punchInLoc && (
                <Marker
                  position={punchInLoc}
                  title="Punch In"
                  onClick={() => setActiveMarker("in")}
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
                  }}
                >
                  {activeMarker === "in" && (
                    <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                      <div style={{ color: "#166534", fontWeight: 700 }}>
                        Punch In<br />{fmtShort(punchIn)}
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              )}

              {/* Punch Out marker — red */}
              {punchOutLoc && (
                <Marker
                  position={punchOutLoc}
                  title="Punch Out"
                  onClick={() => setActiveMarker("out")}
                  icon={{
                    url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  }}
                >
                  {activeMarker === "out" && (
                    <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                      <div style={{ color: "#991b1b", fontWeight: 700 }}>
                        Punch Out<br />{fmtShort(punchOut)}
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
