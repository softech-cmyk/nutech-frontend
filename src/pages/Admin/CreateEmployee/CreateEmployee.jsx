import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HomeButton from "../../../components/HomeButton/HomeButton";
import "./CreateEmployee.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

const DEPARTMENTS = [
  "Operations",
  "Sales",
  "Support",
  "Service Engineering",
  "Information Technology",
  "Accounts",
];

const COMPANIES = ["Nutech International", "SPL Technologies"];

// "HH:mm" -> "10:00 AM"
const fmtTime = (hhmm) => {
  if (!hhmm) return "—";
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const countries = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
];

const CreateEmployee = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("employee");
  const [company, setCompany] = useState("Nutech International");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shiftStart, setShiftStart] = useState("10:00");
  const [shiftEnd, setShiftEnd] = useState("18:30");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || user?.role !== "manager") {
      navigate("/Login");
    }
  }, [navigate]);

  const resetForm = () => {
    setName("");
    setPhoneNumber("");
    setDepartment("");
    setRole("employee");
    setCompany("Nutech International");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShiftStart("10:00");
    setShiftEnd("18:30");
    setResult(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department) { setError("Please select a department."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!shiftStart || !shiftEnd) { setError("Please set the employee's working hours."); return; }
    if (shiftEnd <= shiftStart) { setError("Shift end time must be after the start time."); return; }
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/create-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone: phoneNumber, countryCode, department, role, company, password, shiftStart, shiftEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResult({
        name: data.user.name, phone: data.user.phone, countryCode: data.user.countryCode,
        shiftStart: data.user.shiftStart, shiftEnd: data.user.shiftEnd,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="cemp">
        <HomeButton />
        <div className="cemp__card">
          <div className="cemp__result-icon"><i className="ti ti-circle-check" aria-hidden="true" /></div>
          <h1 className="cemp__title">Account created</h1>
          <p className="cemp__subtitle">
            {result.name}'s account is ready — share the phone number and the password you set with them.
          </p>

          <div className="cemp__result-row">
            <span>Phone</span>
            <strong>{result.countryCode} {result.phone}</strong>
          </div>
          <div className="cemp__result-row">
            <span>Working hours</span>
            <strong>{fmtTime(result.shiftStart)} – {fmtTime(result.shiftEnd)}</strong>
          </div>

          <button type="button" className="cemp__secondary" onClick={resetForm}>
            Create another employee
          </button>
          <button type="button" className="cemp__secondary" onClick={() => navigate("/managerdashboard")}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cemp">
      <HomeButton />
      <div className="cemp__card">
        <h1 className="cemp__title">Create employee account</h1>
        <p className="cemp__subtitle">Only managers can create accounts. Set the employee's password yourself below.</p>

        {error && (
          <div className="cemp__error">
            <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="cemp__label" htmlFor="company">Company</label>
          <div className="cemp__field">
            <i className="ti ti-building-skyscraper cemp__field-icon" aria-hidden="true" />
            <select id="company" className="cemp__select" value={company} onChange={(e) => setCompany(e.target.value)}>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <label className="cemp__label">Role</label>
          <div className="cemp__role-row">
            <button type="button" className={`cemp__role-btn ${role === "employee" ? "cemp__role-btn--active" : ""}`} onClick={() => setRole("employee")}>
              <i className="ti ti-user" aria-hidden="true" /> Employee
            </button>
            <button type="button" className={`cemp__role-btn ${role === "manager" ? "cemp__role-btn--active" : ""}`} onClick={() => setRole("manager")}>
              <i className="ti ti-shield-check" aria-hidden="true" /> Manager
            </button>
          </div>

          <label className="cemp__label" htmlFor="department">Department</label>
          <div className="cemp__field">
            <i className="ti ti-building cemp__field-icon" aria-hidden="true" />
            <select id="department" className="cemp__select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">-- Select department --</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <label className="cemp__label" htmlFor="name">Full name</label>
          <div className="cemp__field">
            <i className="ti ti-user cemp__field-icon" aria-hidden="true" />
            <input id="name" type="text" placeholder="Enter full name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <label className="cemp__label" htmlFor="phone">Phone number</label>
          <div className="cemp__phone-row">
            <div className="cemp__field cemp__field--phone">
              <select className="cemp__country-select" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} aria-label="Country code">
                {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
              <span className="cemp__phone-divider" />
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                required
              />
            </div>
          </div>

          <label className="cemp__label">Working hours</label>
          <div className="cemp__shift-row">
            <div className="cemp__field cemp__field--shift">
              <i className="ti ti-clock-play cemp__field-icon" aria-hidden="true" />
              <input
                id="shiftStart"
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                aria-label="Shift start time"
                required
              />
            </div>
            <span className="cemp__shift-sep">to</span>
            <div className="cemp__field cemp__field--shift">
              <i className="ti ti-clock-stop cemp__field-icon" aria-hidden="true" />
              <input
                id="shiftEnd"
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                aria-label="Shift end time"
                required
              />
            </div>
          </div>
          <div className="cemp__shift-presets">
            <button type="button" className="cemp__preset-btn" onClick={() => { setShiftStart("10:00"); setShiftEnd("18:30"); }}>
              10:00 AM – 6:30 PM
            </button>
            <button type="button" className="cemp__preset-btn" onClick={() => { setShiftStart("08:30"); setShiftEnd("17:30"); }}>
              8:30 AM – 5:30 PM
            </button>
            <button type="button" className="cemp__preset-btn" onClick={() => { setShiftStart("09:00"); setShiftEnd("17:00"); }}>
              9:00 AM – 5:00 PM
            </button>
          </div>

          <label className="cemp__label" htmlFor="password">Password</label>
          <div className="cemp__field">
            <i className="ti ti-lock cemp__field-icon" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Set a password for this employee"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="cemp__toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
            </button>
          </div>

          <label className="cemp__label" htmlFor="confirmPassword">Confirm password</label>
          <div className="cemp__field">
            <i className="ti ti-lock cemp__field-icon" aria-hidden="true" />
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter the password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="cemp__submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"} <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>
          <button type="button" className="cemp__secondary" onClick={() => navigate("/managerdashboard")}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEmployee;
