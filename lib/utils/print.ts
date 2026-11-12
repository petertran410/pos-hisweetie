import { API_URL, getAuthHeaders } from "@/lib/config/api";
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
/** Chữ của dòng tiêu đề bảng hàng hoá: khớp ≥3 nhóm tên cột quen thuộc (Sản phẩm, SL, Đơn giá…). */
function isItemTableHeaderText(text: string): boolean {
  const headerText = normalizePrintText(text);
  return (
    ITEM_TABLE_HEADER_GROUPS.filter((group) => group.some((header) => headerText.includes(header)))
      .length >= 3
  );
}

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

    const headerRow = rows.find(
      (row) => getDirectCells(row).length >= 3 && isItemTableHeaderText(row.textContent || "")
    );

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

/** Chọn mẫu in (chỉ định → mặc định → đầu tiên) và render nội dung cho entity. */
async function renderEntityPrint(
  templateFor: string,
  entityId: number,
  templateId?: number
): Promise<{
  template: { id: number; paperSize?: string | null; orientation?: string | null };
  content: string;
}> {
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
  return { template, content: preview.content };
}

export async function printEntity(
  templateFor: string,
  entityId: number,
  templateId?: number
): Promise<void> {
  const { content } = await renderEntityPrint(templateFor, entityId, templateId);

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
      addPrintSerialNumberColumn(content, templateFor)
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

// Khổ giấy (mm, dọc) để chụp bản in thành ảnh; khổ lạ → A5
const PAPER_MM: Record<string, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
};
const PX_PER_MM = 96 / 25.4;

/** Ảnh trong mẫu in → data URL (CORS trực tiếp, không được thì qua backend); lỗi → null. */
async function imageToDataUrl(src: string): Promise<string | null> {
  if (src.startsWith("data:")) return src;
  const toDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  try {
    const res = await fetch(src, { mode: "cors" });
    if (res.ok) return toDataUrl(await res.blob());
  } catch {
    // host không cho CORS (vd ảnh QR VietQR) → tải qua backend
  }
  try {
    const res = await fetch(
      `${API_URL}/smax/chat/media?url=${encodeURIComponent(src)}`,
      { headers: getAuthHeaders() }
    );
    if (res.ok) return toDataUrl(await res.blob());
  } catch {
    // bỏ ảnh, vẫn chụp phần còn lại
  }
  return null;
}

type PrintUnit = { el: HTMLElement; top: number; bottom: number; header: boolean; table: Element | null };

/**
 * Khối không cắt ngang khi chia trang: dòng bảng, ảnh, phần tử không chứa khối con
 * (đoạn chữ, ô thông tin…). Đo vị trí trong iframe đã dựng bản in.
 */
function printUnits(doc: Document): PrintUnit[] {
  const win = doc.defaultView!;
  const atomic = (el: Element) => el.tagName === "TR" || el.tagName === "IMG";
  const hasBlockInside = (el: Element) =>
    [...el.querySelectorAll("*")].some(
      (d) => atomic(d) || (d.tagName !== "COL" && !win.getComputedStyle(d).display.startsWith("inline"))
    );
  // Phần tử trong iframe khác realm → so tagName, không dùng instanceof
  const cells = (tr: Element) => [...tr.children].filter((c) => c.tagName === "TD" || c.tagName === "TH");
  const units: HTMLElement[] = [];
  const walk = (el: HTMLElement) => {
    // Định nghĩa cột cao bằng cả bảng, ẩn đi là mất cột → luôn giữ
    if (el.tagName === "COLGROUP" || el.tagName === "COL") return;
    if (atomic(el) || !hasBlockInside(el)) units.push(el);
    else for (const c of el.children) walk(c as HTMLElement);
  };
  for (const c of doc.body.children) walk(c as HTMLElement);
  return units
    .map((el) => {
      const r = el.getBoundingClientRect();
      const header =
        el.tagName === "TR" &&
        (el.parentElement?.tagName === "THEAD" ||
          (cells(el).length > 0 && cells(el).every((c) => c.tagName === "TH")) ||
          (cells(el).length >= 3 && isItemTableHeaderText(el.textContent || "")));
      return { el, top: r.top, bottom: r.bottom, header, table: el.closest("table") };
    })
    .filter((u) => u.bottom > u.top);
}

