import { printTemplatesApi } from "@/lib/api/print-templates";

const ITEM_TABLE_HEADER_GROUPS = [
  ["san pham", "ten hang", "hang hoa", "ma hang"],
  ["don gia"],
  ["so luong", "sl"],
  ["don vi", "dvt"],
  ["thanh tien"],
];
function normalizePrintText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDirectCells(row: HTMLTableRowElement): HTMLTableCellElement[] {
  return Array.from(row.children).filter(
    (child): child is HTMLTableCellElement =>
      child instanceof HTMLTableCellElement &&
      (child.tagName === "TD" || child.tagName === "TH")
  );
}

function createSerialCell(
  document: Document,
  sourceCell: HTMLTableCellElement,
  value: string
): HTMLTableCellElement {
  const serialCell = document.createElement(
    sourceCell.tagName.toLowerCase()
  ) as HTMLTableCellElement;
  serialCell.textContent = value;
  serialCell.removeAttribute("width");
  serialCell.style.cssText =
    "width:1%;min-width:0;max-width:1%;padding-left:4px;padding-right:4px;" +
    "text-align:center;white-space:nowrap;font-size:10px;";
  return serialCell;
}

function addSerialColumnDefinition(
  document: Document,
  table: HTMLTableElement
): void {
  let colGroup = Array.from(table.children).find(
    (child): child is HTMLElement => child.tagName.toLowerCase() === "colgroup"
  );

  if (!colGroup) {
    colGroup = document.createElement("colgroup");
    table.insertBefore(colGroup, table.firstChild);
  }

  const serialColumn = document.createElement("col");
  serialColumn.setAttribute("width", "1%");
  serialColumn.style.width = "1%";
  serialColumn.style.minWidth = "0";
  colGroup.insertBefore(serialColumn, colGroup.firstChild);
}

/**
 * The item table is stored as an editable HTML template, so the serial-number
 * column is added after the backend has rendered the template. This keeps
 * existing saved templates working without changing their stored content.
 */
export function addPrintSerialNumberColumn(
  content: string,
  templateFor: string
): string {
  if (
    !content ||
    (templateFor !== "order" && templateFor !== "invoice") ||
    typeof DOMParser === "undefined"
  ) {
    return content;
  }

  const document = new DOMParser().parseFromString(
    `<div id="print-root">${content}</div>`,
    "text/html"
  );
  const root = document.querySelector("#print-root");
  if (!root) return content;

  const tables = Array.from(root.querySelectorAll("table"));
  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tr")).filter(
      (row) => row.closest("table") === table
    ) as HTMLTableRowElement[];

    const headerRow = rows.find((row) => {
      const cells = getDirectCells(row);
      if (cells.length < 3) return false;

      const headerText = normalizePrintText(row.textContent || "");
      const matchedGroups = ITEM_TABLE_HEADER_GROUPS.filter((group) =>
        group.some((header) => headerText.includes(header))
      ).length;

      return matchedGroups >= 3;
    });

    if (!headerRow) continue;

    const headerCells = getDirectCells(headerRow);
    const hasSerialNumber = headerCells.some((cell) =>
      normalizePrintText(cell.textContent || "").includes("stt")
    );
    if (hasSerialNumber) return root.innerHTML;

    addSerialColumnDefinition(document, table);

    const headerCell = createSerialCell(document, headerCells[0], "STT");
    headerRow.insertBefore(headerCell, headerRow.firstChild);

    let serialNumber = 1;
    const headerIndex = rows.indexOf(headerRow);
    for (const row of rows.slice(headerIndex + 1)) {
      const cells = getDirectCells(row);
      const hasColspan = cells.some((cell) => cell.hasAttribute("colspan"));
      if (!cells.length || hasColspan || cells.length !== headerCells.length) {
        continue;
      }

      const serialCell = createSerialCell(
        document,
        cells[0],
        String(serialNumber++)
      );
      row.insertBefore(serialCell, row.firstChild);
    }

    return root.innerHTML;
  }

  return content;
}

export function buildPrintDocumentHtml(
  content: string,
  pageSize?: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    @page { ${pageSize ? `size: ${pageSize}; ` : ""}margin: 8mm; }
    html, body {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #000;
      overflow-wrap: anywhere;
    }
    .print-content {
      width: 100%;
      max-width: 100%;
    }
    table {
      width: 100% !important;
      max-width: 100% !important;
      border-collapse: collapse;
    }
    td, th { padding: 4px 8px; }
    h1, h2, h3 { margin: 8px 0; }
    img, svg, canvas {
      max-width: 100% !important;
      height: auto;
    }
    * { box-sizing: border-box; }
  </style>
</head>
<body><div class="print-content">${content}</div></body>
</html>`;
}

export async function printEntity(
  templateFor: string,
  entityId: number,
  templateId?: number
): Promise<void> {
  const templates = await printTemplatesApi.getAll({
    templateFor,
    isActive: true,
  });

  if (!templates?.length) {
    throw new Error(`Chưa có mẫu in cho loại "${templateFor}"`);
  }

  // Ưu tiên mẫu được chỉ định; fallback mẫu mặc định / mẫu đầu tiên.
  const template =
    (templateId && templates.find((t: any) => t.id === templateId)) ||
    templates.find((t: any) => t.isDefault) ||
    templates[0];

  const preview = await printTemplatesApi.renderPreview(template.id, entityId);

  if (!preview?.content) {
    throw new Error("Không render được nội dung in");
  }

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
  doc.write(
    buildPrintDocumentHtml(
      addPrintSerialNumberColumn(preview.content, templateFor)
    )
  );
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
    JSON.stringify({
      templateFor,
      entityId,
      followUpDelivery: options?.followUpDelivery ?? false,
    })
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
  doc.write(buildPrintDocumentHtml(preview.content));
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

/**
 * In phiếu hoàn hàng ký gửi (template code KG_RETURN, templateFor 'consignment').
 * entityType 'consignment_return' để backend dùng đúng loader.
 */
export async function printConsignmentReturn(returnId: number): Promise<void> {
  const template: any = await printTemplatesApi.getByCode("KG_RETURN");
  if (!template?.id) {
    throw new Error("Chưa có mẫu in phiếu hoàn hàng ký gửi");
  }

  const preview = await printTemplatesApi.renderPreview(
    template.id,
    returnId,
    "consignment_return"
  );

  if (!preview?.content) {
    throw new Error("Không render được nội dung in");
  }

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
  doc.write(buildPrintDocumentHtml(preview.content));
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

/**
 * In phiếu xuất kho theo hóa đơn thực tế (templateFor 'warehouse_export').
 * Khổ giấy lấy theo mẫu in (mặc định A4 dọc) — chọn "Lưu dưới dạng PDF" trong
 * hộp thoại in để xuất PDF.
 */
export async function printWarehouseExport(invoiceId: number): Promise<void> {
  const templates = await printTemplatesApi.getAll({
    templateFor: "warehouse_export",
    isActive: true,
  });

  if (!templates?.length) {
    throw new Error("Chưa có mẫu in phiếu xuất kho");
  }

  const template = templates.find((t: any) => t.isDefault) || templates[0];
  const preview = await printTemplatesApi.renderPreview(template.id, invoiceId);

  if (!preview?.content) {
    throw new Error("Không render được nội dung in");
  }

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Không tạo được iframe in");
  }

  const pageSize = `${template.paperSize || "A4"} ${
    template.orientation || "portrait"
  }`;
  doc.open();
  doc.write(buildPrintDocumentHtml(preview.content, pageSize));
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
