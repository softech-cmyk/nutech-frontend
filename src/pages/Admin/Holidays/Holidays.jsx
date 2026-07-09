import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TractorLoader from "../../../components/TractorLoader/TractorLoader";
import HomeButton from "../../../components/HomeButton/HomeButton";
import "./Holidays.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });

const Holidays = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isManager = user?.role === "manager";

  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchHolidays = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/Login"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/holidays?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setHolidays(data.holidays || []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load holidays.");
    } finally {
      setLoading(false);
    }
  }, [navigate, year]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  const upcoming = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return holidays.filter((h) => h.date >= todayStr).length;
  }, [holidays]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!date || !name.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/holidays`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Added ${data.holiday.name} on ${formatDate(data.holiday.date)}.`);
      setDate("");
      setName("");
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || "Could not add holiday.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (holiday) => {
    if (!window.confirm(`Remove "${holiday.name}" (${formatDate(holiday.date)}) from the holiday list?`)) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/holidays/${holiday._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`Removed "${holiday.name}".`);
      setHolidays((prev) => prev.filter((h) => h._id !== holiday._id));
    } catch (err) {
      toast.error(err.message || "Could not remove holiday.");
    }
  };

  return (
    <div className="hols">
      <HomeButton />
      <header className="hols__header">
        <div>
          <h1>Holiday calendar</h1>
          <p>{holidays.length} holiday(s) in {year} · {upcoming} upcoming</p>
        </div>
        <select className="hols__year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </header>

      <p className="hols__note">
        <i className="ti ti-info-circle" aria-hidden="true" />
        Employees are not marked absent on these dates — punching in is optional.
      </p>

      {isManager && (
        <form className="hols__add" onSubmit={handleAdd}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Holiday name (e.g. Diwali)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button type="submit" disabled={saving}>
            <i className="ti ti-plus" aria-hidden="true" /> {saving ? "Adding…" : "Add holiday"}
          </button>
        </form>
      )}

      {error && (
        <div className="hols__error">
          <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
        </div>
      )}

      {loading ? (
        <div className="hols__table-wrap">
          <TractorLoader label="Loading holidays..." />
        </div>
      ) : holidays.length === 0 ? (
        <div className="hols__table-wrap">
          <div className="hols__empty">
            <i className="ti ti-calendar-off" aria-hidden="true" />
            <p>No holidays added for {year} yet.</p>
          </div>
        </div>
      ) : (
        <div className="hols__table-wrap">
          <table className="hols__table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                {isManager && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h._id}>
                  <td>{formatDate(h.date)}</td>
                  <td className="hols__name">{h.name}</td>
                  {isManager && (
                    <td>
                      <button className="hols__delete-btn" onClick={() => handleDelete(h)}>
                        <i className="ti ti-trash" aria-hidden="true" /> Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Holidays;
