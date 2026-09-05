"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import Swal from "sweetalert2";
import { DebtOpenTicket, DebtTrackingRow } from "@/lib/api/debt-tracking";
import { useCloseDebtTicket, useDebtTicket } from "@/lib/hooks/useDebtTickets";
import { formatCurrency } from "@/lib/utils";

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

export function StopDeliveryDetailModal({
  row,
  ticket: ticketSummary,
  onClose,
}: {
  row: DebtTrackingRow;
  ticket: DebtOpenTicket;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useDebtTicket(ticketSummary.ticketId);
  const close = useCloseDebtTicket();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closing) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closing, onClose]);

  const current = detail ?? {
    id: ticketSummary.ticketId,
    code: ticketSummary.ticketCode,
    createdAt: "",
    assignee: ticketSummary.assignee,
    isOpen: true,
  };
  const line = detail?.customers.find((item) => item.customerId === row.customerId);
  const required = line?.requiredPaymentAmount ?? ticketSummary.requiredPaymentAmount;
  const paid = line?.paidAmount ?? 0;
  const status = line?.status ?? ticketSummary.lineStatus;

  const handleClose = async () => {
    const result = await Swal.fire({
      title: "Kết thúc ngừng đi hàng?",
      text: "Kết thúc thủ công sẽ cho phép khách đi hàng trở lại, không phụ thuộc đã thu đủ hay chưa.",
      input: "textarea",
      inputPlaceholder: "Lý do kết thúc…",
      showCancelButton: true,
      confirmButtonText: "Kết thúc",
      cancelButtonText: "Hủy",
      inputValidator: (value) => (!value?.trim() ? "Vui lòng nhập lý do" : undefined),
    });
    if (!result.isConfirmed || !result.value) return;
    setClosing(true);
    close.mutate(
      { id: current.id, reason: result.value, finalStatus: "DONE" },
      { onSuccess: onClose, onSettled: () => setClosing(false) }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => event.target === event.currentTarget && !closing && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-lg">Ngừng đi hàng · {current?.code ?? ticketSummary.ticketCode}</h2>
            <p className="text-sm text-gray-500 mt-1">{row.name} {row.code ? `· ${row.code}` : ""}</p>
          </div>
          <button onClick={onClose} disabled={closing} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Snapshot label="Nợ hiện tại" value={formatCurrency(row.totalDebt)} />
                <Snapshot label="Cần thanh toán theo hệ thống" value={formatCurrency(required)} />
                <Snapshot label="Đã nhận" value={formatCurrency(paid)} tone="text-green-700" />
                <Snapshot label="Trạng thái" value={status === "PAID" ? "Đã thu đủ" : status === "PARTIAL" ? "Có tiền về" : "Chưa thu"} />
              </div>
              <div className="rounded-lg border bg-gray-50 p-4 text-sm space-y-2">
                <div className="flex justify-between gap-4"><span className="text-gray-500">Tạo lúc</span><span>{current.createdAt ? fmtDate(current.createdAt) : "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Phụ trách</span><span>{current.assignee?.name ?? "—"}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Mục tiêu thông tin</span><span>{formatCurrency(required)}</span></div>
                {detail?.closeReason && <div className="flex justify-between gap-4"><span className="text-gray-500">Lý do kết thúc</span><span className="text-right">{detail.closeReason}</span></div>}
              </div>
              <p className="text-xs text-gray-500">Khoản “Cần thanh toán theo hệ thống” chỉ là ảnh chụp thông tin, không phải điều kiện bắt buộc để kết thúc. Khoản nhận tiền mới sẽ tự đóng phiếu theo xử lý của hệ thống.</p>
            </>
          )}
        </div>
        {detail?.isOpen && <div className="flex justify-end gap-2 px-5 py-3 border-t"><button onClick={handleClose} disabled={closing || isLoading} className="px-3 py-1.5 rounded bg-brand text-white text-sm disabled:opacity-50">{closing ? "Đang kết thúc…" : "Kết thúc"}</button></div>}
      </div>
    </div>
  );
}

function Snapshot({ label, value, tone = "text-gray-800" }: { label: string; value: string; tone?: string }) {
  return <div className="rounded border p-3"><div className="text-xs text-gray-500">{label}</div><div className={`font-semibold mt-1 tabular-nums ${tone}`}>{value}</div></div>;
}
