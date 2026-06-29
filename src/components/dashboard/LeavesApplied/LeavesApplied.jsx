import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import "./LeavesApplied.css";

const LeavesApplied = () => {
  const [requests, setRequests] = useState([
    { name: "John Doe", reason: "Family emergency", date: "2026-06-24", status: "Pending" },
    { name: "Jane Smith", reason: "Medical appointment", date: "2026-06-24", status: "Pending" },
    { name: "Ravi Kumar", reason: "Travel delay", date: "2026-06-24", status: "Pending" },
  ]);

  const updateStatus = (index, status) => {
    setRequests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status };
      return next;
    });
  };

  const resetStatus = (index) => {
    setRequests((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status: "Pending" };
      return next;
    });
  };

  return (
    <div className="leaves-applied">
      <div className="present-table-container">
        <div className="table-actions">
          <h2>Leaves Applied</h2>
          <p className="table-sub">Review leave requests and approve or cancel them from the same theme.</p>
        </div>

        <div className="present-table-wrap">
          <table className="present-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Option</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request, index) => (
                <tr
                  key={index}
                  className={request.status === "Approved" ? "approved-row" : request.status === "Unapproved" ? "unapproved-row" : "pending-row"}
                >
                  <td>{request.name}</td>
                  <td>{request.reason}</td>
                  <td>{request.date}</td>
                  <td>
                    {request.status === "Pending" ? (
                      <div className="action-buttons">
                        <button type="button" className="tick-btn" onClick={() => updateStatus(index, "Approved")}> 
                          <FaCheck className="action-icon" />
                        </button>
                        <button type="button" className="cancel-btn" onClick={() => updateStatus(index, "Unapproved")}> 
                          <FaTimes className="action-icon" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`status-badge ${request.status.toLowerCase()}`}
                        onClick={() => resetStatus(index)}
                      >
                        {request.status}
                      </span>
                    )}
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

export default LeavesApplied;
