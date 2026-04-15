import { printTemplatesApi } from "@/lib/api/print-templates";

/**
 * Load default template + render với entityId thật + mở dialog in browser
 */
export async function printEntity(
  templateFor: string,
  entityId: number
): Promise<void> {
  // 1. Lấy danh sách template loại này, tìm default
  const templates = await printTemplatesApi.getAll({
    templateFor,
    isActive: true,
  });

  if (!templates?.length) {
    throw new Error(`Chưa có mẫu in cho loại "${templateFor}"`);
  }

  const template = templates.find((t: any) => t.isDefault) || templates[0];

  // 2. Render với data thật
  const preview = await printTemplatesApi.renderPreview(template.id, entityId);

  if (!preview?.content) {
    throw new Error("Không render được nội dung in");
  }

  // 3. Mở popup + in
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    throw new Error("Trình duyệt chặn popup. Vui lòng cho phép popup.");
  }

  const paperSize = template.paperSize || "A5";

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${template.name}</title>
  <style>
    @page { size: ${paperSize}; margin: 10mm; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 8px; }
    h1, h2, h3 { margin: 8px 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>${preview.content}
<script>
  window.onload = function() {
    window.focus();
    window.print();
    window.onafterprint = function() { window.close(); };
  };
<\/script>
</body>
</html>`);
  win.document.close();
}
