import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ChangePassword.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

const ChangePassword = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) navigate("/Login");
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user) {
        user.mustChangePassword = false;
        localStorage.setItem("user", JSON.stringify(user));
      }
      navigate(user?.role === "manager" ? "/managerdashboard" : "/EmployeeDashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chpass">
      <div className="chpass__card">
        <h1 className="chpass__title">Set a new password</h1>
        <p className="chpass__subtitle">This is your first login — replace the temporary password before continuing.</p>

        {error && (
          <div className="chpass__error">
            <i className="ti ti-alert-circle" aria-hidden="true" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label className="chpass__label" htmlFor="current">Temporary password</label>
          <div className="chpass__field">
            <input
              id="current"
              type={showCurrent ? "text" : "password"}
              placeholder="Enter the temp password you were given"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="chpass__toggle"
              onClick={() => setShowCurrent((s) => !s)}
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              <i className={`ti ${showCurrent ? "ti-eye-off" : "ti-eye"}`} />
            </button>
          </div>

          <label className="chpass__label" htmlFor="new">New password</label>
          <div className="chpass__field">
            <input
              id="new"
              type={showNew ? "text" : "password"}
              placeholder="Create a new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="chpass__toggle"
              onClick={() => setShowNew((s) => !s)}
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              <i className={`ti ${showNew ? "ti-eye-off" : "ti-eye"}`} />
            </button>
          </div>

          <label className="chpass__label" htmlFor="confirm">Confirm new password</label>
          <div className="chpass__field">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="chpass__toggle"
              onClick={() => setShowConfirm((s) => !s)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              <i className={`ti ${showConfirm ? "ti-eye-off" : "ti-eye"}`} />
            </button>
          </div>

          <button type="submit" className="chpass__submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
