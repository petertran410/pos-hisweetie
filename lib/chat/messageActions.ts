import { toast } from "sonner";
import { API_URL, getAuthHeaders } from "@/lib/config/api";
import type { ChatMessage } from "@/lib/types/smaxChat";
import { isImage, isVideo } from "@/components/chat/AttachmentPreviewModal";

const byTime = (list: ChatMessage[]) =>
  [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

/** Trích đoạn ngắn của tin (để hiện "Đang trả lời…"): loại nội dung + chữ, vd "[Hình ảnh] giá sỉ". */
export function messagePreview(m: ChatMessage): string {
  const text = m.text.trim();
  const tag = m.stickerId
    ? "[Sticker]"
    : m.attachments.some(isImage)
      ? "[Hình ảnh]"
      : m.attachments.some(isVideo)
        ? "[Video]"
        : m.attachments.length
          ? `[Tệp] ${m.attachments[0].title}`
          : "";
  if (!tag) return text ? text.slice(0, 120) : "[Tin nhắn]";
  return (text ? `${tag} ${text}` : tag).slice(0, 120);
}

/** Ảnh nhỏ của tin (ảnh/video có thumbnail) để hiện trong trích dẫn. */
export function messageThumb(m: ChatMessage): string | null {
  const a = m.attachments.find((x) => x.thumbnail || isImage(x));
  return a ? a.thumbnail || a.url : null;
}

/** Sao chép chữ của các tin (theo thứ tự thời gian). */
export async function copyMessages(list: ChatMessage[]) {
  const text = byTime(list)
    .map((m) => m.text.trim())
    .filter(Boolean)
    .join("\n");
  if (!text) {
    toast.info("Các tin đã chọn không có chữ để sao chép");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // http (IP nội bộ) / trình duyệt nhúng không có Clipboard API → cách cũ
    if (!legacyCopy(text)) {
      toast.error("Trình duyệt chặn sao chép");
      return;
    }
  }
  toast.success(list.length > 1 ? `Đã sao chép ${list.length} tin` : "Đã sao chép");
}

function legacyCopy(text: string) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

/** Nội dung chuyển tiếp: chữ gộp, ảnh/tệp theo link Zalo, sticker (khi chỉ 1 tin sticker). */
export function forwardContent(list: ChatMessage[]) {
  const sorted = byTime(list);
  const text = sorted
    .map((m) => m.text.trim())
    .filter(Boolean)
    .join("\n");
  const forwardMedia = sorted
    .flatMap((m) => m.attachments)
    .filter((a) => a.url)
    .map((a) => ({ url: a.url, kind: isImage(a) ? ("image" as const) : ("file" as const) }))
    .slice(0, 10);
  const stickers = sorted.filter((m) => m.stickerId);
  return {
    text: text || undefined,
    forwardMedia: forwardMedia.length ? forwardMedia : undefined,
    stickerId: stickers.length === 1 && !text && !forwardMedia.length ? stickers[0].stickerId! : undefined,
  };
}

/** Tải ảnh/tệp của các tin qua backend (ảnh Zalo bị CORS + chặn hotlink khi tải thẳng). */
export async function downloadMessagesMedia(list: ChatMessage[]) {
  const files = byTime(list).flatMap((m) =>
    m.attachments
      .filter((a) => a.url)
      .map((a, i) => ({ url: a.url, name: fileName(a.title, a.url, a.type, m.createdAt, i) }))
  );
  if (!files.length) {
    toast.info("Các tin đã chọn không có ảnh / tệp");
    return;
  }
  let ok = 0;
  for (const f of files) {
    try {
      const res = await fetch(`${API_URL}/smax/chat/media?url=${encodeURIComponent(f.url)}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(String(res.status));
      const href = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = href;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
      ok++;
    } catch {
      // bỏ qua tệp lỗi, báo tổng ở cuối
    }
  }
  if (ok === files.length) toast.success(`Đã tải ${ok} tệp`);
  else toast.warning(`Đã tải ${ok}/${files.length} tệp`);
}

function fileName(title: string, url: string, type: string, createdAt: string, i: number) {
  if (title && /\.\w{2,5}$/.test(title)) return title;
  const fromUrl = url.split("?")[0].split("/").pop() ?? "";
  if (/\.\w{2,5}$/.test(fromUrl)) return fromUrl;
  const stamp = new Date(createdAt).toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return `zalo-${stamp}-${i + 1}.${/image|photo/.test(type) ? "jpg" : type === "video" ? "mp4" : "bin"}`;
}
