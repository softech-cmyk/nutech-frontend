import API from "./api";

export const employeeService = {
  getAllEmployees: (params) => API.get("/employees", { params }),
  getEmployee: (id) => API.get(`/employees/${id}`),
  updateProfile: (data) => API.put("/employees/profile", data),
  getDashboardStats: () => API.get("/employees/dashboard-stats"),
};
