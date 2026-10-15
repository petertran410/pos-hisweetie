"use client";

import { Camera, FileText, Loader2, Upload, X } from "lucide-react";

export type EvidenceFile = {
  fileUrl: string;
  fileName?: string | null;
  fileType?: string | null;
};

const isImage = (file: EvidenceFile) =>
  (file.fileType || "").toLowerCase().startsWith("image/") ||
  /\.(avif|bmp|gif|jpe?g|png|svg|webp|heic)$/i.test(file.fileUrl.split("?")[0]);

/**
 * Ô chứng từ kiểu Báo đơn: "Chụp" mở camera sau của điện thoại, "Tải lên"
 * chọn nhiều ảnh/PDF; ảnh đã tải hiện thành ô vuông, bấm để xem.
 */
export function EvidenceUploadTiles({
  label,
  files,
  uploading,
  onFiles,
  onRemove,
  onPreview,
  accept = "image/*,application/pdf",
}: {
  label?: string;
  files: EvidenceFile[];
  uploading: boolean;
  onFiles: (files: FileList) => void;
  /** Không truyền thì file không xóa được (ví dụ chứng từ đã lưu). */
  onRemove?: (file: EvidenceFile) => void;
  /** Bấm ảnh để xem lớn; không truyền thì mở ảnh ở tab mới. */
  onPreview?: (file: EvidenceFile) => void;
  accept?: string;
}) {
  const tile =
    "relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 sm:h-24 sm:w-24";
  return (
    <div className="sm:col-span-2">
      {label && (
        <div className="mb-1.5 text-xs font-medium text-gray-600">{label}</div>
      )}
      <div className="flex flex-wrap gap-2">
        <label
          className={`${tile} cursor-pointer hover:border-brand hover:text-brand`}>
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
          Chụp
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              if (event.target.files?.length) onFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label
          className={`${tile} cursor-pointer hover:border-brand hover:text-brand`}>
          <Upload className="h-5 w-5" />
          Tải lên
          <input
            type="file"
            accept={accept}
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              if (event.target.files?.length) onFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {files.map((file) => {
          const name = file.fileName || file.fileUrl.split("/").pop() || "";
          const image = isImage(file);
          return (
            <div
              key={file.fileUrl}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border sm:h-24 sm:w-24">
              {image && onPreview ? (
                <button
                  type="button"
                  title={`Xem ${name}`}
                  onClick={() => onPreview(file)}
                  className="h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.fileUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={name}
                  className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-400">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.fileUrl}
                      alt={name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </a>
              )}
              {onRemove && (
                <button
                  type="button"
                  title="Bỏ file"
                  onClick={() => onRemove(file)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
