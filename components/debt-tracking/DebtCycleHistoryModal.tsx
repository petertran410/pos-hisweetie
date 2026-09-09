"use client";

import { X, Loader2, Inbox } from "lucide-react";
import { useDebtCycles } from "@/lib/hooks/useDebtTracking";
import { formatCurrency } from "@/lib/utils";
import {
  DEBT_STATUS_LABELS,
  type DebtStatus,
} from "@/lib/api/debt-tracking";

const CLOSE_MODE_LABELS: Record<string, string> = {
  MANUAL: "Thủ công",
  AUTO_PAYMENT: "Tự động khi thanh toán đủ",
};

const fmtDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const fmtDate = (value: string | null) => {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  if (year && month && day) return `${day}/${month}/${year}`;
  return new Date(value).toLocaleDateString("vi-VN");
};

export function DebtCycleHistoryModal({
  customerId,
  customerName,
  onClose,
}: {
  customerId: number;
  customerName: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useDebtCycles(customerId);
  const cycles = data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="font-medium">Lịch sử chu kỳ theo dõi</div>
            <div className="text-xs text-gray-500">{customerName}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded"
            aria-label="Đóng">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : cycles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Inbox className="w-10 h-10 mb-2" />
              <p className="text-sm">Chưa có chu kỳ nào được lưu</p>
            </div>
          ) : (
            cycles.map((cycle) => {
              const snapshot = cycle.snapshot;
              return (
                <div
                  key={cycle.id}
                  className="border rounded-lg p-3 bg-gray-50/60 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {fmtDateTime(cycle.startedAt)} →{" "}
                        {fmtDateTime(cycle.closedAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {CLOSE_MODE_LABELS[cycle.closeMode ?? ""] ??
                          "Không rõ cách đóng"}
                        {cycle.closedBy?.name
                          ? ` · ${cycle.closedBy.name}`
                          : ""}
                      </div>
                    </div>
                    {snapshot?.debtStatus && (
                      <span className="text-xs text-gray-600">
                        {DEBT_STATUS_LABELS[snapshot.debtStatus as DebtStatus] ??
                          snapshot.debtStatus}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Nợ lúc đóng</div>
                      <div className="font-medium tabular-nums">
                        {formatCurrency(cycle.totalDebtAtClose ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Cần thu lúc đóng</div>
                      <div className="font-medium tabular-nums">
                        {formatCurrency(cycle.requiredPaymentAtClose ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500 mb-0.5">Kế toán đòi nợ</div>
                      {snapshot?.accountantAttempts?.length ? (
                        snapshot.accountantAttempts.map((attempt, index) => (
                          <div key={attempt.id}>
                            Lần {index + 1}: {fmtDate(attempt.attemptDate)}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-300">—</div>
                      )}
                    </div>
                    <div>
                      <div className="text-gray-500 mb-0.5">Sale đòi nợ</div>
                      {snapshot?.salesAttempts?.length ? (
                        snapshot.salesAttempts.map((attempt, index) => (
                          <div key={attempt.id}>
                            Lần {index + 1}: {fmtDate(attempt.attemptDate)}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-300">—</div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs">
                    <div className="text-gray-500 mb-0.5">Phiếu</div>
                    {snapshot?.tickets?.length ? (
                      snapshot.tickets.map((ticket) => (
                        <div key={ticket.ticketId}>
                          {ticket.ticketCode}
                          {ticket.ticketType === "STOP_DELIVERY"
                            ? " · Ngừng đi hàng"
                            : " · Thu hồi nợ"}
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-300">—</div>
                    )}
                  </div>

                  <div className="text-xs">
                    <div className="text-gray-500 mb-0.5">Ghi chú</div>
                    <div className="whitespace-pre-wrap break-words text-gray-700">
                      {cycle.note || snapshot?.note || (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
