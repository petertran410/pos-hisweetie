"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Loader2 } from "lucide-react";
import { printTemplatesApi } from "@/lib/api/print-templates";

interface MobilePrintPreviewModalProps {
  templateFor: string;
  entityId: number;
  entityType?: string; // Dùng cho delivery: truyền "order_delivery" hoặc "invoice_delivery"
  onClose: () => void;
}

export function MobilePrintPreviewModal({
  templateFor,
  entityId,
  entityType,
  onClose,
}: MobilePrintPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [srcDoc, setSrcDoc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        setIframeLoaded(false);

        const templates = await printTemplatesApi.getAll({
          templateFor,
          isActive: true,
        });

        if (!templates?.length) {
          throw new Error(`Chưa có mẫu in cho loại "${templateFor}"`);
        }

        const template =
          templates.find((t: any) => t.isDefault) || templates[0];
        const preview = await printTemplatesApi.renderPreview(
          template.id,
          entityId,
          entityType
        );

        if (!preview?.content) throw new Error("Không render được nội dung in");

        if (!cancelled) {
          const paperSize = template.paperSize || "A5";
          // Build full HTML string → gán vào srcDoc, browser tự load
          setSrcDoc(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${paperSize}; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #000; padding: 0 5mm; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 8px; }
    h1, h2, h3 { margin: 8px 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>${preview.content}</body>
</html>`);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Không thể tải mẫu in");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [templateFor, entityId]);

  // User gesture → window.print() hoạt động trên mobile
  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white w-full flex flex-col rounded-t-2xl h-[90dvh]">
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
          <span className="font-semibold text-sm">Xem trước phiếu in</span>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2 relative">
          {/* Loading overlay — hiện cho đến khi iframe onLoad fired */}
          {(isLoading || (srcDoc && !iframeLoaded)) && !error && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-gray-500 bg-gray-50 z-10">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm px-4 text-center">
              {error}
            </div>
          )}

          {/* iframe chỉ render khi có srcDoc, ẩn cho đến khi onLoad */}
          {srcDoc && (
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              onLoad={() => setIframeLoaded(true)}
              className="w-full bg-white border rounded shadow"
              style={{
                height: "100%",
                minHeight: 400,
                opacity: iframeLoaded ? 1 : 0,
              }}
              title="print-preview"
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-600">
            Đóng
          </button>
          <button
            onClick={handlePrint}
            disabled={!iframeLoaded}
            className="flex-1 py-2.5 bg-brand text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Printer className="w-4 h-4" />
            In phiếu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
