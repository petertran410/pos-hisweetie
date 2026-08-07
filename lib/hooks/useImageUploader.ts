"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { compressImageFiles } from "@/lib/utils/image-compress";

/**
 * Kết quả của các hàm upload ảnh báo đơn (usePackingSlips / usePackingHangs /
 * usePackingLoadings đều trả về cùng shape này).
 */
export interface UploadImagesResult {
  urls: string[];
  errors: { originalname: string; reason: string }[];
}

export type UploadImagesFn = (files: File[]) => Promise<UploadImagesResult>;

/** Ảnh đang chờ upload — hiển thị ngay bằng blob URL local. */
export interface PendingImage {
  id: string;
  previewUrl: string;
}

let pendingSeq = 0;
const nextPendingId = () => `pending-${Date.now()}-${pendingSeq++}`;

/**
 * Quản lý upload ảnh cho form báo đơn (giao hàng / đóng hàng / loading).
 *
 * Tối ưu trải nghiệm "chụp xong chờ ảnh hiện":
 * 1. Hiện ảnh NGAY bằng `URL.createObjectURL` (không chờ mạng).
 * 2. Nén ảnh ở client (~200–500KB) rồi mới upload → cắt phần lớn thời gian chờ.
 * 3. Upload xong thì thay preview local bằng URL server và revoke blob.
 *
 * Nhờ tách preview khỏi upload, người dùng chụp được nhiều ảnh liên tiếp mà
 * không phải đợi ảnh trước upload xong.
 *
 * @param uploadFn  hàm upload tương ứng với từng loại phiếu (quyết định subfolder)
 * @param initialImages  URL ảnh đã lưu (khi sửa phiếu)
 */
export function useImageUploader(
  uploadFn: UploadImagesFn,
  initialImages: string[] = []
) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);

  // Số lượt upload đang chạy — hỗ trợ chụp liên tiếp (nhiều lượt song song).
  const [uploadingCount, setUploadingCount] = useState(0);

  // Tập blob URL đã tạo, để revoke khi unmount (tránh rò rỉ bộ nhớ trên mobile).
  const blobUrlsRef = useRef<Set<string>>(new Set());

  const createPreview = useCallback((file: File): PendingImage => {
    const previewUrl = URL.createObjectURL(file);
    blobUrlsRef.current.add(previewUrl);
    return { id: nextPendingId(), previewUrl };
  }, []);

  const revokePreview = useCallback((url: string) => {
    if (!blobUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    blobUrlsRef.current.delete(url);
  }, []);

  // Revoke toàn bộ blob URL còn sót khi unmount.
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      const fileList = Array.from(selected);
      // Reset input ngay để chọn lại cùng file vẫn kích hoạt onChange.
      e.target.value = "";

      // (1) Hiện preview local ngay — không chờ nén, không chờ mạng.
      const previews = fileList.map(createPreview);
      setPendingImages((prev) => [...prev, ...previews]);
      setUploadingCount((n) => n + 1);

      const dropPreviews = () => {
        const ids = new Set(previews.map((p) => p.id));
        setPendingImages((prev) => prev.filter((p) => !ids.has(p.id)));
        previews.forEach((p) => revokePreview(p.previewUrl));
      };

      try {
        // (2) Nén ở client rồi upload.
        const compressed = await compressImageFiles(fileList);
        const { urls, errors } = await uploadFn(compressed);

        // (3) Thay preview local bằng URL server.
        if (urls.length > 0) {
          setImages((prev) => [...prev, ...urls]);
        }

        if (errors.length === 0) {
          toast.success(`Upload ${urls.length} hình thành công`);
        } else if (urls.length > 0) {
          toast.success(
            `Upload ${urls.length}/${fileList.length} hình thành công`
          );
          toast.error(errors[0].reason);
        } else {
          toast.error(errors[0]?.reason || "Upload hình thất bại");
        }
      } catch {
        toast.error("Upload hình thất bại");
      } finally {
        dropPreviews();
        setUploadingCount((n) => Math.max(0, n - 1));
      }
    },
    [createPreview, revokePreview, uploadFn]
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    images,
    setImages,
    pendingImages,
    /** Có lượt upload đang chạy (dùng để hiện "Đang upload..."). */
    isUploading: uploadingCount > 0,
    /** Còn ảnh chưa upload xong → nên chặn submit để không lưu phiếu thiếu ảnh. */
    hasPendingImages: pendingImages.length > 0,
    handleFileSelect,
    removeImage,
  };
}
