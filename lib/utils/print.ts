import { printTemplatesApi } from "@/lib/api/print-templates";
import { useSandboxDataStore } from "../store/sandbox-data";
import { useSandboxStore } from "../store/sandbox";

async function printSandboxEntity(
  templateFor: string,
  entityId: number
): Promise<void> {
  const entityMap: Record<string, string> = {
    order: "orders",
    invoice: "invoices",
    return_order: "returnOrders",
  };

  const key = entityMap[templateFor];
  if (!key) throw new Error(`Sandbox chưa hỗ trợ in cho loại "${templateFor}"`);

  const items = useSandboxDataStore.getState().getEntities(key as any);
  const entity = items.find((e: any) => e.id === entityId);
  if (!entity)
    throw new Error(`Không tìm thấy ${templateFor} sandbox #${entityId}`);

  // Lấy template mặc định (vẫn cần gọi API templates)
  const templates = await printTemplatesApi.getAll({
    templateFor,
    isActive: true,
  });
  if (!templates?.length)
    throw new Error(`Chưa có mẫu in cho loại "${templateFor}"`);
  const template = templates.find((t: any) => t.isDefault) || templates[0];

  // Gửi data sandbox lên backend để render qua template
  const preview = await printTemplatesApi.renderWithData(template.id, entity);
  if (!preview?.content) throw new Error("Không render được nội dung in");

  // In — dùng lại logic iframe hiện có
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
<html><head><meta charset="utf-8"/>
<style>
  @page { size: ${paperSize}; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 10mm; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 4px 8px; }
  * { box-sizing: border-box; }
</style>
</head><body>${preview.content}</body></html>`);
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

export async function printEntity(
  templateFor: string,
  entityId: number
): Promise<void> {
  const isSandbox = useSandboxStore.getState().isSandbox;
  if (isSandbox) {
    printSandboxEntity(templateFor, entityId);
    return;
  }

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
      padding: 10mm;
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

  // Đợi render xong rồi in
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
      return;
    }
    win.focus();
    win.print();
    cleanup();
  };
}

const PENDING_PRINT_KEY = "pending-print";

/**
 * Lưu yêu cầu in để trang đích sau redirect tự xử lý.
 */
export function queuePrintAfterRedirect(
  templateFor: string,
  entityId: number
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    PENDING_PRINT_KEY,
    JSON.stringify({ templateFor, entityId })
  );
}

/**
 * Đọc và xóa yêu cầu in pending. Trả về null nếu không có.
 */
export function consumePendingPrint(): {
  templateFor: string;
  entityId: number;
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
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 10mm; }
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
