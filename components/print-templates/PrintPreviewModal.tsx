"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { printTemplatesApi } from "@/lib/api/print-templates";
import { invoicesApi } from "@/lib/api/invoices";
import { X, Printer } from "lucide-react";

export function PrintPreviewModal({ template, onClose }: any) {
  const [invoiceId, setInvoiceId] = useState("");

  const { data: sampleInvoices } = useQuery({
    queryKey: ["invoices-sample"],
    queryFn: () => invoicesApi.getInvoices({ limit: 10 }),
  });

  const { data: preview, isLoading } = useQuery({
    queryKey: ["preview", template?.id, invoiceId],
    queryFn: () =>
      invoiceId
        ? printTemplatesApi.renderPreview(template.id, +invoiceId)
        : null,
    enabled: !!invoiceId,
  });

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 20mm; font-family: Arial; }
          </style>
        </head>
        <body>${preview?.content || ""}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Xem trước: {template.name}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-full border rounded px-3 py-2">
            <option value="">Chọn hóa đơn mẫu</option>
            {sampleInvoices?.data.map((inv: any) => (
              <option key={inv.id} value={inv.id}>
                {inv.code} - {inv.customer?.name || "Khách lẻ"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-50">
          {isLoading ? (
            <div className="text-center py-8">Đang tải...</div>
          ) : preview ? (
            <div
              className="bg-white shadow-lg p-8 max-w-[210mm] mx-auto"
              dangerouslySetInnerHTML={{ __html: preview.content }}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Chọn hóa đơn để xem trước
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Đóng
          </button>
          <button
            onClick={handlePrint}
            disabled={!preview}
            className="px-4 py-2 bg-brand text-white rounded-lg flex items-center gap-2">
            <Printer className="w-4 h-4" />
            In thử
          </button>
        </div>
      </div>
    </div>
  );
}