/**
 * Chia khối theo trang: trang 1 dùng tối đa `first` px tính từ đầu tài liệu (đã gồm lề trên),
 * các trang sau tối đa `next` px; bảng bị tách thì lặp lại dòng tiêu đề ở trang sau.
 */
function paginate(units: PrintUnit[], first: number, next: number): PrintUnit[][] {
  const pages: PrintUnit[][] = [];
  let cur: PrintUnit[] = [];
  let start = 0;
  let extra = 0;
  for (const u of units) {
    if (!u.header && cur.some((c) => !c.header) && u.bottom - start + extra > (pages.length ? next : first)) {
      pages.push(cur);
      const header = units.filter((h) => h.header && u.table && h.table === u.table);
      cur = [...header];
      extra = header.reduce((n, h) => n + h.bottom - h.top, 0);
      start = u.top;
    }
    cur.push(u);
  }
  pages.push(cur);
  return pages;
}

export async function renderPrintImage(
  templateFor: "invoice" | "order",
  entityId: number,
  fileName: string
): Promise<File[]> {
  const { template, content } = await renderEntityPrint(templateFor, entityId);
  const [w, h] = PAPER_MM[String(template.paperSize).toUpperCase()] ?? PAPER_MM.A5;
  const [pageW, pageH] = template.orientation === "landscape" ? [h, w] : [w, h];
  const width = Math.round(pageW * PX_PER_MM);

  // Ảnh ngoài làm "bẩn" canvas → nhúng thẳng data URL
  const parsed = new DOMParser().parseFromString(
    addPrintSerialNumberColumn(content, templateFor),
    "text/html"
  );
  await Promise.all(
    [...parsed.images].map(async (img) => {
      const data = await imageToDataUrl(img.src);
      if (data) img.src = data;
      else img.remove();
    })
  );

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:10px;border:0;visibility:hidden`;
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Không tạo được iframe chụp bản in");
    const loaded = new Promise((resolve) => {
      iframe.onload = resolve;
      setTimeout(resolve, 3000);
    });
    doc.open();
    doc.write(
      buildPrintDocumentHtml(parsed.body.innerHTML).replace(
        "</head>",
        // Lề giấy như khi in (@page margin) + nền trắng
        "<style>body{padding:8mm;background:#fff}</style></head>"
      )
    );
    doc.close();
    await loaded;
    const pageHeight = Math.round(pageH * PX_PER_MM);
    // Lề trên/dưới mỗi trang = padding của body (8mm)
    const margin = Math.round(8 * PX_PER_MM);
    const units = printUnits(doc);
    const pages = paginate(units, pageHeight - margin, pageHeight - 2 * margin);

    // x2 cho chữ nét khi khách phóng to trên Zalo
    const scale = 2;
    const files: File[] = [];
    for (let i = 0; i < pages.length; i++) {
      const keep = new Set(pages[i].map((u) => u.el));
      const saved = units.map((u) => u.el.style.display);
      units.forEach((u) => {
        if (!keep.has(u.el)) u.el.style.display = "none";
      });
      const xhtml = new XMLSerializer().serializeToString(doc.documentElement);
      units.forEach((u, k) => (u.el.style.display = saved[k]));

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${pageHeight}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = pageHeight * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0);
      if (pages.length > 1) {
        ctx.fillStyle = "#666";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`Trang ${i + 1}/${pages.length}`, width - margin, pageHeight - margin / 2);
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Không chụp được bản in");
      const name = pages.length > 1 ? `${fileName}-${i + 1}.png` : `${fileName}.png`;
      files.push(new File([blob], name, { type: "image/png" }));
    }
    return files;
  } finally {
    iframe.remove();
  }
}
