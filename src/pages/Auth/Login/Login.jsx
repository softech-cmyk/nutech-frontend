import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import logo from "../../../assets/Nutech-removebg-preview.png";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

const Login = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phoneNumber || !password) {
      setError("Please enter your phone number and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.mustChangePassword) {
        navigate("/ChangePassword");
      } else if (data.user.role === "manager") {
        navigate("/managerdashboard");
      } else {
        navigate("/EmployeeDashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      {/* Left brand panel */}
      <aside className="login__brand">
        <div className="login__brand-blob login__brand-blob--green" />
        <div className="login__brand-blob login__brand-blob--purple" />

        <div className="login__brand-logo">
          <img src={logo} alt="Nutech International" />
        </div>

        <div className="login__brand-copy">
          <span className="login__brand-rule" />
          <h2>Join the Nutech research hub</h2>
          <p className="login__tagline">Partnering AgEv Research Since 1992</p>
        </div>

        <ul className="login__brand-features">
          <li>
            <i className="ti ti-leaf" aria-hidden="true" />
            Sustainable
          </li>
          <li>
            <i className="ti ti-shield-check" aria-hidden="true" />
            Secure access
          </li>
        </ul>
      </aside>

      {/* Right form panel */}
      <main className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1 className="login__title">Welcome back</h1>
          <p className="login__subtitle">Sign in to your Nutech workspace</p>

          {error && (
            <div className="login__error">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              {error}
            </div>
          )}

          <label className="login__label" htmlFor="phone">
            Phone number
          </label>
          <div className="login__field">
            <i className="ti ti-phone login__field-icon" aria-hidden="true" />
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
              autoComplete="tel"
            />
          </div>

          <label className="login__label" htmlFor="password">
            Password
          </label>
          <div className="login__field">
            <i className="ti ti-lock login__field-icon" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login__toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={`ti ${showPassword ? "ti-eye-off" : "ti-eye"}`} />
            </button>
          </div>

          <button type="submit" className="login__submit" disabled={loading}>
            {loading ? (
              <span className="login__spinner" />
            ) : (
              <>
                Sign in
                <i className="ti ti-arrow-right" aria-hidden="true" />
              </>
            )}
          </button>

          <div className="login__divider">
            <span>or continue with</span>
          </div>

          <div className="login__social">
            <button type="button" className="login__social-btn">
              <i className="ti ti-brand-google" aria-hidden="true" />
              Google
            </button>
            <button type="button" className="login__social-btn">
              <i className="ti ti-brand-microsoft" aria-hidden="true" />
              Microsoft
            </button>
          </div>

          <p className="login__footer">
            Don&apos;t have an account? Ask your manager to create one for you.
          </p>
        </form>
      </main>
    </div>
  );
};

export default Login;
