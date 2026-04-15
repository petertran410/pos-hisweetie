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
