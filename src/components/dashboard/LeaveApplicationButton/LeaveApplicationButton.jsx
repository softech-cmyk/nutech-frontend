import { useState } from "react";
import { FaCalendar, FaPaperPlane } from "react-icons/fa";
import "./LeaveApplicationButton.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const LeaveApplicationButton = () => {
  const [reason, setReason]         = useState("");
  const [leaveDate, setLeaveDate]   = useState(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [leaveType, setLeaveType]   = useState("CL");
  const [error, setError]           = useState("");

  const leaveTypes = ["CL", "SL", "EL", "PWL"];

  const handleSend = async () => {
    if (!reason.trim() || !leaveDate) { setError("Please fill in all fields."); return; }
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res  = await fetch(`${API}/leaves/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leaveType, reason, leaveDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubmitted(true);
      setTimeout(() => {
        setReason("");
        setLeaveDate(new Date().toISOString().split("T")[0]);
        setLeaveType("CL");
        setSubmitted(false);
      }, 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="leave-application">
      <div className="application-container">
        <div className="app-header">
          <h2>Apply for Leave</h2>
          <p className="app-sub">Submit your leave request with date and reason.</p>
        </div>

        {error && <p style={{ color: "#ef4444", padding: "0 1rem", fontSize: "0.88rem" }}>{error}</p>}
        <div className="form-section">
          {/* Leave Type */}
          <div className="form-group">
            <label className="form-label">Leave Type</label>
            <div className="leave-type-options">
              {leaveTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={leaveType === type ? "leave-pill active" : "leave-pill"}
                  onClick={() => setLeaveType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea
              className="form-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter your reason for leave"
              rows={5}
            />
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label className="form-label">Leave Date</label>
            <div className="date-picker-wrapper">
              <button
                type="button"
                className="date-input-btn"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <FaCalendar className="calendar-icon" />
                <span>{leaveDate}</span>
              </button>

              {showDatePicker && (
                <div className="date-picker-popup">
                  <input
                    type="date"
                    value={leaveDate}
                    onChange={(e) => {
                      setLeaveDate(e.target.value);
                      setShowDatePicker(false);
                    }}
                    className="date-picker-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Send Button */}
          <div className="form-actions">
            <button
              type="button"
              className={submitted ? "send-btn submitted" : "send-btn"}
              onClick={handleSend}
              disabled={submitted}
            >
              <FaPaperPlane className="send-icon" />
              <span>{submitted ? "Submitted" : "Send"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveApplicationButton;
