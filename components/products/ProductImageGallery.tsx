"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";

/** Ảnh trong form sản phẩm: ảnh đã lưu (url) hoặc ảnh mới chọn (file). */
export interface ProductImageItem {
  url?: string;
  file?: File;
  preview: string;
  isPrimary: boolean;
}

const MAX_SIZE_MB = 2;

/** Giữ đúng 1 ảnh chính: ảnh đã đánh dấu đầu tiên, không có thì ảnh đầu. */
function ensurePrimary(items: ProductImageItem[]): ProductImageItem[] {
  const index = Math.max(
    0,
    items.findIndex((img) => img.isPrimary)
  );
  return items.map((img, i) => ({ ...img, isPrimary: i === index }));
}

/** Chuyển ảnh từ API sang state của form. */
export function toProductImageItems(
  images?: { image: string; isPrimary?: boolean }[]
): ProductImageItem[] {
  return ensurePrimary(
    (images ?? []).map((img) => ({
      url: img.image,
      preview: img.image,
      isPrimary: !!img.isPrimary,
    }))
  );
}

/** Upload ảnh mới, trả về danh sách URL theo thứ tự + URL ảnh chính. */
export async function uploadProductImages(
  images: ProductImageItem[],
  uploadFile: (file: File) => Promise<string>
): Promise<{ imageUrls: string[]; primaryImageUrl?: string }> {
  const imageUrls: string[] = [];
  let primaryImageUrl: string | undefined;
  for (const img of images) {
    const url = img.file ? await uploadFile(img.file) : img.url;
    if (!url) continue;
    imageUrls.push(url);
    if (img.isPrimary) primaryImageUrl = url;
  }
  return { imageUrls, primaryImageUrl };
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface ProductImageGalleryProps {
  images: ProductImageItem[];
  onChange: Dispatch<SetStateAction<ProductImageItem[]>>;
}

export function ProductImageGallery({
  images,
  onChange,
}: ProductImageGalleryProps) {
  const [viewIndex, setViewIndex] = useState<number | null>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const tooBig = files.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooBig.length > 0) {
      toast.error(`Ảnh vượt quá ${MAX_SIZE_MB}MB, không được thêm`, {
        description: tooBig.map((f) => f.name).join(", "),
      });
    }
    const accepted = files.filter((f) => !tooBig.includes(f));
    if (accepted.length === 0) return;

    const items = await Promise.all(
      accepted.map(async (file) => ({
        file,
        preview: await readAsDataUrl(file),
        isPrimary: false,
      }))
    );
    onChange((prev) => ensurePrimary([...prev, ...items]));
  };

  const removeImage = (index: number) => {
    onChange((prev) => ensurePrimary(prev.filter((_, i) => i !== index)));
  };

  const setPrimary = (index: number) => {
    onChange((prev) =>
      prev.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {images.map((img, index) => (
          <div
            key={index}
            className={`group relative w-36 h-36 rounded-lg border-2 bg-white overflow-hidden ${
              img.isPrimary ? "border-brand" : "border-gray-200"
            }`}>
            <button
              type="button"
              onClick={() => setViewIndex(index)}
              title="Xem ảnh lớn"
              className="w-full h-full cursor-zoom-in">
              <img
                src={img.preview}
                alt=""
                className="w-full h-full object-contain"
              />
            </button>

            <button
              type="button"
              onClick={() => setPrimary(index)}
              title={img.isPrimary ? "Ảnh chính" : "Đặt làm ảnh chính"}
              aria-label={img.isPrimary ? "Ảnh chính" : "Đặt làm ảnh chính"}
              className="absolute top-1.5 left-1.5 w-8 h-8 rounded-full bg-white/95 border border-gray-200 shadow flex items-center justify-center hover:bg-amber-50">
              <Star
                className={`w-4 h-4 ${
                  img.isPrimary
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-500"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => removeImage(index)}
              title="Xóa ảnh"
              aria-label="Xóa ảnh"
              className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-red-500 text-white shadow flex items-center justify-center hover:bg-red-600">
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>

            {img.isPrimary && (
              <span className="pointer-events-none absolute bottom-0 inset-x-0 bg-brand text-white text-xs font-medium text-center py-1">
                Ảnh chính
              </span>
            )}
          </div>
        ))}

        <label className="w-36 h-36 rounded-lg border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 hover:border-brand hover:text-brand">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelect}
            className="hidden"
          />
          <ImagePlus className="w-7 h-7" />
          <span className="text-sm">Thêm ảnh</span>
        </label>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Bấm vào ảnh để xem lớn. Bấm{" "}
        <Star className="inline w-3.5 h-3.5 -mt-0.5 fill-amber-400 text-amber-400" />{" "}
        để chọn ảnh chính (dùng cho bảng giá). Mỗi ảnh không quá {MAX_SIZE_MB}{" "}
        MB.
      </p>

      {viewIndex !== null && images[viewIndex] && (
        <ImageLightbox
          images={images}
          index={viewIndex}
          onIndexChange={setViewIndex}
          onSetPrimary={setPrimary}
          onClose={() => setViewIndex(null)}
        />
      )}
    </div>
  );
}

function ImageLightbox({
  images,
  index,
  onIndexChange,
  onSetPrimary,
  onClose,
}: {
  images: ProductImageItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onSetPrimary: (index: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  const current = images[index];
  const go = (step: number) => onIndexChange((index + step + count) % count);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) go(-1);
      else if (e.key === "ArrowRight" && count > 1) go(1);
      else return;
      // Không để Esc/phím mũi tên lọt ra modal sản phẩm phía sau.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/85 flex flex-col"
      onClick={(e) => {
        // Portal vẫn nổi bọt sự kiện qua cây React → chặn để không chạm modal cha.
        e.stopPropagation();
        onClose();
      }}>
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        onClick={(e) => e.stopPropagation()}>
        <span className="text-sm text-white/80">
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-2">
          {current.isPrimary ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand text-sm font-medium">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
              Ảnh chính
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetPrimary(index)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-sm">
              <Star className="w-4 h-4" />
              Đặt làm ảnh chính
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-16 pb-8">
        <img
          src={current.preview}
          alt=""
          className="max-w-full max-h-full object-contain rounded bg-white"
          onClick={(e) => e.stopPropagation()}
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Ảnh sau"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
