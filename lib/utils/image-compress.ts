/**
 * Nén ảnh phía client TRƯỚC khi upload.
 *
 * Lý do: điện thoại chụp ra ảnh gốc 3–12MB. Đẩy nguyên file qua mạng di động
 * (Cloudflare → NAS → nginx → Node) là phần chậm nhất của luồng "chụp xong chờ
 * ảnh hiện". Nén xuống ~200–500KB cắt phần lớn thời gian chờ đó.
 *
 * KHÔNG dùng thêm dependency: chỉ createImageBitmap + canvas (có sẵn trên
 * browser). Vì vậy HEIC/HEIF (ảnh iPhone) KHÔNG nén ở client — Chrome/Android
 * không decode được HEIC trên canvas. HEIC vẫn đẩy nguyên về backend, nơi đã
 * có pipeline convert sẵn (upload.service.ts).
 */

/** Khớp cấu hình nén của backend (upload.service.ts: MAX_DIMENSION/JPEG_QUALITY). */
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

/** File nhỏ hơn ngưỡng này thì upload thẳng — nén thêm không đáng công decode. */
const SKIP_COMPRESS_BYTES = 400 * 1024;

/** HEIC/HEIF: canvas không decode được → để backend xử lý. */
const HEIC_MIMES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/** Ảnh iPhone đôi khi tới với mimetype rỗng → nhận diện thêm qua phần mở rộng. */
const isHeicFile = (file: File): boolean => {
  const mime = file.type.toLowerCase();
  if (HEIC_MIMES.has(mime)) return true;
  return /\.(heic|heif)$/i.test(file.name);
};

/** Chỉ nén định dạng canvas encode được ổn định. */
const isCompressibleMime = (mime: string): boolean =>
  mime === "image/jpeg" ||
  mime === "image/jpg" ||
  mime === "image/png" ||
  mime === "image/webp";

/**
 * Decode file ảnh thành ImageBitmap.
 * `imageOrientation: "from-image"` để ảnh chụp dọc không bị quay ngang khi vẽ
 * lên canvas (canvas không tự áp EXIF orientation).
 */
const decodeToBitmap = async (file: File): Promise<ImageBitmap> => {
  return await createImageBitmap(file, { imageOrientation: "from-image" });
};

/** Tính kích thước sau resize, giữ tỉ lệ, không phóng to ảnh nhỏ. */
const fitInside = (
  width: number,
  height: number,
  max: number
): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const ratio = max / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> =>
  new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
  );

/** Đổi phần mở rộng sang .jpg vì output luôn là JPEG. */
const toJpegName = (name: string): string => {
  const idx = name.lastIndexOf(".");
  const base = idx > 0 ? name.slice(0, idx) : name;
  return `${base}.jpg`;
};

/**
 * Nén 1 file ảnh: resize cạnh dài ≤ 1920px, xuất JPEG quality 0.8.
 *
 * An toàn tuyệt đối — mọi trường hợp không nén được đều trả về FILE GỐC thay vì
 * throw, để không bao giờ làm chết luồng upload:
 * - HEIC/HEIF, hoặc mime không nén được
 * - File đã nhỏ (< 400KB)
 * - Lỗi decode / canvas / toBlob
 * - Blob nén ra không nhỏ hơn file gốc
 */
export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (typeof createImageBitmap !== "function") return file;

  if (isHeicFile(file)) return file;
  if (!isCompressibleMime(file.type.toLowerCase())) return file;
  if (file.size < SKIP_COMPRESS_BYTES) return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await decodeToBitmap(file);

    const { width, height } = fitInside(
      bitmap.width,
      bitmap.height,
      MAX_DIMENSION
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, JPEG_QUALITY);
    // Giải phóng pixel buffer của canvas ngay (ảnh lớn tốn nhiều RAM trên mobile).
    canvas.width = 0;
    canvas.height = 0;

    if (!blob) return file;
    // Nén mà không nhỏ hơn thì giữ file gốc (ảnh đã tối ưu sẵn).
    if (blob.size >= file.size) return file;

    return new File([blob], toJpegName(file.name), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // Lỗi decode/encode → dùng file gốc, backend vẫn nén được.
    return file;
  } finally {
    bitmap?.close();
  }
}

/**
 * Nén nhiều file. Chạy TUẦN TỰ có chủ đích: decode ảnh lớn tốn nhiều RAM, nén
 * song song nhiều ảnh trên điện thoại tầm trung dễ khiến tab bị kill.
 */
export async function compressImageFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) {
    out.push(await compressImageFile(file));
  }
  return out;
}
