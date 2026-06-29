import { useState } from "react";
import "./ManagerDashboard.css";
import logo from "../../../assets/Nutech-removebg-preview.png";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaFileAlt,
  FaCalendarAlt,
  FaHistory,
  FaExclamationCircle,
} from "react-icons/fa";

const ManagerDashboard = () => {
  const today = new Date();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const currentDate = today.toLocaleDateString("en-US", options);

  const [managerName] = useState(() => {
    return localStorage.getItem("managerName") || "Manager";
  });

  const [activeNav, setActiveNav] = useState("dashboard");

  const handleMarkAttendance = () => {
    console.log("Redirect to Mark Attendance page");
  };

  const handleLeaveApplication = () => {
    console.log("Redirect to Leave Application page");
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
    { id: "punch", label: "Punch Attendance", icon: "ti-fingerprint" },
  ];

  const dashboardCards = [
    { id: 1, title: "Present Today", count: 42, icon: <FaCheckCircle />, variant: "present" },
    { id: 2, title: "Absent Today", count: 8, icon: <FaTimesCircle />, variant: "absent" },
    { id: 3, title: "Applied Leaves", count: 15, icon: <FaFileAlt />, variant: "applied" },
    { id: 4, title: "On Leaves", count: 12, icon: <FaCalendarAlt />, variant: "on-leaves" },
    { id: 5, title: "Attendance Records", count: 245, icon: <FaHistory />, variant: "records" },
    { id: 6, title: "Rejected Leaves", count: 5, icon: <FaExclamationCircle />, variant: "rejected" },
  ];

  return (
    <div className="mgr">
      {/* Sidebar */}
      <aside className="mgr__sidebar">
        <div className="mgr__sidebar-logo">
          <img src={logo} alt="Nutech International" />
        </div>

        <nav className="mgr__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={
                activeNav === item.id ? "mgr__nav-item is-active" : "mgr__nav-item"
              }
              onClick={() => setActiveNav(item.id)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mgr__sidebar-footer">
          <span className="mgr__sidebar-tag">Partnering AgEv Research Since 1992</span>
        </div>
      </aside>

      {/* Main area */}
      <main className="mgr__main">
        {/* Header */}
        <header className="mgr__header">
          <div className="mgr__greeting">
            <h1>Hi {managerName}!</h1>
            <p>{currentDate}</p>
          </div>
          <div className="mgr__header-actions">
            <button className="mgr__attendance-btn" onClick={handleMarkAttendance}>
              <i className="ti ti-clock-check" aria-hidden="true" />
              Mark my Attendance
            </button>
            <button className="mgr__leave-btn" onClick={handleLeaveApplication}>
              <i className="ti ti-calendar-plus" aria-hidden="true" />
              Apply for Leave
            </button>
          </div>
        </header>

        {/* Cards */}
        <section className="mgr__cards">
          {dashboardCards.map((card) => (
            <div key={card.id} className={`mgr__card mgr__card--${card.variant}`}>
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
      </main>
    </div>
  );
};

export default ManagerDashboard;
