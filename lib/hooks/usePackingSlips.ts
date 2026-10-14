import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/auth";
import { toast } from "sonner";
import { API_URL, apiClient, getAuthHeaders } from "../config/api";

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
        },
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
    mutationFn: (data: any) => apiClient.post("/packing-slips", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
      queryClient.invalidateQueries({ queryKey: ["debt-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", "for-packing"] });
      queryClient.invalidateQueries({ queryKey: ["consignments-for-packing"] });
    },
  });
}

export function useUpdatePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiClient.put(`/packing-slips/${id}`, data),
    onSuccess: (result: {
      financeLocked?: Array<{ code: string; reason: string }>;
    }) => {
      queryClient.invalidateQueries({ queryKey: ["packing-slips"] });
      queryClient.invalidateQueries({ queryKey: ["debt-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-expenses"] });
      // Phiếu chi đang khóa (Approval tuần / đã chi) không theo báo đơn.
      for (const lock of result?.financeLocked || []) {
        toast.warning(
          `Báo đơn đã lưu nhưng phiếu chi ${lock.code} chưa cập nhật: ${lock.reason}`,
          { duration: 10000 },
        );
      }
    },
  });
}

/**
 * Hỏi trước khi hủy báo đơn giao hàng đã có phiếu thu tiền mặt kho.
 * Trả về null khi người dùng bỏ qua hoặc báo đơn không hủy được.
 */
export async function confirmPackingSlipCancel(
  id: number,
): Promise<{ id: number; cancelCashFlows?: boolean } | null> {
  const res = await fetch(`${API_URL}/packing-slips/${id}/cancel-check`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return { id };
  const check = (await res.json()) as {
    receiptCashFlowCount: number;
    blockedReason: string | null;
  };
  if (check.blockedReason) throw new Error(check.blockedReason);
  if (!check.receiptCashFlowCount) return { id };
  const { default: Swal } = await import("sweetalert2");
  const result = await Swal.fire({
    title: "Xác nhận hủy báo đơn giao hàng",
    html: `
      <p>Báo đơn này đã có <strong>${check.receiptCashFlowCount}</strong> phiếu thu tiền mặt.</p>
      <p class="text-red-600 font-bold mt-2">Bạn có muốn hủy cả phiếu thu không?</p>
    `,
    icon: "warning",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: "Có - Hủy kèm phiếu thu",
    denyButtonText: "Không - Giữ phiếu thu",
    cancelButtonText: "Hủy bỏ",
    confirmButtonColor: "#dc2626",
    denyButtonColor: "#059669",
    cancelButtonColor: "#6b7280",
  });
  if (result.isDismissed) return null;
  return { id, cancelCashFlows: result.isConfirmed };
}

export function useDeletePackingSlip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: number | { id: number; cancelCashFlows?: boolean },
    ) => {
      const { id, cancelCashFlows } =
        typeof input === "number"
          ? { id: input, cancelCashFlows: undefined }
          : input;
      const query =
        cancelCashFlows === undefined
          ? ""
          : `?cancelCashFlows=${cancelCashFlows}`;
      const res = await fetch(`${API_URL}/packing-slips/${id}${query}`, {
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
      queryClient.invalidateQueries({ queryKey: ["debt-tracking"] });
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
        },
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
  files: File[],
  // Ảnh ký gửi lưu riêng sang folder ky-gui để không lẫn với báo đơn hóa đơn.
  subfolder: string = "bao-don",
): Promise<{
  urls: string[];
  errors: { originalname: string; reason: string }[];
}> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(
    `${API_URL}/upload/images?subfolder=${encodeURIComponent(subfolder)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
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
export async function uploadPackingSlipExpenseFiles(files: File[]): Promise<{
  files: UploadedExpenseFile[];
  errors: { originalname: string; reason: string }[];
}> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  const res = await fetch(`${API_URL}/upload/files?subfolder=bao-don/chi-phi`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
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
      }),
    ),
    errors: result.errors ?? [],
  };
}
