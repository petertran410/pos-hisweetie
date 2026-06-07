import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { API_URL, getAuthHeaders } from "../config/api";

export function usePackingSlips(params?: any) {
  return useQuery({
    queryKey: ["packing-slips", params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.branchId) queryParams.append("branchId", params.branchId);
      if (params?.search) queryParams.append("search", params.search);
      if (params?.pageSize) queryParams.append("pageSize", params.pageSize);
      if (params?.currentItem)
        queryParams.append("currentItem", params.currentItem);

      const res = await fetch(
        `${API_URL}/packing-slips?${queryParams.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch packing slips");
      return res.json();
    },
  });
}

export function usePackingSlip(id: number) {
  return useQuery({
    queryKey: ["packing-slip", id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch packing slip");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/packing-slips`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
    },
  });
}

export function useUpdatePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update packing slip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
    },
  });
}

export function useDeletePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/packing-slips/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        let msg = "Xóa phiếu giao hàng thất bại";
        try {
          const j = await res.json();
          const m = j?.message;
          if (typeof m === "string") msg = m;
          else if (Array.isArray(m)) msg = m.join(", ");
          else if (typeof m?.message === "string") msg = m.message;
        } catch {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
    },
  });
}

export function useResendPackingSlipNotification() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(
        `${API_URL}/packing-slips/${id}/resend-notification`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      if (!res.ok) {
        let message = "Gửi lại thông báo Zalo thất bại";
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch {
          // ignore parse error
        }
        throw new Error(message);
      }
      return res.json();
    },
  });
}

export async function uploadPackingSlipImage(file: File): Promise<string> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append("file", file);

  // Upload dùng multipart/form-data — KHÔNG dùng getAuthHeaders()
  // vì Content-Type phải để browser tự set boundary
  const res = await fetch(`${API_URL}/upload/image?subfolder=bao-don`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return result.url;
}

export async function uploadPackingSlipImages(
  files: File[]
): Promise<{ urls: string[]; errors: { originalname: string; reason: string }[] }> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_URL}/upload/images?subfolder=bao-don`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return {
    urls: result.items.map((it: { url: string }) => it.url),
    errors: result.errors ?? [],
  };
}

export interface UploadedExpenseFile {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

/**
 * Upload nhiều file (image/pdf/doc/xls/...) cho phần "Chứng từ chi phí" của báo đơn.
 * Subfolder: bao-don/chi-phi.
 */
export async function uploadPackingSlipExpenseFiles(
  files: File[]
): Promise<{
  files: UploadedExpenseFile[];
  errors: { originalname: string; reason: string }[];
}> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(
    `${API_URL}/upload/files?subfolder=bao-don/chi-phi`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return {
    files: (result.items ?? []).map(
      (it: {
        url: string;
        originalname: string;
        mimetype: string;
        size: number;
      }) => ({
        fileUrl: it.url,
        fileName: it.originalname,
        fileType: it.mimetype,
        fileSize: it.size,
      })
    ),
    errors: result.errors ?? [],
  };
}
