"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";

export function ApprovalRequestsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-md bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-base font-semibold">Approval nội bộ</h2>
          <button type="button" title="Đóng" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <Link
          href="/tai-chinh/quy-noi-bo?view=receipts"
          className="mt-4 inline-flex items-center gap-2 text-brand"
        >
          <ExternalLink className="h-4 w-4" /> Quỹ nội bộ
        </Link>
      </div>
    </div>
  );
}
