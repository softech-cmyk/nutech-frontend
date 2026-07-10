import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TractorLoader from "../../../components/TractorLoader/TractorLoader";
import HomeButton from "../../../components/HomeButton/HomeButton";
import { disconnectSocket } from "../../../utils/socket";
import "./ManagerDashboard.css";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaFileAlt,
  FaCalendarAlt,
  FaHistory,
  FaExclamationCircle,
} from "react-icons/fa";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const todayStr = () => new Date().toISOString().slice(0, 10);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const [managerName, setManagerName] = useState("Manager");
  const [activeNav, setActiveNav]     = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [holiday, setHoliday] = useState(null);
  const [counts, setCounts]           = useState({
    present: 0,
    absent: 0,
    totalEmployees: 0,
    records: 0,
    appliedLeaves: 0,
    onLeaves: 0,
    rejectedLeaves: 0,
  });

  const today       = new Date();
  const currentDate = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }

    try {
      // Fetch manager info
      const meRes  = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.user?.name) setManagerName(meData.user.name);

      // Fetch team attendance for today
      const [todayRes, recordsRes, leavesRes, holidayRes] = await Promise.all([
        fetch(`${API}/attendance/all?date=${todayStr()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/attendance/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/leaves/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/holidays/today`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const todayData    = await todayRes.json();
      const recordsData  = await recordsRes.json();
      const leavesData   = await leavesRes.json();
      const holidayData  = await holidayRes.json();

      setHoliday(holidayData.holiday || null);

      const presentCount   = todayData.records?.length || 0;
      const totalEmployees = meData.user ? await fetchEmployeeCount(token) : 0;
      const absentCount    = holidayData.holiday ? 0 : Math.max(0, totalEmployees - presentCount);
      const totalRecords   = recordsData.records?.length || 0;
      const pendingLeaves  = (leavesData.leaves || []).filter((l) => l.status === "pending").length;
      const approvedLeaves = (leavesData.leaves || []).filter((l) => l.status === "approved").length;
      const rejectedLeaves = (leavesData.leaves || []).filter((l) => l.status === "rejected").length;

      setCounts({
        present: presentCount,
        absent: absentCount,
        totalEmployees,
        records: totalRecords,
        appliedLeaves: pendingLeaves,
        onLeaves: approvedLeaves,
        rejectedLeaves,
      });
    } catch (err) {
      console.error("Dashboard fetch error:", err.message);
    } finally {
      setInitialLoading(false);
    }
  }, [navigate]);

  const fetchEmployeeCount = async (token) => {
    try {
      const res  = await fetch(`${API}/users/my-employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.employees?.length || 0;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 60 seconds for real-time updates
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const navItems = [
    { id: "dashboard",  label: "Dashboard",          icon: "ti-layout-dashboard", path: "/managerdashboard" },
    { id: "employees",  label: "Employees",           icon: "ti-users",           path: "/Employees"        },
    { id: "add-employee", label: "Add Employee",     icon: "ti-user-plus",       path: "/CreateEmployee"   },
    { id: "punch",      label: "Punch Attendance",   icon: "ti-fingerprint",      path: "/PunchAttendance"  },
    { id: "live",       label: "Live Tracking",      icon: "ti-map-pin",          path: "/LiveTracking"     },
    { id: "present",    label: "Present Today",      icon: "ti-user-check",       path: "/PresentToday"     },
    { id: "absent",     label: "Absent Today",       icon: "ti-user-x",           path: "/AbsentToday"      },
    { id: "leaves",     label: "Applied Leaves",     icon: "ti-calendar-event",   path: "/LeavesApplied"    },
    { id: "onleaves",   label: "Leave Reports",      icon: "ti-calendar-check",   path: "/AcceptedLeaves"   },
    { id: "records",    label: "Attendance Records", icon: "ti-history",          path: "/AttendanceRecords" },
    { id: "rejected",   label: "Rejected Leaves",   icon: "ti-calendar-x",       path: "/RejectedLeaves"    },
    { id: "holidays",   label: "Holidays",           icon: "ti-calendar-star",    path: "/Holidays"          },
  ];

  const dashboardCards = [
    { id: 1, title: "Present Today",       count: counts.present, icon: <FaCheckCircle />,     variant: "present"   },
    { id: 2, title: "Absent Today",        count: counts.absent,  icon: <FaTimesCircle />,     variant: "absent"    },
    { id: 3, title: "Applied Leaves",      count: counts.appliedLeaves, icon: <FaFileAlt />, variant: "applied"   },
    { id: 4, title: "Leave Reports",       count: counts.onLeaves, icon: <FaCalendarAlt />,     variant: "on-leaves" },
    { id: 5, title: "Attendance Records",  count: counts.records, icon: <FaHistory />,          variant: "records"   },
    { id: 6, title: "Rejected Leaves",     count: counts.rejectedLeaves, icon: <FaExclamationCircle />, variant: "rejected" },
  ];

  const handleClearData = async () => {
    if (!window.confirm("Clear today's attendance AND all leave records?")) return;
    const token = localStorage.getItem("token");
    await Promise.all([
      fetch(`${API}/attendance/clear-today`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/leaves/clear-all`,       { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
    ]);
    fetchData();
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <div className="mgr">
      <HomeButton />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="mgr__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`mgr__sidebar ${sidebarOpen ? "mgr__sidebar--open" : ""}`}>
        <button className="mgr__sidebar-close" onClick={() => setSidebarOpen(false)}>
          <i className="ti ti-x" />
        </button>

        <nav className="mgr__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={activeNav === item.id ? "mgr__nav-item is-active" : "mgr__nav-item"}
              onClick={() => { setActiveNav(item.id); navigate(item.path); setSidebarOpen(false); }}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mgr__sidebar-footer">
          <span className="mgr__sidebar-tag">Partnering AgEv Research Since 1992</span>
          <button className="mgr__logout" onClick={handleLogout}>
            <i className="ti ti-logout" /> Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="mgr__main">
        {/* Header */}
        <header className="mgr__header">
          <div className="mgr__greeting">
            <button className="mgr__hamburger" onClick={() => setSidebarOpen(true)}>
              <i className="ti ti-menu-2" />
            </button>
            <h1>{getGreeting()}, {managerName}!</h1>
            <p>{currentDate}</p>
          </div>

          <div className="mgr__tractor-scene" aria-hidden="true">
            <svg viewBox="0 0 220 110" className="mgr__tractor-svg">
              {/* field */}
              <rect x="0" y="92" width="220" height="18" fill="#bbf7d0" />
              {[10, 26, 42, 58, 74, 90, 106, 122, 138, 154, 170, 186, 202].map((x) => (
                <line key={x} x1={x} y1="92" x2={x} y2="82" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
              ))}

              {/* smoke */}
              <circle className="mgr__smoke mgr__smoke--1" cx="100" cy="34" r="4" fill="#cbd5e1" />
              <circle className="mgr__smoke mgr__smoke--2" cx="100" cy="34" r="4" fill="#cbd5e1" />
              <circle className="mgr__smoke mgr__smoke--3" cx="100" cy="34" r="4" fill="#cbd5e1" />

              {/* tractor */}
              <g className="mgr__tractor-body">
                <rect x="96" y="38" width="6" height="20" rx="2" fill="#64748b" />
                <rect x="55" y="74" width="70" height="8" rx="3" fill="#1a2e1c" />
                <rect x="88" y="56" width="52" height="20" rx="4" fill="#0369a1" />
                <rect x="30" y="42" width="34" height="34" rx="5" fill="#15803d" />
                <rect x="36" y="48" width="22" height="16" rx="2" fill="#bae6fd" />

                <g className="mgr__wheel mgr__wheel--rear">
                  <circle cx="58" cy="84" r="19" fill="#1a2e1c" />
                  <circle cx="58" cy="84" r="8" fill="#4ade80" />
                  <line x1="58" y1="65" x2="58" y2="103" stroke="#166534" strokeWidth="2" />
                  <line x1="39" y1="84" x2="77" y2="84" stroke="#166534" strokeWidth="2" />
                  <line x1="45" y1="71" x2="71" y2="97" stroke="#166534" strokeWidth="2" />
                  <line x1="71" y1="71" x2="45" y2="97" stroke="#166534" strokeWidth="2" />
                </g>

                <g className="mgr__wheel mgr__wheel--front">
                  <circle cx="132" cy="88" r="11" fill="#1a2e1c" />
                  <circle cx="132" cy="88" r="4.5" fill="#38bdf8" />
                  <line x1="132" y1="77" x2="132" y2="99" stroke="#0369a1" strokeWidth="1.5" />
                  <line x1="121" y1="88" x2="143" y2="88" stroke="#0369a1" strokeWidth="1.5" />
                </g>
              </g>
            </svg>
          </div>

          <div className="mgr__header-actions">
            <button className="mgr__attendance-btn" onClick={() => navigate("/PunchAttendance")}>
              <i className="ti ti-clock-check" aria-hidden="true" />
              Mark my Attendance
            </button>
            <button className="mgr__leave-btn" onClick={() => navigate("/LeaveApplicationButton")}>
              <i className="ti ti-calendar-plus" aria-hidden="true" />
              Apply for Leave
            </button>
          </div>
        </header>

        {holiday && (
          <div className="mgr__holiday-banner">
            <i className="ti ti-calendar-star" aria-hidden="true" />
            Today is a holiday — {holiday.name}. Attendance is not affected.
          </div>
        )}

        {/* Cards */}
        {initialLoading ? (
          <TractorLoader label="Loading dashboard..." />
        ) : (
          <section className="mgr__cards">
            {dashboardCards.map((card) => (
              <div
                key={card.id}
                className={`mgr__card mgr__card--${card.variant} mgr__card--clickable`}
                onClick={
                  card.id === 1 ? () => navigate("/PresentToday") :
                  card.id === 2 ? () => navigate("/AbsentToday") :
                  card.id === 3 ? () => navigate("/LeavesApplied") :
                  card.id === 4 ? () => navigate("/AcceptedLeaves") :
                  card.id === 5 ? () => navigate("/AttendanceRecords") :
                  card.id === 6 ? () => navigate("/RejectedLeaves") :
                  undefined
                }
              >
                <div className={`mgr__card-icon mgr__card-icon--${card.variant}`}>
                  {card.icon}
                </div>
                <div className="mgr__card-content">
                  <p className="mgr__card-title">{card.title}</p>
                  <h2 className="mgr__card-count">{card.count}</h2>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default ManagerDashboard;
