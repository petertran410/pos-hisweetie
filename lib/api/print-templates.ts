import { apiClient } from "@/lib/config/api";

export const printTemplatesApi = {
  getAll: async (params?: { templateFor?: string; isActive?: boolean }) => {
    const res = await apiClient.get<any>("/print-templates", params);
    return res ?? [];
  },

  getOne: async (id: number) => {
    return apiClient.get(`/print-templates/${id}`);
  },

  getByCode: async (code: string) => {
    return apiClient.get(`/print-templates/by-code/${code}`);
  },

  create: async (payload: any) => {
    return apiClient.post("/print-templates", payload);
  },

  update: async (id: number, payload: any) => {
    return apiClient.put(`/print-templates/${id}`, payload);
  },

  delete: async (id: number) => {
    return apiClient.delete(`/print-templates/${id}`);
  },

  getVariables: async (templateFor: string) => {
    const res = await apiClient.get<any>(
      `/print-templates/variables/${templateFor}`
    );
    return res ?? {};
  },

  renderPreview: async (
    templateId: number,
    entityId: number,
    entityType?: string
  ) => {
    return apiClient.post("/print-templates/preview", {
      templateId,
      entityId,
      ...(entityType && { entityType }),
    });
  },

  renderWithData: async (templateId: number, entityData: any) => {
    return apiClient.post(`/print-templates/${templateId}/render-with-data`, {
      data: entityData,
    });
  },

  getAllVariables: async (templateFor?: string) => {
    const res = await apiClient.get<any>(
      "/print-templates/variables",
      templateFor ? { templateFor } : undefined
    );
    return res ?? [];
  },

  createVariable: async (payload: any) => {
    return apiClient.post("/print-templates/variables", payload);
  },

  updateVariable: async (id: number, payload: any) => {
    return apiClient.put(`/print-templates/variables/${id}`, payload);
  },

  deleteVariable: async (id: number) => {
    return apiClient.delete(`/print-templates/variables/${id}`);
  },
};
