import AppService from "../appService";

const teacherService = {
  getProfile: async () => {
    const { data } = await AppService.get("/teacher/profile");
    return data;
  },

  updateProfile: async (payload) => {
    const { data } = await AppService.put("/teacher/profile", payload);
    return data;
  },

  changePassword: async (payload) => {
    const { data } = await AppService.put("/teacher/profile/password", payload);
    return data;
  },

  getDashboard: async () => {
    const { data } = await AppService.get("/teacher/dashboard");
    return data;
  },

  getAnalytics: async () => {
    const { data } = await AppService.get("/teacher/analytics");
    return data;
  },
};

export default teacherService;
