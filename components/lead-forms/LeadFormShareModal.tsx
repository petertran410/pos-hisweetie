"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { Copy, Download, ExternalLink, Share2, X } from "lucide-react";
import { toast } from "sonner";
import type { LeadForm } from "@/lib/types/leadForm";

/** Chia sẻ form: link công khai, mã nhúng iframe, QR (tải PNG để in cho hội chợ / workshop). */
export function LeadFormShareModal({ form, onClose }: { form: LeadForm; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/f/${form.slug}`;
  const embed = `<iframe src="${url}?embed=1" title="${form.title.replace(/"/g, "&quot;")}" style="width:100%;min-height:760px;border:0" loading="lazy"></iframe>`;

  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Đã copy ${what}`),
      () => toast.error("Không copy được")
    );

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const pad = 64;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size + pad * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, size, size);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${form.slug}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  };

  const box = "flex items-start gap-2 rounded border bg-gray-50 px-2.5 py-2 text-xs font-mono break-all";
  const btn = "inline-flex shrink-0 items-center gap-1 rounded border bg-white px-2 py-1 text-xs hover:bg-gray-50";

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-brand" />
            Chia sẻ — {form.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 flex flex-col sm:flex-row gap-5">
          <div className="min-w-0 flex-1 space-y-4">
            {!form.isActive && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Form đang tắt — khách mở link sẽ thấy “Form không tồn tại hoặc đã đóng”.
              </p>
            )}
            <div>
              <div className="mb-1 text-xs font-medium text-gray-600">Link công khai</div>
              <div className={box}>
                <span className="flex-1">{url}</span>
                <button onClick={() => copy(url, "link")} className={btn}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <a href={url} target="_blank" rel="noreferrer" className={btn}>
                  <ExternalLink className="h-3.5 w-3.5" /> Mở
                </a>
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-gray-600">Mã nhúng website / landing page</div>
              <div className={box}>
                <span className="flex-1">{embed}</span>
                <button onClick={() => copy(embed, "mã nhúng")} className={btn}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div ref={qrRef} className="rounded border bg-white p-3">
              <QRCode value={url} size={168} />
            </div>
            <button onClick={downloadQr} className={btn}>
              <Download className="h-3.5 w-3.5" /> Tải QR (PNG)
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
