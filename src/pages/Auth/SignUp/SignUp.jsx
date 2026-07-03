import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SignUp.css";
import logo from "../../../assets/Nutech-removebg-preview.png";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

const DEPARTMENTS = [
  "Operations",
  "Sales",
  "Support",
  "Service Engineering",
  "Information Technology",
  "Accounts",
];

const COMPANIES = [
  "Nutech International",
  "SPL Technologies",
  "Both",
];

const countries = [
  { code: "+91",  flag: "🇮🇳", name: "India" },
  { code: "+1",   flag: "🇺🇸", name: "United States" },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61",  flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65",  flag: "🇸🇬", name: "Singapore" },
  { code: "+49",  flag: "🇩🇪", name: "Germany" },
  { code: "+33",  flag: "🇫🇷", name: "France" },
  { code: "+81",  flag: "🇯🇵", name: "Japan" },
  { code: "+86",  flag: "🇨🇳", name: "China" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan" },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
];

const SignUp = () => {
  const navigate = useNavigate();

  const [role, setRole]               = useState("employee");
  const [company, setCompany]         = useState("Nutech International");
  const [department, setDepartment]   = useState("");
  const [selectedDept, setSelectedDept] = useState("");

  const [name, setName]               = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");

  // reset dept selection when role changes
  const handleRoleChange = (r) => {
    setRole(r);
    setDepartment("");
    setSelectedDept("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === "manager" && !department) { setError("Please select your department."); return; }
    if (role === "employee" && !selectedDept) { setError("Please select a department."); return; }
    setError("");
    try {
      const body = { name, phone: phoneNumber, countryCode, password, role, company };
      if (role === "manager") body.department = department;
      if (role === "employee") body.department = selectedDept;

      const res  = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? `${data.message} — ${data.error}` : data.message);

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate(data.user?.role === "manager" ? "/managerdashboard" : "/EmployeeDashboard");
      } else {
        navigate("/Login");
      }
    } catch (err) {
      setError(err.message);
    }
  };


  return (
    <div className="signup">
      {/* Left brand panel */}
      <aside className="signup__brand">
        <div className="signup__brand-blob signup__brand-blob--green" />
        <div className="signup__brand-blob signup__brand-blob--purple" />
        <div className="signup__brand-logo">
          <img src={logo} alt="Nutech International" />
        </div>
        <div className="signup__brand-copy">
          <span className="signup__brand-rule" />
          <h2>Join the Nutech research hub</h2>
          <p className="signup__tagline">Partnering AgEv Research Since 1992</p>
        </div>
        <ul className="signup__brand-features">
          <li><i className="ti ti-leaf" aria-hidden="true" /> Sustainable</li>
          <li><i className="ti ti-shield-check" aria-hidden="true" /> Secure access</li>
        </ul>
      </aside>

      {/* Right form panel */}
      <main className="signup__panel">
        <form className="signup__form" onSubmit={handleSubmit} noValidate>
          <h1 className="signup__title">Create account</h1>
          <p className="signup__subtitle">Set up your Nutech workspace</p>

          {error && (
            <div className="signup__error">
              <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
            </div>
          )}

          {/* ── Company selector ── */}
          <label className="signup__label" htmlFor="company">Company</label>
          <div className="signup__field">
            <i className="ti ti-building-skyscraper signup__field-icon" aria-hidden="true" />
            <select
              id="company"
              className="signup__select"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* ── Role selector ── */}
          <label className="signup__label">I am joining as</label>
          <div className="signup__role-row">
            <button
              type="button"
              className={`signup__role-btn ${role === "employee" ? "signup__role-btn--active signup__role-btn--emp" : ""}`}
              onClick={() => handleRoleChange("employee")}
            >
              <i className="ti ti-user" aria-hidden="true" /> Employee
            </button>
            <button
              type="button"
              className={`signup__role-btn ${role === "manager" ? "signup__role-btn--active signup__role-btn--admin" : ""}`}
              onClick={() => handleRoleChange("manager")}
            >
              <i className="ti ti-shield-check" aria-hidden="true" /> Admin
            </button>
          </div>

          {/* ── MANAGER: pick department ── */}
          {role === "manager" && (
            <>
              <label className="signup__label" htmlFor="department">Your department</label>
              <div className="signup__field">
                <i className="ti ti-building signup__field-icon" aria-hidden="true" />
                <select
                  id="department"
                  className="signup__select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">-- Select department --</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── EMPLOYEE: pick department first, then manager within that dept ── */}
          {role === "employee" && (
            <>
              <label className="signup__label" htmlFor="emp-dept">Select department</label>
              <div className="signup__field">
                <i className="ti ti-building signup__field-icon" aria-hidden="true" />
                <select
                  id="emp-dept"
                  className="signup__select"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="">-- Select your department --</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── Full name ── */}
          <label className="signup__label" htmlFor="name">Full name</label>
          <div className="signup__field">
            <i className="ti ti-user signup__field-icon" aria-hidden="true" />
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          {/* ── Phone number ── */}
          <label className="signup__label" htmlFor="phone">Phone number</label>
          <div className="signup__phone-row">
            <div className="signup__field signup__field--phone">
              <div className="signup__country">
                <span className="signup__country-flag" aria-hidden="true">
                  {countries.find((c) => c.code === countryCode)?.flag}
                </span>
                <select
                  className="signup__country-select"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  aria-label="Country code"
                >
                  {countries.map((c) => (
                    <option key={c.code + c.name} value={c.code}>
                      {c.flag} {c.code} {c.name}
                    </option>
                  ))}
                </select>
                <span className="signup__country-code">{countryCode}</span>
                <i className="ti ti-chevron-down signup__country-caret" aria-hidden="true" />
              </div>
              <span className="signup__phone-divider" />
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* ── Password ── */}
          <label className="signup__label" htmlFor="password">Password</label>
          <div className="signup__field">
            <i className="ti ti-lock signup__field-icon" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="signup__toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
            </button>
          </div>

          <button type="submit" className="signup__submit">
            Create account <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>

          <div className="signup__divider"><span>or continue with</span></div>

          <div className="signup__social">
            <button type="button" className="signup__social-btn">
              <i className="ti ti-brand-google" aria-hidden="true" /> Google
            </button>
            <button type="button" className="signup__social-btn">
              <i className="ti ti-brand-microsoft" aria-hidden="true" /> Microsoft
            </button>
          </div>

          <p className="signup__footer">
            Already have an account?{" "}
            <a href="/Login" className="signup__footer-link">Sign in</a>
          </p>
        </form>
      </main>
    </div>
  );
};

export default SignUp;
