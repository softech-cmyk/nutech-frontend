import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HomeButton from "../../../components/HomeButton/HomeButton";
import "./EmployeeDashboard.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const fmtTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

// "HH:mm" -> minutes since midnight
const shiftMinutes = (hhmm, fallback) => {
  const [h, m] = (hhmm || fallback).split(":").map(Number);
  return h * 60 + m;
};

// "HH:mm" -> "10:00 AM"
const fmtShiftTime = (hhmm) => {
  if (!hhmm) return "--:--";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const timeToPercent = (iso, shiftStart, shiftEnd) => {
  const d = new Date(iso);
  const mins  = d.getHours() * 60 + d.getMinutes();
  const start = shiftMinutes(shiftStart, "10:00");
  const end   = shiftMinutes(shiftEnd, "18:30");
  return Math.max(0, Math.min(100, ((mins - start) / (end - start)) * 100));
};

const navItems = [
  { id: "dashboard",  label: "Dashboard",        icon: "ti-layout-dashboard", path: "/EmployeeDashboard"      },
  { id: "punch",      label: "Punch Attendance", icon: "ti-fingerprint",      path: "/PunchAttendance"         },
  { id: "attendance", label: "My Attendance",    icon: "ti-calendar-check",   path: "/AttendanceRecords"       },
  { id: "leave",      label: "Apply Leave",      icon: "ti-calendar-plus",    path: "/LeaveApplicationButton"  },
  { id: "holidays",   label: "Holidays",         icon: "ti-calendar-star",    path: "/Holidays"                },
];

const EmployeeDashboard = () => {
  const navigate   = useNavigate();
  const [activeNav, setActiveNav]   = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser]             = useState(null);
  const [manager, setManager]       = useState(null);
  const [todayAtt, setTodayAtt]     = useState(null);
  const [latestLeave, setLatestLeave] = useState(null);
  const today = new Date();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    // fetch fresh user data from DB (picks up name, managerId, role)
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) { navigate("/Login"); return; }
        const u = d.user;
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));

        if (u.managerId) {
          fetch(`${API}/users/${u.managerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((md) => setManager(md.user || null))
            .catch(() => {});
        }
      })
      .catch(() => navigate("/Login"));

    // fetch today's attendance
    fetch(`${API}/attendance/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTodayAtt(d.attendance || null))
      .catch(() => {});

    // fetch this employee's most recent leave request
    fetch(`${API}/leaves/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setLatestLeave((d.leaves || [])[0] || null))
      .catch(() => {});
  }, [navigate]);

  const initials = (name, phone) => {
    if (name) return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    return phone ? phone.slice(-2) : "??";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <div className="ed">
      <HomeButton />
      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="ed__drawer-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`ed__sidebar ${sidebarOpen ? "ed__sidebar--open" : ""}`}>
        <button className="ed__sidebar-close" onClick={() => setSidebarOpen(false)}>
          <i className="ti ti-x" />
        </button>

        <nav className="ed__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`ed__nav-item ${activeNav === item.id ? "is-active" : ""}`}
              onClick={() => { setActiveNav(item.id); navigate(item.path); setSidebarOpen(false); }}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <button className="ed__logout" onClick={handleLogout}>
          <i className="ti ti-logout" aria-hidden="true" /> Logout
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="ed__main">
        <div className="ed__overlay">

          {/* Header */}
          <div className="ed__header">
            <div>
              <button className="ed__hamburger" onClick={() => setSidebarOpen(true)}>
                <i className="ti ti-menu-2" />
              </button>
              <p className="ed__greeting">{getGreeting()}, {user?.name || user?.phone || "Employee"}</p>
              <p className="ed__sub">Have a productive day at Nutech</p>
            </div>
            <div className="ed__header-right">
              <div className="ed__header-date">
                <i className="ti ti-calendar" />
                {today.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <button className="ed__mark-btn" onClick={() => navigate("/PunchAttendance")}>
                <i className="ti ti-fingerprint" /> Mark my Attendance
              </button>
              <button className="ed__leave-btn" onClick={() => navigate("/LeaveApplicationButton")}>
                <i className="ti ti-calendar-plus" /> Apply for Leave
              </button>
            </div>
          </div>

          {/* Cards row */}
          <div className="ed__cards">

            {/* Employee profile card */}
            <div className="ed__card ed__card--profile">
              <div className="ed__avatar">
                {user?.photo
                  ? <img src={user.photo} alt="profile" />
                  : <span>{initials(user?.name, user?.phone)}</span>
                }
              </div>
              <div className="ed__card-info">
                <p className="ed__card-name">{user?.name || "—"}</p>
                <p className="ed__card-phone">{user?.phone || "—"}</p>
                <span className="ed__badge ed__badge--emp">Employee</span>
              </div>
            </div>

            {/* Manager card — only show if manager exists */}
            {manager && (
              <div className="ed__card ed__card--manager">
                <div className="ed__card-label">
                  <i className="ti ti-briefcase" /> Department
                </div>
                <div className="ed__avatar ed__avatar--sm">
                  <span>{initials(manager.name, manager.phone)}</span>
                </div>
                <div className="ed__card-info">
                  <p className="ed__card-name">{manager.name || manager.phone}</p>
                  <p className="ed__card-dept">
                    <i className="ti ti-building" /> {manager.department || "—"}
                  </p>
                  <span className="ed__badge ed__badge--mgr">Manager</span>
                </div>
              </div>
            )}

            {/* Department card */}
            <div className="ed__card ed__card--dept">
              <div className="ed__card-label">
                <i className="ti ti-building" /> Department
              </div>
              <p className="ed__dept-name">{user?.department || "—"}</p>
              <p className="ed__dept-sub">Your assigned department</p>
            </div>

            {/* Leave status card */}
            <div className="ed__card ed__card--leave">
              <div className="ed__card-label">
                <i className="ti ti-calendar-event" /> Leave Status
              </div>
              {latestLeave ? (
                <>
                  <span className={`ed__leave-status ed__leave-status--${latestLeave.status}`}>
                    {latestLeave.status.charAt(0).toUpperCase() + latestLeave.status.slice(1)}
                  </span>
                  <p className="ed__leave-meta">
                    {latestLeave.leaveType}
                    {latestLeave.isHalfDay
                      ? ` (${latestLeave.halfDaySession === "first-half" ? "First Half" : "Second Half"}${latestLeave.halfDayTime ? `, ${latestLeave.halfDayTime}` : ""})`
                      : ""} &middot; {latestLeave.startDate}
                    {latestLeave.startDate !== latestLeave.endDate ? ` → ${latestLeave.endDate}` : ""}
                  </p>
                  {latestLeave.status === "rejected" && (
                    <div className="ed__leave-reason">
                      <i className="ti ti-message-circle" />
                      {latestLeave.rejectionReason || "No reason provided by the manager."}
                    </div>
                  )}
                </>
              ) : (
                <p className="ed__card-none">No leave requests yet</p>
              )}
            </div>

          </div>


          {/* Today's Schedule */}
          <div className="ed__schedule">
            <div className="ed__schedule-head">
              <span className="ed__section-title">
                <i className="ti ti-clock" /> Today's Schedule
              </span>
              <span className="ed__schedule-time">{fmtShiftTime(user?.shiftStart)} – {fmtShiftTime(user?.shiftEnd)}</span>
            </div>

            <div className="ed__today-row">

              {/* Date block */}
              <div className="ed__today-date">
                <span className="ed__today-day">
                  {today.toLocaleDateString("en-US", { weekday: "long" })}
                </span>
                <span className="ed__today-num">
                  {today.getDate()}
                </span>
                <span className="ed__today-month">
                  {today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>

              {/* Timeline */}
              <div className="ed__timeline">
                <div className="ed__tl-ends">
                  <span>{fmtShiftTime(user?.shiftStart)}</span>
                  <span>Office Hours</span>
                  <span>{fmtShiftTime(user?.shiftEnd)}</span>
                </div>

                <div className="ed__tl-track">
                  <div className="ed__tl-fill" />

                  {todayAtt?.punchIn && (
                    <div className="ed__tl-point" style={{ left: `${timeToPercent(todayAtt.punchIn, user?.shiftStart, user?.shiftEnd)}%` }}>
                      <div className="ed__tl-dot ed__tl-dot--in" />
                      <span className="ed__tl-point-label">
                        {fmtTime(todayAtt.punchIn)}<br />In
                      </span>
                    </div>
                  )}

                  {todayAtt?.punchOut && (
                    <div className="ed__tl-point" style={{ left: `${timeToPercent(todayAtt.punchOut, user?.shiftStart, user?.shiftEnd)}%` }}>
                      <div className="ed__tl-dot ed__tl-dot--out" />
                      <span className="ed__tl-point-label">
                        {fmtTime(todayAtt.punchOut)}<br />Out
                      </span>
                    </div>
                  )}
                </div>

                {!todayAtt?.punchIn && (
                  <p className="ed__tl-hint">Not punched in yet</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
