import { useState } from "react";
import { FaFingerprint } from "react-icons/fa";
import "./PunchAttendance.css";

const PunchAttendance = () => {
  const [punchStatus, setPunchStatus] = useState("Punch In");
  const [lastPunch, setLastPunch] = useState(null);
  const [history, setHistory] = useState([]);

  const formatTime = (date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatDate = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handlePunch = () => {
    const now = new Date();
    const nextType = punchStatus === "Punch In" ? "Punch Out" : "Punch In";
    const punch = {
      type: punchStatus,
      time: formatTime(now),
      date: formatDate(now),
    };
    setLastPunch(punch);
    setHistory((prev) => [punch, ...prev].slice(0, 4));
    setPunchStatus(nextType);
  };

  return (
    <div className="punch-attendance">
      <div className="punch-card">
        <div className="punch-header">
          <div className="punch-icon">
            <FaFingerprint />
          </div>
          <div className="punch-text">
            <p className="punch-title">Punch Attendance</p>
            <p className="punch-description">Tap once to record your punch in and punch out times. Your latest entry appears below.</p>
          </div>
        </div>

        <button className="punch-button" onClick={handlePunch}>
          {punchStatus}
        </button>

        <div className="punch-details">
          <div className="punch-details-header">
            <span>Last recorded punch</span>
            <span className="punch-type">{lastPunch ? lastPunch.type : "No record yet"}</span>
          </div>

          {lastPunch ? (
            <>
              <p className="punch-time">{lastPunch.time}</p>
              <p className="punch-date">{lastPunch.date}</p>
            </>
          ) : (
            <p className="punch-empty">Your punch in/out time will appear here after tapping the button.</p>
          )}

          <div className="punch-history">
            {history.length > 0 && <p className="history-label">Recent entries</p>}
            {history.map((entry, index) => (
              <div key={index} className="history-item">
                <span>{entry.type}</span>
                <span>{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PunchAttendance;
``