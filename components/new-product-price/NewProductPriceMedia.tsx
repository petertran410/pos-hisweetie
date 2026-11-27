"use client";

import { useRef, useState } from "react";
import {
  FileText,
  ImagePlus,
  Loader2,
  Paperclip,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { newProductPriceApi } from "@/lib/api/new-product-price";
import { useUpdateNewProductPrice } from "@/lib/hooks/useNewProductPrice";
import type {
  NppAttachment,
  NppTicketDetail,
} from "@/lib/types/new-product-price";

/** Hình ảnh sản phẩm (thành ảnh hàng hóa khi áp dụng) + tài liệu đính kèm. */
export function NewProductPriceMedia({ ticket }: { ticket: NppTicketDetail }) {
  const update = useUpdateNewProductPrice(ticket.id);
  const canImages = ticket.access.editableFields.includes("images");
  const canDocs = ticket.access.editableFields.includes("documents");
  const images = ticket.images ?? [];
  const documents = ticket.documents ?? [];
  const imageRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"images" | "documents" | null>(
    null,
  );

  const save = (field: "images" | "documents", list: NppAttachment[]) =>
    update.mutate({ [field]: list.length ? list : null });

  const upload = async (
    field: "images" | "documents",
    files: FileList | null,
  ) => {
    if (!files?.length) return;
    setUploading(field);
    try {
      const list = Array.from(files);
      const added =
        field === "images"
          ? await newProductPriceApi.uploadImages(list)
          : await newProductPriceApi.uploadDocuments(list);
      save(field, [...(field === "images" ? images : documents), ...added]);
    } catch (e) {
      toast.error((e as Error).message || "Tải lên thất bại");
    } finally {
      setUploading(null);
    }
  };

  const busy = update.isPending || uploading !== null;

  return (
    <div className="space-y-5 text-sm">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-medium text-gray-800">
            Hình ảnh sản phẩm ({images.length})
          </h4>
          {canImages && (
            <button
              onClick={() => imageRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600 disabled:opacity-50">
              {uploading === "images" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}{" "}
              Thêm ảnh
            </button>
          )}
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => upload("images", e.target.files)}
          />
        </div>
        {images.length === 0 ? (
          <p className="text-gray-400">Chưa có ảnh</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div
                key={img.url}
                className={`relative h-28 w-28 overflow-hidden rounded-lg border ${img.isPrimary ? "border-brand" : ""}`}>
                <a href={img.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.originalName ?? ""}
                    className="h-full w-full object-cover"
                  />
                </a>
                {img.isPrimary && (
                  <span className="absolute left-1 top-1 rounded bg-brand px-1.5 text-[10px] font-medium text-white">
                    Ảnh chính
                  </span>
                )}
                {canImages && (
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    {!img.isPrimary && (
                      <button
                        title="Đặt làm ảnh chính"
                        disabled={busy}
                        onClick={() =>
                          save(
                            "images",
                            images.map((i) => ({
                              ...i,
                              isPrimary: i.url === img.url,
                            })),
                          )
                        }
                        className="rounded bg-white/90 p-1 text-gray-600 hover:text-brand">
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      title="Xóa ảnh"
                      disabled={busy}
                      onClick={() =>
                        save(
                          "images",
                          images.filter((i) => i.url !== img.url),
                        )
                      }
                      className="rounded bg-white/90 p-1 text-gray-600 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-medium text-gray-800">
            Tài liệu đính kèm ({documents.length})
          </h4>
          {canDocs && (
            <button
              onClick={() => docRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600 disabled:opacity-50">
              {uploading === "documents" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}{" "}
              Thêm tài liệu
            </button>
          )}
          <input
            ref={docRef}
            type="file"
            multiple
            hidden
            onChange={(e) => upload("documents", e.target.files)}
          />
        </div>
        {documents.length === 0 ? (
          <p className="text-gray-400">Chưa có tài liệu</p>
        ) : (
          <ul className="space-y-1.5">
            {documents.map((d) => (
              <li key={d.url} className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline">
                  {d.originalName || d.url.split("/").pop()}
                </a>
                {canDocs && (
                  <button
                    title="Xóa tài liệu"
                    disabled={busy}
                    onClick={() =>
                      save(
                        "documents",
                        documents.filter((x) => x.url !== d.url),
                      )
                    }
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
