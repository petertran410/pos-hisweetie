"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Loader2 } from "lucide-react";
import { printTemplatesApi } from "@/lib/api/print-templates";

interface MobilePrintPreviewModalProps {
  templateFor: string;
  entityId: number;
  onClose: () => void;
}

export function MobilePrintPreviewModal({
  templateFor,
  entityId,
  onClose,
}: MobilePrintPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [paperSize, setPaperSize] = useState("A5");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch template + render content
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);

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
          entityId
        );

        if (!preview?.content) throw new Error("Không render được nội dung in");

        if (!cancelled) {
          setContent(preview.content);
          setPaperSize(template.paperSize || "A5");
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

  // Ghi nội dung vào iframe khi content sẵn sàng
  useEffect(() => {
    if (!content || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

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
    h1, h2, h3 { margin: 8px 0; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>${content}</body>
</html>`);
    doc.close();
  }, [content, paperSize]);

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
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2">
          {isLoading && (
            <div className="flex items-center justify-center h-full gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-red-500 text-sm">
              {error}
            </div>
          )}
          {content && !isLoading && (
            <iframe
              ref={iframeRef}
              className="w-full bg-white border rounded shadow"
              style={{ height: "100%", minHeight: 400 }}
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
            disabled={!content || isLoading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Printer className="w-4 h-4" />
            In phiếu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
