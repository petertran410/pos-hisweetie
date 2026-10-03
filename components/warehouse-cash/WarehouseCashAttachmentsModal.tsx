"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  X,
} from "lucide-react";
import type { InternalFinanceAttachment } from "@/lib/api/internal-finance";

const isImageAttachment = (file: InternalFinanceAttachment) => {
  const mime = file.fileType?.toLowerCase() || "";
  if (mime.startsWith("image/")) return true;
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(
    file.fileUrl.split("?")[0],
  );
};

const fileLabel = (file: InternalFinanceAttachment) =>
  file.fileName || file.fileUrl.split("/").pop() || "Chứng từ";

export function WarehouseCashAttachmentsModal({
  attachments,
  title,
  onClose,
}: {
  attachments: InternalFinanceAttachment[];
  title?: string;
  onClose: () => void;
}) {
  const images = useMemo(
    () => attachments.filter(isImageAttachment),
    [attachments],
  );
  const [viewingImage, setViewingImage] = useState<string | null>(
    images[0]?.fileUrl || null,
  );

  const changeImage = useCallback(
    (direction: "previous" | "next") => {
      if (images.length < 2 || !viewingImage) return;
      const currentIndex = images.findIndex(
        (image) => image.fileUrl === viewingImage,
      );
      if (currentIndex < 0) return;
      const offset = direction === "previous" ? -1 : 1;
      const nextIndex = (currentIndex + offset + images.length) % images.length;
      setViewingImage(images[nextIndex].fileUrl);
    },
    [images, viewingImage],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (viewingImage) setViewingImage(null);
        else onClose();
        return;
      }
      if (viewingImage && event.key === "ArrowLeft") {
        changeImage("previous");
      }
      if (viewingImage && event.key === "ArrowRight") {
        changeImage("next");
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [changeImage, onClose, viewingImage]);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Chứng từ</h3>
            {title && <p className="mt-0.5 text-xs text-gray-500">{title}</p>}
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {attachments.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Chưa có chứng từ
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {attachments.map((file, index) => {
                const image = isImageAttachment(file);
                const label = fileLabel(file);
                return image ? (
                  <button
                    key={`${file.fileUrl}-${index}`}
                    type="button"
                    title={`Xem ${label}`}
                    onClick={() => setViewingImage(file.fileUrl)}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50 hover:border-brand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.fileUrl}
                      alt={label}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </button>
                ) : (
                  <a
                    key={`${file.fileUrl}-${index}`}
                    href={file.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={label}
                    className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs text-gray-600 hover:bg-gray-100">
                    <FileText className="h-9 w-9 text-gray-400" />
                    <span className="line-clamp-3 break-all">{label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {viewingImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewingImage(null)}>
          <button
            type="button"
            title="Đóng ảnh"
            onClick={() => setViewingImage(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
            <X className="h-5 w-5" />
          </button>
          <div
            className="flex max-w-full flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingImage}
              alt="Xem ảnh chứng từ"
              className="max-h-[75vh] max-w-full rounded object-contain"
            />
            {images.length > 1 && (
              <div className="flex max-w-full items-center gap-2 rounded-lg bg-white/90 p-3">
                <button
                  type="button"
                  title="Ảnh trước"
                  aria-label="Ảnh trước"
                  onClick={() => changeImage("previous")}
                  className="rounded p-2 text-gray-700 hover:bg-gray-100">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex max-w-md gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={`${image.fileUrl}-${index}`}
                      type="button"
                      title={`Xem ảnh ${index + 1}`}
                      aria-label={`Xem ảnh ${index + 1}`}
                      onClick={() => setViewingImage(image.fileUrl)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${
                        image.fileUrl === viewingImage
                          ? "border-brand"
                          : "border-gray-300"
                      }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.fileUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  title="Ảnh sau"
                  aria-label="Ảnh sau"
                  onClick={() => changeImage("next")}
                  className="rounded p-2 text-gray-700 hover:bg-gray-100">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="ml-1 whitespace-nowrap text-sm text-gray-700">
                  {images.findIndex((image) => image.fileUrl === viewingImage) + 1} /{" "}
                  {images.length}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
