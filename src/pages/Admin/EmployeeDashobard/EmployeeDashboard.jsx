import { useState } from "react";
import "./EmployeeDashboard.css";
import logo from "../../../assets/Nutech-removebg-preview.png";

const EmployeeDashboard = () => {
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const dateOptions = ["Today", "Date to Another One", "Last Month and Year"];
  const [selectedOption, setSelectedOption] = useState(dateOptions[0]);
  const [employeeName] = useState(
    () => localStorage.getItem("employeeName") || "User"
  );
  const [datePanelOpen, setDatePanelOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [yearOption, setYearOption] = useState(String(today.getFullYear()));
  const [activeNav, setActiveNav] = useState("dashboard");

  const years = Array.from({ length: 6 }, (_, index) =>
    String(today.getFullYear() - index)
  );

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
    { id: "punch", label: "Punch Attendance", icon: "ti-fingerprint" },
  ];

  const weeklyStatus = [
    { day: "Mon", label: "Present" },
    { day: "Tue", label: "Present" },
    { day: "Wed", label: "Absent" },
    { day: "Thu", label: "Present" },
    { day: "Fri", label: "Present" },
    { day: "Sat", label: "Weekend" },
    { day: "Sun", label: "Weekend" },
  ];

  const handleMarkAttendance = () => {
    console.log("Mark my Attendance clicked");
  };

  const handleLeaveApplication = () => {
    console.log("Redirect to Leave Application page");
  };

  return (
    <div className="emp">
      {/* Sidebar */}
      <aside className="emp__sidebar">
        <div className="emp__sidebar-logo">
          <img src={logo} alt="Nutech International" />
        </div>

        <nav className="emp__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={
                activeNav === item.id ? "emp__nav-item is-active" : "emp__nav-item"
              }
              onClick={() => setActiveNav(item.id)}
            >
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="emp__sidebar-footer">
          <span className="emp__sidebar-tag">
            Partnering AgEv Research Since 1992
          </span>
        </div>
      </aside>

      {/* Main */}
      <main className="emp__main">
        <div className="emp__top">
          <div>
            <p className="emp__welcome">Hi! {employeeName}</p>
            <p className="emp__subtitle">
              Happy to have you here — let’s keep your attendance tidy.
            </p>
          </div>
          <div className="emp__header-actions">
            <button className="emp__attendance-btn" onClick={handleMarkAttendance}>
              <i className="ti ti-clock-check" aria-hidden="true" />
              Mark my Attendance
            </button>
            <button className="emp__leave-btn" onClick={handleLeaveApplication}>
              <i className="ti ti-calendar-plus" aria-hidden="true" />
              Apply for Leave
            </button>
          </div>
        </div>

        <div className="emp__date-section">
          <div className="emp__today-row">
            <div>
              <span className="emp__today-label">Today</span>
              <button
                className="emp__today-button"
                onClick={() => setDatePanelOpen((prev) => !prev)}
              >
                {todayLabel}
              </button>
            </div>

            <div className="emp__date-options">
              {dateOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    option === selectedOption
                      ? "emp__date-option is-active"
                      : "emp__date-option"
                  }
                  onClick={() => setSelectedOption(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {datePanelOpen && (
            <div className="emp__date-panel">
              <div className="emp__date-panel-row">
                <label>
                  From
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </label>
                <label>
                  Year
                  <select
                    value={yearOption}
                    onChange={(e) => setYearOption(e.target.value)}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="emp__weekly">
          <p className="emp__section-label">Weekly attendance overview</p>
          <div className="emp__weekly-days">
            {weeklyStatus.map((item) => (
              <div key={item.day} className="emp__day-card">
                <span className="emp__day-name">{item.day}</span>
                <span className={`emp__day-label ${item.label.toLowerCase()}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
