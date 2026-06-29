import { useState } from "react";
import { FaCalendar } from "react-icons/fa";
import "./AttendanceRecords.css";

const AttendanceRecords = () => {
  const [filterType, setFilterType] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Sample attendance data from database
  const allRecords = [
    { id: 1, name: "John Doe", date: "2026-06-25", checkIn: "09:00 AM", checkOut: "05:00 PM", status: "Present" },
    { id: 2, name: "Jane Smith", date: "2026-06-25", checkIn: "09:15 AM", checkOut: "05:30 PM", status: "Present" },
    { id: 3, name: "Ravi Kumar", date: "2026-06-25", checkIn: "-", checkOut: "-", status: "Absent" },
    { id: 4, name: "John Doe", date: "2026-06-24", checkIn: "09:05 AM", checkOut: "04:55 PM", status: "Present" },
    { id: 5, name: "Jane Smith", date: "2026-06-24", checkIn: "09:10 AM", checkOut: "05:15 PM", status: "Present" },
    { id: 6, name: "Ravi Kumar", date: "2026-06-24", checkIn: "09:20 AM", checkOut: "05:00 PM", status: "Present" },
  ];

  const getFilteredRecords = () => {
    const today = new Date().toISOString().split("T")[0];

    if (filterType === "today") {
      return allRecords.filter((rec) => rec.date === today);
    } else if (filterType === "range") {
      return allRecords.filter((rec) => rec.date >= startDate && rec.date <= endDate);
    } else if (filterType === "year") {
      return allRecords.filter((rec) => rec.date.startsWith(year));
    }

    return allRecords;
  };

  return (
    <div className="attendance-records">
      <div className="present-table-container">
        <div className="table-actions">
          <h2>Attendance Records</h2>
          <p className="table-sub">Filter and view attendance records by date, date range, or year.</p>
        </div>

        {/* Date Filter Section */}
        <div className="date-filter-section">
          <button
            type="button"
            className="date-filter-btn"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <FaCalendar className="calendar-icon" />
            <span>Date</span>
          </button>

          {showDatePicker && (
            <div className="date-picker-menu">
              <div className="filter-option">
                <label className="filter-label">
                  <input
                    type="radio"
                    name="filterType"
                    value="today"
                    checked={filterType === "today"}
                    onChange={() => setFilterType("today")}
                  />
                  Today
                </label>
              </div>

              <div className="filter-option">
                <label className="filter-label">
                  <input
                    type="radio"
                    name="filterType"
                    value="range"
                    checked={filterType === "range"}
                    onChange={() => setFilterType("range")}
                  />
                  Date Range
                </label>
                {filterType === "range" && (
                  <div className="date-range-inputs">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="date-input"
                    />
                    <span className="date-sep">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="date-input"
                    />
                  </div>
                )}
              </div>

              <div className="filter-option">
                <label className="filter-label">
                  <input
                    type="radio"
                    name="filterType"
                    value="year"
                    checked={filterType === "year"}
                    onChange={() => setFilterType("year")}
                  />
                  Year
                </label>
                {filterType === "year" && (
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="year-input"
                    min="2020"
                    max={new Date().getFullYear()}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Records Table */}
        <div className="present-table-wrap">
          <table className="present-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredRecords().map((record) => (
                <tr key={record.id} className={record.status === "Present" ? "present-row" : "absent-row"}>
                  <td>{record.name}</td>
                  <td>{record.date}</td>
                  <td>{record.checkIn}</td>
                  <td>{record.checkOut}</td>
                  <td>
                    <span className={`status-badge ${record.status.toLowerCase()}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceRecords;
