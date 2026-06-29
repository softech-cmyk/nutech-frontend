import { useState } from "react";
import "./SignUp.css";
import logo from "../../../assets/Nutech-removebg-preview.png";

const API = "http://localhost:5000/api/auth";

const countries = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
];

const SignUp = () => {
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  
const handleSendOtp = async () => {
  if (!phoneNumber) {
    alert("Please enter your phone number first.");
    return;
  }
  try {
    const res = await fetch(`${API}/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber, countryCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setOtpSent(true);
  } catch (err) {
    alert(err.message);
  }
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber, countryCode, otp, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    localStorage.setItem("token", data.token);
    // redirect to dashboard here
  } catch (err) {
    alert(err.message);
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
      <main className="signup__panel">
        <form className="signup__form" onSubmit={handleSubmit} noValidate>
          <h1 className="signup__title">Create account</h1>
          <p className="signup__subtitle">Set up your Nutech workspace</p>

          <label className="signup__label" htmlFor="phone">
            Phone number
          </label>
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
                <i
                  className="ti ti-chevron-down signup__country-caret"
                  aria-hidden="true"
                />
              </div>
              <span className="signup__phone-divider" />
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))
                }
                autoComplete="tel"
              />
            </div>
            <button
              type="button"
              className="signup__otp-btn"
              onClick={handleSendOtp}
            >
              {otpSent ? "Resend" : "Send OTP"}
            </button>
          </div>

          {/* OTP box — appears after clicking Send OTP */}
          {otpSent && (
            <div className="signup__otp-wrap">
              <label className="signup__label" htmlFor="otp">
                Enter OTP
              </label>
              <p className="signup__otp-hint">
                <i className="ti ti-circle-check" aria-hidden="true" /> Code sent
                to {countryCode} {phoneNumber}
              </p>
              <div className="signup__field">
                <i
                  className="ti ti-message-2-code signup__field-icon"
                  aria-hidden="true"
                />
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
            </div>
          )}

          <label className="signup__label" htmlFor="password">
            Password
          </label>
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
            Create account
            <i className="ti ti-arrow-right" aria-hidden="true" />
          </button>

          <div className="signup__divider">
            <span>or continue with</span>
          </div>

          <div className="signup__social">
            <button type="button" className="signup__social-btn">
              <i className="ti ti-brand-google" aria-hidden="true" />
              Google
            </button>
            <button type="button" className="signup__social-btn">
              <i className="ti ti-brand-microsoft" aria-hidden="true" />
              Microsoft
            </button>
          </div>

          <p className="signup__footer">
            Already have an account?{" "}
            <a href="#login" className="signup__footer-link">
              Sign in
            </a>
          </p>
        </form>
      </main>
    </div>
  );
};

export default SignUp;
