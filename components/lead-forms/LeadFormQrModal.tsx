"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "react-qr-code";
import { Download, QrCode, X } from "lucide-react";
import { downloadQrPng } from "./LeadFormShareModal";
import { LEAD_FORM_QR_URL, type LeadForm } from "@/lib/types/leadForm";
import { QUOTE_DEFAULT_LOGO } from "@/lib/types/quote";

/** Logo giữa QR chung. */
const QR_LOGO = QUOTE_DEFAULT_LOGO;

/** QR chung cố định (in một lần) — trỏ tới form đang gắn ở cột "QR chung". */
export function LeadFormQrModal({ target, onClose }: { target: LeadForm | null; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand" /> QR chung
          </h2>
          <button onClick={onClose} aria-label="Đóng" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 flex flex-col items-center gap-3 text-center">
          <div className="relative rounded border bg-white p-3">
            {/* level H: chịu che ~30% — logo ở giữa vẫn quét được */}
            <div ref={qrRef}>
              <QRCode value={LEAD_FORM_QR_URL} size={200} level="H" />
            </div>
            <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={QR_LOGO} alt="LerMao" className="h-full w-full object-contain" />
            </div>
          </div>
          <a href={LEAD_FORM_QR_URL} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline">
            {LEAD_FORM_QR_URL.replace("https://", "")}
          </a>
          <p className="text-sm text-gray-700">
            Đang trỏ tới:{" "}
            {target ? <b>{target.name}</b> : <span className="text-gray-500">chưa gắn form (khách thấy “Form tạm đóng”)</span>}
          </p>
          {target && !target.isActive && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Form này đang tắt — khách quét QR sẽ thấy “Form tạm đóng”.
            </p>
          )}
          <p className="text-xs text-gray-500">
            In QR này một lần. Đổi chương trình thì tick form khác ở cột “QR chung”, không cần in lại.
          </p>
          <button
            onClick={() => downloadQrPng(qrRef.current, "qr-leadform.png", QR_LOGO)}
            className="inline-flex items-center gap-1 rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
            <Download className="h-4 w-4" /> Tải QR (PNG)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
