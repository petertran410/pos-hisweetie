import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import type { CashAdvanceAttachment } from "@/lib/api/cash-advances";

/** Upload chứng từ / phiếu đã ký của tạm ứng, hoàn ứng (ảnh, PDF). */
export async function uploadCashAdvanceFiles(files: File[]): Promise<{
  files: CashAdvanceAttachment[];
  errors: { originalname: string; reason: string }[];
}> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await fetch(
    `${API_URL}/upload/files?subfolder=tai-chinh/tam-ung`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  if (!res.ok) throw new Error("Upload chứng từ thất bại");
  const result = await res.json();
  return {
    files: (result.items ?? []).map(
      (item: {
        url: string;
        originalname: string;
        mimetype: string;
        size: number;
      }) => ({
        fileUrl: item.url,
        fileName: item.originalname,
        fileType: item.mimetype,
        fileSize: item.size,
      }),
    ),
    errors: result.errors ?? [],
  };
}
