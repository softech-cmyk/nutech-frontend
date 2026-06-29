import API from "./api";

export const leaveService = {
  applyLeave: (data) => API.post("/leaves/apply", data),
  getMyLeaves: (params) => API.get("/leaves/my", { params }),
  getAllLeaves: (params) => API.get("/leaves/all", { params }),
  updateLeaveStatus: (id, data) => API.put(`/leaves/${id}/status`, data),
  getRejectedLeaves: () => API.get("/leaves/rejected"),
};
