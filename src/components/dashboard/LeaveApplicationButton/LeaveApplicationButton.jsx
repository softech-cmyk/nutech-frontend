import { useState, useEffect, useCallback } from "react";
import { FaCalendar, FaPaperPlane } from "react-icons/fa";
import HomeButton from "../../HomeButton/HomeButton";
import "./LeaveApplicationButton.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;
const CL_ANNUAL_QUOTA = 12;

const todayStr = () => new Date().toISOString().split("T")[0];
const daysInRange = (start, end) => Math.round((new Date(end) - new Date(start)) / 86400000) + 1;
const leaveUnits = (l) => (l.isHalfDay ? 0.5 : daysInRange(l.startDate, l.endDate));

const LeaveApplicationButton = () => {
  const [reason, setReason]         = useState("");
  const [startDate, setStartDate]   = useState(todayStr());
  const [endDate, setEndDate]       = useState(todayStr());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [leaveType, setLeaveType]   = useState("CL");
  const [isHalfDay, setIsHalfDay]   = useState(false);
  const [error, setError]           = useState("");
  const [clUsed, setClUsed]         = useState(0);

  const leaveTypes = ["CL", "SL", "EL", "PWL"];
  const clQuotaReached = clUsed >= CL_ANNUAL_QUOTA;

  const fetchClUsage = useCallback(async () => {
    const token = localStorage.getItem("token");
    const year  = new Date().getFullYear();
    try {
      const res  = await fetch(`${API}/leaves/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const used = (data.leaves || [])
        .filter((l) => l.leaveType === "CL" && l.status !== "rejected" && l.startDate?.startsWith(String(year)))
        .reduce((sum, l) => sum + leaveUnits(l), 0);
      setClUsed(used);
      setLeaveType((prev) => (prev === "CL" && used >= CL_ANNUAL_QUOTA ? "SL" : prev));
    } catch {
      // ignore — quota display is a convenience, not a hard gate
    }
  }, []);

  useEffect(() => {
    fetchClUsage();
  }, [fetchClUsage]);

  const handleSend = async () => {
    if (!reason.trim() || !startDate || !endDate) { setError("Please fill in all fields."); return; }
    if (startDate > endDate) { setError("Start date must be on or before end date."); return; }
    if (isHalfDay && startDate !== endDate) { setError("A half-day leave must be for a single date."); return; }
    if (leaveType === "CL" && clQuotaReached) {
      setError(`You've used all ${CL_ANNUAL_QUOTA} Casual Leave (CL) days for this year.`);
      return;
    }
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res  = await fetch(`${API}/leaves/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leaveType, reason, startDate, endDate: isHalfDay ? startDate : endDate, isHalfDay }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSubmitted(true);
      fetchClUsage();
      setTimeout(() => {
        setReason("");
        setStartDate(todayStr());
        setEndDate(todayStr());
        setLeaveType("CL");
        setIsHalfDay(false);
        setSubmitted(false);
      }, 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="leave-application">
      <HomeButton />
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
              {leaveTypes.map((type) => {
                const disabled = type === "CL" && clQuotaReached;
                return (
                  <button
                    key={type}
                    type="button"
                    className={leaveType === type ? "leave-pill active" : "leave-pill"}
                    onClick={() => setLeaveType(type)}
                    disabled={disabled}
                    title={disabled ? `CL quota (${CL_ANNUAL_QUOTA}/year) used up` : undefined}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            <p className={`leave-cl-quota ${clQuotaReached ? "leave-cl-quota--full" : ""}`}>
              CL used this year: {clUsed}/{CL_ANNUAL_QUOTA}
              {clQuotaReached && " — quota reached"}
            </p>
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

          {/* Date Range Picker */}
          <div className="form-group">
            <label className="form-label">From</label>
            <div className="date-picker-wrapper">
              <button
                type="button"
                className="date-input-btn"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <FaCalendar className="calendar-icon" />
                <span>{startDate}</span>
              </button>

              {showDatePicker && (
                <div className="date-picker-popup">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStartDate(value);
                      if (isHalfDay || endDate < value) setEndDate(value);
                      setShowDatePicker(false);
                    }}
                    className="date-picker-input"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Half Day toggle */}
          <div className="form-group">
            <label className="leave-halfday-toggle">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsHalfDay(checked);
                  if (checked) setEndDate(startDate);
                }}
              />
              <span>Half Day (single date only, counts as 0.5 day)</span>
            </label>
          </div>

          {!isHalfDay && (
            <div className="form-group">
              <label className="form-label">To</label>
              <div className="date-picker-wrapper">
                <button
                  type="button"
                  className="date-input-btn"
                  onClick={() => setShowEndDatePicker(!showEndDatePicker)}
                >
                  <FaCalendar className="calendar-icon" />
                  <span>{endDate}</span>
                </button>

                {showEndDatePicker && (
                  <div className="date-picker-popup">
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setShowEndDatePicker(false);
                      }}
                      className="date-picker-input"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

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
