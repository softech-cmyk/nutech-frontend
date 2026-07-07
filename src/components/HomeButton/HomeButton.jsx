import { useNavigate, useLocation } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import "./HomeButton.css";

const HomeButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const homePath = user.role === "manager" ? "/managerdashboard" : "/EmployeeDashboard";

  // Both dashboards render their own sidebar nav in this same corner, so hide
  // on either one rather than only the current role's home.
  const dashboardPaths = ["/managerdashboard", "/employeedashboard"];
  if (dashboardPaths.includes(location.pathname.toLowerCase())) return null;

  return (
    <button
      type="button"
      className="home-btn"
      onClick={() => navigate(homePath)}
      aria-label="Go to home"
      title="Home"
    >
      <FaHome />
    </button>
  );
};

export default HomeButton;
