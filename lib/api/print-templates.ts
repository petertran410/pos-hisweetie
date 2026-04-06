import { apiClient } from "@/lib/config/api";

export const printTemplatesApi = {
  getAll: async (params?: { templateFor?: string; isActive?: boolean }) => {
    const { data } = await apiClient.get("/print-templates", { params });
    return data;
  },

  getOne: async (id: number) => {
    const { data } = await apiClient.get(`/print-templates/${id}`);
    return data;
  },

  getByCode: async (code: string) => {
    const { data } = await apiClient.get(`/print-templates/by-code/${code}`);
    return data;
  },

  create: async (payload: any) => {
    const { data } = await apiClient.post("/print-templates", payload);
    return data;
  },

  update: async (id: number, payload: any) => {
    const { data } = await apiClient.put(`/print-templates/${id}`, payload);
    return data;
  },

  delete: async (id: number) => {
    const { data } = await apiClient.delete(`/print-templates/${id}`);
    return data;
  },

  getVariables: async (templateFor: string) => {
    const { data } = await apiClient.get(
      `/print-templates/variables/${templateFor}`
    );
    return data;
  },

  renderPreview: async (templateId: number, entityId: number) => {
    const { data } = await apiClient.post("/print-templates/preview", {
      templateId,
      entityId,
    });
    return data;
  },

  getAllVariables: async (templateFor?: string) => {
    const { data } = await apiClient.get("/print-templates/variables", {
      params: { templateFor },
    });
    return data;
  },

  createVariable: async (payload: any) => {
    const { data } = await apiClient.post(
      "/print-templates/variables",
      payload
    );
    return data;
  },

  updateVariable: async (id: number, payload: any) => {
    const { data } = await apiClient.put(
      `/print-templates/variables/${id}`,
      payload
    );
    return data;
  },

  deleteVariable: async (id: number) => {
    const { data } = await apiClient.delete(`/print-templates/variables/${id}`);
    return data;
  },
};
