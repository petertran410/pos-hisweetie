import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";
import { useSandboxStore } from "@/lib/store/sandbox";

/**
 * Upload file lên server (live) hoặc chuyển sang base64 Data URL (sandbox).
 * Trong sandbox mode, resize ảnh xuống max 800px và compress JPEG 0.6
 * để tiết kiệm localStorage (~50-80KB/ảnh thay vì ~500KB+).
 */
export async function uploadFile(file: File): Promise<string> {
  const isSandbox = useSandboxStore.getState().isSandbox;

  if (isSandbox) {
    return compressToDataUrl(file, 800, 0.6);
  }

  const formData = new FormData();
  formData.append("file", file);
  const token = useAuthStore.getState().token;

  const res = await fetch(`${API_URL}/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
  const result = await res.json();
  return result.url;
}

/**
 * Resize + compress ảnh thành base64 Data URL.
 * Dùng OffscreenCanvas nếu có, fallback sang DOM canvas.
 */
function compressToDataUrl(
  file: File,
  maxDimension: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down giữ tỉ lệ
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}
