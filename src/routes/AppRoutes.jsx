import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Auth/Login/Login";
import ChangePassword from "../pages/Auth/ChangePassword/ChangePassword";
import CreateEmployee from "../pages/Admin/CreateEmployee/CreateEmployee";
import Employees from "../pages/Admin/Employees/Employees";
import ManagerDashboard from "../pages/Admin/ManagerDashboard/ManagerDashboard";
import EmployeeDashboard from "../pages/Admin/EmployeeDashobard/EmployeeDashboard";
import PunchAttendance from "../pages/Employee/PunchAttendance/PunchAttendance";
import PresentToday from "../components/dashboard/PresentToday/PresentToday";
import AbsentToday from "../components/dashboard/AbsentToday/AbsentToday";
import AcceptedLeaves from "../components/dashboard/AcceptedLeaves/AcceptedLeaves";
import LeavesApplied from "../components/dashboard/LeavesApplied/LeavesApplied";
import AttendanceRecords from "../components/dashboard/AttendanceRecords/AttendanceRecords";
import RejectedLeaves from "../components/dashboard/RejectedLeaves/RejectedLeaves";
import LeaveApplicationButton from "../components/dashboard/LeaveApplicationButton/LeaveApplicationButton";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/ChangePassword" element={<ChangePassword />} />
      <Route path="/CreateEmployee" element={<CreateEmployee />} />
      <Route path="/Employees" element={<Employees />} />
      <Route path="/managerdashboard" element={<ManagerDashboard />} />
      <Route path="/ManagerDashboard" element={<ManagerDashboard />} />
      <Route path="/EmployeeDashboard" element={<EmployeeDashboard />} />
      <Route path="/PunchAttendance" element={<PunchAttendance />} />
      <Route path="/PresentToday" element={<PresentToday />} />
      <Route path="/AbsentToday" element={<AbsentToday />} />
      <Route path="/AcceptedLeaves" element={<AcceptedLeaves />} />
      <Route path="/LeavesApplied" element={<LeavesApplied />} />
      <Route path="/AttendanceRecords" element={<AttendanceRecords />} />
      <Route path="/RejectedLeaves" element={<RejectedLeaves />} />
      <Route path="/LeaveApplicationButton" element={<LeaveApplicationButton />} />
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}

export default AppRoutes;
