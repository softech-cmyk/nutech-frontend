import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

const COMPANIES = ["Nutech International", "SPL Technologies", "Both"];

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

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
    setResult(null);
    setCopied(false);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!department) { setError("Please select a department."); return; }
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
        body: JSON.stringify({ name, phone: phoneNumber, countryCode, department, role, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResult({ name: data.user.name, phone: data.user.phone, countryCode: data.user.countryCode, tempPassword: data.tempPassword });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="cemp">
        <div className="cemp__card">
          <div className="cemp__result-icon"><i className="ti ti-circle-check" aria-hidden="true" /></div>
          <h1 className="cemp__title">Account created</h1>
          <p className="cemp__subtitle">Share these credentials with {result.name} — the temp password is shown only once.</p>

          <div className="cemp__result-row">
            <span>Phone</span>
            <strong>{result.countryCode} {result.phone}</strong>
          </div>
          <div className="cemp__result-row">
            <span>Temp password</span>
            <strong className="cemp__temp-pass">{result.tempPassword}</strong>
          </div>

          <button type="button" className="cemp__submit" onClick={handleCopy}>
            <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden="true" />
            {copied ? "Copied" : "Copy password"}
          </button>
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
      <div className="cemp__card">
        <h1 className="cemp__title">Create employee account</h1>
        <p className="cemp__subtitle">Only managers can create accounts. A temp password is generated automatically.</p>

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
