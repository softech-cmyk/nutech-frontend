import { useState } from "react";
import { FaCamera } from "react-icons/fa";
import "./PresentToday.css";

const PresentToday = () => {
  const headers = [
    "Name",
    "Punch In",
    "Punch Out",
    "Time",
    "Location",
    "Selfie",
  ];

  const [rows, setRows] = useState([
    { name: localStorage.getItem("employeeName") || "John Doe", punchIn: "09:15 AM", punchOut: "05:45 PM", time: "08:30", location: "Office - Floor 3", selfie: null },
    { name: "Jane Smith", punchIn: "09:05 AM", punchOut: "05:30 PM", time: "08:25", location: "Remote", selfie: null },
    { name: "Rahul Sharma", punchIn: "09:00 AM", punchOut: "06:00 PM", time: "09:00", location: "Office - Floor 2", selfie: null },
    { name: "Priya Patel", punchIn: "08:55 AM", punchOut: "05:50 PM", time: "08:55", location: "Office - Floor 1", selfie: null },
    { name: "Amit Verma", punchIn: "09:20 AM", punchOut: "05:40 PM", time: "08:20", location: "Remote", selfie: null },
    { name: "Sneha Iyer", punchIn: "09:10 AM", punchOut: "06:10 PM", time: "09:00", location: "Office - Floor 3", selfie: null },
    { name: "Vikram Singh", punchIn: "08:45 AM", punchOut: "05:30 PM", time: "08:45", location: "Office - Floor 2", selfie: null },
    { name: "Anjali Gupta", punchIn: "09:30 AM", punchOut: "06:15 PM", time: "08:45", location: "Remote", selfie: null },
    { name: "Karan Mehta", punchIn: "09:05 AM", punchOut: "05:55 PM", time: "08:50", location: "Office - Floor 1", selfie: null },
    { name: "Pooja Reddy", punchIn: "08:50 AM", punchOut: "05:45 PM", time: "08:55", location: "Office - Floor 3", selfie: null },
    { name: "Rohan Joshi", punchIn: "09:15 AM", punchOut: "06:05 PM", time: "08:50", location: "Remote", selfie: null },
    { name: "Neha Kapoor", punchIn: "09:00 AM", punchOut: "05:35 PM", time: "08:35", location: "Office - Floor 2", selfie: null },
    { name: "Arjun Nair", punchIn: "08:40 AM", punchOut: "05:25 PM", time: "08:45", location: "Office - Floor 1", selfie: null },
    { name: "Divya Menon", punchIn: "09:25 AM", punchOut: "06:20 PM", time: "08:55", location: "Remote", selfie: null },
    { name: "Sanjay Rao", punchIn: "09:10 AM", punchOut: "05:50 PM", time: "08:40", location: "Office - Floor 3", selfie: null },
    { name: "Meera Desai", punchIn: "08:58 AM", punchOut: "06:00 PM", time: "09:02", location: "Office - Floor 2", selfie: null },
    { name: "Aditya Kumar", punchIn: "09:12 AM", punchOut: "05:48 PM", time: "08:36", location: "Remote", selfie: null },
    { name: "Ritu Agarwal", punchIn: "08:52 AM", punchOut: "05:42 PM", time: "08:50", location: "Office - Floor 1", selfie: null },
  ]);

  const handleSelfieChange = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setRows((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], selfie: e.target.result };
        return copy;
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="present">
      <div className="present__card">
        <div className="present__head">
          <h2 className="present__title">Present Today</h2>
          <p className="present__sub">
            Spreadsheet-style view — you can fetch rows from the API later.
          </p>
        </div>

        <div className="present__table-wrap">
          <table className="present__table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td className="present__name">{r.name}</td>
                  <td>{r.punchIn}</td>
                  <td>{r.punchOut}</td>
                  <td>{r.time}</td>
                  <td>{r.location}</td>
                  <td>
                    {r.selfie ? (
                      <img
                        src={r.selfie}
                        alt="selfie"
                        className="present__selfie"
                      />
                    ) : (
                      <label className="present__upload">
                        <FaCamera />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleSelfieChange(idx, e.target.files[0])
                          }
                          className="present__file"
                        />
                      </label>
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

export default PresentToday;