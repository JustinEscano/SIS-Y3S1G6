import AppService from "../appService";

const analyticsService = {
  async getSummary() {
    const { data } = await AppService.get("/admin/analytics/summary");
    return data;
  }
};

export default analyticsService;
