import { Routes, Route } from "react-router-dom";
import Login from "../pages/Auth/Login/Login";
import SignUp from "../pages/Auth/SignUp/SignUp";
import ManagerDashboard from "../pages/Admin/ManagerDashboard/ManagerDashboard";
import EmployeeDashboard from "../pages/Admin/EmployeeDashobard/EmployeeDashboard";
import PunchAttendance from "../components/attendance/PunchAttendance/PunchAttendance";
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
      <Route path="/" element={<div>Welcome to the Attendance Management System</div>} />
      <Route path="/login" element={<Login />} />
      <Route path="/Login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/SignUp" element={<SignUp />} />
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
