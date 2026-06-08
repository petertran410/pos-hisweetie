"use client";

import { useState, useEffect } from "react";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import {
  useAssignSepayCustomer,
  useUnassignSepayCustomer,
  useConfirmSepayReceipt,
} from "@/lib/hooks/useSepay";
import { useBranchStore } from "@/lib/store/branch";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "@/components/shared/CodeLink";
import type { SepayTransaction } from "@/lib/api/sepay";
import { Search, Loader2, X, Check, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Swal from "sweetalert2";

const STATUS_BADGE: Record<
  string,
  { label: string; cls: string }
> = {
  processing: { label: "Đang xử lý", cls: "bg-amber-100 text-amber-700" },
  assigned: { label: "Đã xác nhận KH", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Hoàn thành", cls: "bg-green-100 text-green-700" },
};

export function SepayStatusBadge({ status }: { status?: string | null }) {
  const s = STATUS_BADGE[status || "processing"] || STATUS_BADGE.processing;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

/** Ô hiển thị khách hàng (link nếu có code) */
export function SepayCustomerCell({ tx }: { tx: SepayTransaction }) {
  const cust = tx.match?.customer;
  if (!cust) return <span className="text-gray-400">-</span>;
  if (cust.code) {
    return (
      <div className="flex flex-col">
        <CodeLink entity="customer" code={cust.code} />
        <span className="text-xs text-gray-500 break-words">
          {cust.name}
        </span>
      </div>
    );
  }
  return <span className="break-words">{cust.name}</span>;
}

/** Modal tìm + chọn khách hàng (căn giữa màn hình, rộng rãi) */
function CustomerPickerModal({
  tx,
  onSelect,
  onClose,
}: {
  tx: SepayTransaction;
  onSelect: (c: { id: number; code: string; name: string }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Đóng bằng phím ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isFetching } = useSearchCustomers(debounced || undefined);
  const customers = data?.data || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[70vh]"
        onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Gán khách hàng cho giao dịch
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">
              {tx.transactionContent || "-"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã hoặc tên khách hàng..."
              className="pl-9 pr-3 py-2.5 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {isFetching ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Đang tìm...
            </div>
          ) : customers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              {debounced
                ? "Không tìm thấy khách hàng"
                : "Nhập mã hoặc tên để tìm khách hàng"}
            </div>
          ) : (
            customers.map(
              (c: {
                id: number;
                code: string;
                name: string;
                contactNumber?: string | null;
                totalDebt?: number;
              }) => (
                <button
                  key={c.id}
                  onClick={() =>
                    onSelect({ id: c.id, code: c.code, name: c.name })
                  }
                  className="w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors border-b last:border-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {c.code}
                      {c.contactNumber ? ` - ${c.contactNumber}` : ""}
                    </div>
                  </div>
                  {typeof c.totalDebt === "number" && c.totalDebt > 0 && (
                    <span className="text-xs text-red-600 whitespace-nowrap shrink-0">
                      Nợ: {formatCurrency(c.totalDebt)}
                    </span>
                  )}
                </button>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** Cụm thao tác đối soát của 1 dòng giao dịch */
export function SepayMatchActions({ tx }: { tx: SepayTransaction }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { selectedBranch } = useBranchStore();
  const canAssign = usePermission("sepay", "assign");
  const canConfirm = usePermission("sepay", "confirm");

  const assignMut = useAssignSepayCustomer();
  const unassignMut = useUnassignSepayCustomer();
  const confirmMut = useConfirmSepayReceipt();

  const status = tx.match?.status || "processing";
  const amountIn = Number(tx.amountIn);

  // Hoàn thành → không còn thao tác (ẩn)
  if (status === "completed") {
    return (
      <span className="text-xs text-gray-400">
        {tx.match?.completedSource === "webhook"
          ? "Tự động (webhook)"
          : tx.match?.cashFlow?.code
            ? `Phiếu ${tx.match.cashFlow.code}`
            : "Đã tạo phiếu thu"}
      </span>
    );
  }

  const handleAssign = (c: { id: number; code: string; name: string }) => {
    setPickerOpen(false);
    assignMut.mutate({ id: tx.id, customerId: c.id });
  };

  const handleConfirm = async () => {
    if (!selectedBranch?.id) {
      Swal.fire({
        icon: "warning",
        title: "Chưa chọn chi nhánh",
        text: "Vui lòng chọn chi nhánh trước khi tạo phiếu thu.",
      });
      return;
    }
    const res = await Swal.fire({
      title: "Tạo phiếu thu trừ công nợ?",
      html: `Khách: <b>${tx.match?.customer?.name || ""}</b><br/>Số tiền: <b>${formatCurrency(amountIn)}</b><br/>Chi nhánh: <b>${selectedBranch.name}</b><br/><br/>Phiếu thu sẽ trừ vào công nợ khách hàng (không gắn hóa đơn).`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Tạo phiếu thu",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#059669",
    });
    if (res.isConfirmed) {
      confirmMut.mutate({ id: tx.id, branchId: selectedBranch.id });
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {/* Bước 1: gán / đổi khách (sale) — mở modal */}
      {canAssign && (
        <button
          onClick={() => setPickerOpen(true)}
          disabled={assignMut.isPending}
          title={status === "assigned" ? "Đổi khách hàng" : "Gán khách hàng"}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap">
          {assignMut.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <UserPlus className="w-3.5 h-3.5" />
          )}
          {status === "assigned" ? "Đổi KH" : "Gán KH"}
        </button>
      )}

      {pickerOpen && (
        <CustomerPickerModal
          tx={tx}
          onSelect={handleAssign}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Bỏ gán (khi đã gán, chưa tạo phiếu) */}
      {canAssign && status === "assigned" && (
        <button
          onClick={() => unassignMut.mutate(tx.id)}
          disabled={unassignMut.isPending}
          title="Bỏ gán khách hàng"
          className="inline-flex items-center px-2 py-1.5 border rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bước 2: kế toán xác nhận tạo phiếu thu (chỉ khi đã gán khách) */}
      {canConfirm && status === "assigned" && (
        <button
          onClick={handleConfirm}
          disabled={confirmMut.isPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap">
          {confirmMut.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Tạo phiếu thu
        </button>
      )}
    </div>
  );
}
