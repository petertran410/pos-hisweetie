import { apiClient, API_URL, getAuthHeaders } from "@/lib/config/api";
import type {
  Contract,
  ContractFilters,
  ContractTemplate,
  ContractTemplateField,
  CreateFromTemplatePayload,
} from "../types/contract";

export const contractsApi = {
  getAll: async (params?: ContractFilters) => {
    return apiClient.get<{
      data: Contract[];
      total: number;
      page: number;
      pageSize: number;
    }>("/contracts", params);
  },

  listTemplates: async () => {
    return apiClient.get<ContractTemplate[]>("/contracts/templates");
  },

  getTemplateFields: async (templateId: number) => {
    return apiClient.get<ContractTemplateField[]>(
      `/contracts/templates/${templateId}/fields`
    );
  },

  getById: async (id: number) => {
    return apiClient.get<Contract>(`/contracts/${id}`);
  },

  createFromTemplate: async (data: CreateFromTemplatePayload) => {
    return apiClient.post<Contract>("/contracts/from-template", data);
  },

  resend: async (id: number) => {
    return apiClient.post<Contract>(`/contracts/${id}/resend`);
  },

  // Upload PDF (multipart) — apiClient luôn JSON.stringify nên fetch trực tiếp.
  upload: async (params: {
    customerId: number;
    title?: string;
    recipientEmail?: string;
    file: File;
  }): Promise<Contract> => {
    const form = new FormData();
    form.append("file", params.file);
    form.append("customerId", String(params.customerId));
    if (params.title) form.append("title", params.title);
    if (params.recipientEmail)
      form.append("recipientEmail", params.recipientEmail);

    // Lấy auth headers nhưng BỎ Content-Type để browser tự set boundary multipart.
    const headers = getAuthHeaders() as Record<string, string>;
    delete headers["Content-Type"];

    const res = await fetch(`${API_URL}/contracts/upload`, {
      method: "POST",
      headers,
      body: form,
    });

    if (!res.ok) {
      let msg = "Tải hợp đồng thất bại";
      try {
        const json = await res.json();
        if (typeof json?.message === "string") msg = json.message;
        else if (Array.isArray(json?.message)) msg = json.message.join(", ");
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  },

  // Tải PDF đã ký → blob.
  download: async (id: number): Promise<Blob> => {
    const res = await fetch(`${API_URL}/contracts/${id}/download`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Tải PDF thất bại");
    }
    return res.blob();
  },

  // Xem trước PDF đã ký (inline) → blob để mở tab mới.
  preview: async (id: number): Promise<Blob> => {
    const res = await fetch(`${API_URL}/contracts/${id}/preview`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error("Xem trước PDF thất bại");
    }
    return res.blob();
  },
};
