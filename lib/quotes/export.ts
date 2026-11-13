/**
 * Xuất báo giá không cần thư viện ngoài:
 * - PDF: in HTML của bản xem trước qua iframe ẩn (A4) → "Lưu dưới dạng PDF".
 * - Ảnh: vẽ HTML qua SVG foreignObject lên canvas → PNG → clipboard (gửi Zalo).
 */
import { API_URL, getAuthHeaders } from "@/lib/config/api";

const PAGE_CSS =
  "@page{size:A4;margin:0}html,body{margin:0;background:#fff}" +
  "img{max-width:100%}thead{display:table-header-group}tr{page-break-inside:avoid}";

function docHtml(body: string, title: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PAGE_CSS}</style></head><body>${body}</body></html>`;
}

/** In bản xem trước (người dùng chọn "Lưu dưới dạng PDF" trong hộp thoại in). */
export async function printQuote(node: HTMLElement, title: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  // Ảnh tương đối (/brands/...) cần base để iframe tải được.
  doc.write(docHtml(node.outerHTML, title).replace("<head>", `<head><base href="${location.origin}/">`));
  doc.close();
  await Promise.all(
    [...doc.images].map((img) =>
      img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r)))
    )
  );
  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();
  setTimeout(() => iframe.remove(), 1000);
}

async function toDataUrl(src: string): Promise<string | null> {
  const read = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  try {
    const res = await fetch(src, { mode: "cors" });
    if (res.ok) return read(await res.blob());
  } catch {
    // máy chủ ảnh không cho CORS → tải qua backend như lib/utils/print.ts
  }
  try {
    const res = await fetch(`${API_URL}/smax/chat/media?url=${encodeURIComponent(src)}`, {
      headers: getAuthHeaders(),
    });
    if (res.ok) return read(await res.blob());
  } catch {
    // bỏ ảnh này, vẫn chụp phần còn lại
  }
  return null;
}

/** Ảnh PNG (x2) của bản xem trước. */
export async function renderQuotePng(node: HTMLElement): Promise<Blob> {
  const clone = node.cloneNode(true) as HTMLElement;
  // Ảnh ngoài làm "bẩn" canvas → nhúng thẳng data URL.
  await Promise.all(
    [...clone.querySelectorAll("img")].map(async (img) => {
      const data = await toDataUrl(new URL(img.getAttribute("src")!, location.origin).href);
      if (data) img.setAttribute("src", data);
      else img.remove();
    })
  );
  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const xhtml = new XMLSerializer().serializeToString(clone);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(image, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Không tạo được ảnh"))), "image/png")
  );
}

/**
 * Chép ảnh báo giá vào clipboard để dán vào Zalo. Không gửi gì đi.
 * Trình duyệt chặn clipboard → tải file PNG xuống thay thế. Trả về cách đã làm.
 */
export async function copyQuoteImage(node: HTMLElement, fileName: string): Promise<"copied" | "downloaded"> {
  // Safari cần truyền Promise vào ClipboardItem ngay trong cử chỉ người dùng.
  const png = renderQuotePng(node);
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return "copied";
  } catch {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await png);
    a.download = `${fileName}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return "downloaded";
  }
}
