import { printTemplatesApi } from "@/lib/api/print-templates";

export async function printEntity(
  templateFor: string,
  entityId: number
): Promise<void> {
  const templates = await printTemplatesApi.getAll({
    templateFor,
    isActive: true,
  });

  if (!templates?.length) {
    throw new Error(`Chưa có mẫu in cho loại "${templateFor}"`);
  }

  const template = templates.find((t: any) => t.isDefault) || templates[0];

  const preview = await printTemplatesApi.renderPreview(template.id, entityId);

  if (!preview?.content) {
    throw new Error("Không render được nội dung in");
  }

  const paperSize = template.paperSize || "A5";

  // Tạo iframe ẩn trong trang hiện tại
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Không tạo được iframe in");
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    @page { size: ${paperSize}; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #000;
      padding: 0 5mm;
    }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 8px; }
    h1, h2, h3 { margin: 8px 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>${preview.content}</body>
</html>`);
  doc.close();

  // Đợi render xong rồi in, resolve sau khi print dialog đóng
  return new Promise<void>((resolve) => {
    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 100);
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        resolve();
        return;
      }
      win.focus();
      win.print(); // blocking trên hầu hết browser — chờ user đóng print dialog
      cleanup();
      resolve();
    };
  });
}

const PENDING_PRINT_KEY = "pending-print";

/**
 * Lưu yêu cầu in để trang đích sau redirect tự xử lý.
 * Nếu followUpDelivery = true, sau khi in xong sẽ tự động in phiếu giao hàng.
 */
export function queuePrintAfterRedirect(
  templateFor: string,
  entityId: number,
  options?: { followUpDelivery?: boolean }
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    PENDING_PRINT_KEY,
    JSON.stringify({ templateFor, entityId, followUpDelivery: options?.followUpDelivery ?? false })
  );
}

/**
 * Đọc và xóa yêu cầu in pending. Trả về null nếu không có.
 */
export function consumePendingPrint(): {
  templateFor: string;
  entityId: number;
  followUpDelivery?: boolean;
} | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_PRINT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_PRINT_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * In phiếu giao hàng dùng chung 1 template cho cả order lẫn invoice.
 * Template được lưu với templateFor: 'delivery'.
 * entityType truyền vào backend để dùng đúng loader.
 */
export async function printDeliverySlip(
  entityType: "order" | "invoice",
  entityId: number
): Promise<void> {
  const templates = await printTemplatesApi.getAll({
    templateFor: "delivery",
    isActive: true,
  });

  if (!templates?.length) {
    throw new Error("Chưa có mẫu in phiếu giao hàng");
  }

  const template = templates.find((t: any) => t.isDefault) || templates[0];
  const resolvedEntityType =
    entityType === "order" ? "order_delivery" : "invoice_delivery";

  const preview = await printTemplatesApi.renderPreview(
    template.id,
    entityId,
    resolvedEntityType
  );

  if (!preview?.content) {
    throw new Error("Không render được nội dung in");
  }

  const paperSize = template.paperSize || "A5";
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Không tạo được iframe in");
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperSize}; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 0 5mm; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 8px; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>${preview.content}</body>
</html>`);
  doc.close();

  const cleanup = () =>
    setTimeout(() => iframe.parentNode?.removeChild(iframe), 100);
  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.focus();
    win.print();
    cleanup();
  };
}
