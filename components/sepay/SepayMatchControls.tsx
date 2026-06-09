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
import type { SepayTransaction, SepayMatchCustomer } from "@/lib/api/sepay";
import { Search, Loader2, X, Check, UserPlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Swal from "sweetalert2";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
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

/** Ô hiển thị (nhiều) khách hàng */
export function SepayCustomerCell({ tx }: { tx: SepayTransaction }) {
  const customers = tx.match?.customers || [];
  const unassigned = tx.match?.unassignedAmount || 0;
  if (customers.length === 0 && unassigned <= 0)
    return <span className="text-gray-400">-</span>;
  return (
    <div className="flex flex-col gap-1">
      {customers.map((c, i) => (
        <div key={`${c.id}-${i}`} className="flex flex-col">
          {c.code ? (
            <CodeLink entity="customer" code={c.code} />
          ) : (
            <span className="text-sm break-words">{c.name}</span>
          )}
          <span className="text-xs text-gray-500 break-words">
            {c.code ? c.name : ""}
            {typeof c.amount === "number" && c.amount > 0
              ? `${c.code ? " — " : ""}${formatCurrency(c.amount)}`
              : ""}
          </span>
        </div>
      ))}
      {unassigned > 0 && (
        <div className="text-xs text-amber-600">
          Chưa gắn: {formatCurrency(unassigned)}
        </div>
      )}
    </div>
  );
}

interface PickedCustomer {
  id: number;
  code: string;
  name: string;
}

/** Modal tìm + chọn NHIỀU khách hàng (multi-select) */
function CustomerPickerModal({
  tx,
  initial,
  onConfirm,
  onClose,
}: {
  tx: SepayTransaction;
  initial: PickedCustomer[];
  onConfirm: (customers: PickedCustomer[]) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [picked, setPicked] = useState<PickedCustomer[]>(initial);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isFetching } = useSearchCustomers(debounced || undefined);
  const customers = data?.data || [];

  // Khách đã có phiếu thu còn hiệu lực (giữ nguyên, không gán lại).
  const lockedCustomers = (tx.match?.customers || []).filter((c) => c.cashFlow);
  const unassigned = tx.match?.unassignedAmount ?? Number(tx.amountIn);

  const toggle = (c: PickedCustomer) => {
    setPicked((prev) =>
      prev.some((p) => p.id === c.id)
        ? prev.filter((p) => p.id !== c.id)
        : [...prev, c]
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[75vh]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-800">
              Gán khách hàng cho giao dịch
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">
              Cần gán: <b>{formatCurrency(unassigned)}</b> •{" "}
              {tx.transactionContent || "-"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Khách đã có phiếu thu — giữ nguyên, không gán lại */}
        {lockedCustomers.length > 0 && (
          <div className="px-5 py-2 border-b bg-gray-50">
            <div className="text-xs text-gray-500 mb-1">
              Đã có phiếu thu (giữ nguyên):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lockedCustomers.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  {c.name}
                  {typeof c.amount === "number"
                    ? ` — ${formatCurrency(c.amount)}`
                    : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Đã chọn */}
        {picked.length > 0 && (
          <div className="px-5 py-2 border-b flex flex-wrap gap-1.5">
            {picked.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                {c.name}
                <button
                  onClick={() => toggle(c)}
                  className="hover:text-emerald-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

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
              }) => {
                const isPicked = picked.some((p) => p.id === c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() =>
                      toggle({ id: c.id, code: c.code, name: c.name })
                    }
                    className={`w-full text-left px-5 py-3 transition-colors border-b last:border-0 flex items-center justify-between gap-3 ${
                      isPicked ? "bg-emerald-50" : "hover:bg-gray-50"
                    }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isPicked
                            ? "bg-emerald-600 border-emerald-600"
                            : "border-gray-300"
                        }`}>
                        {isPicked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-800 truncate">
                          {c.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {c.code}
                          {c.contactNumber ? ` - ${c.contactNumber}` : ""}
                        </div>
                      </div>
                    </div>
                    {typeof c.totalDebt === "number" && c.totalDebt > 0 && (
                      <span className="text-xs text-red-600 whitespace-nowrap shrink-0">
                        Nợ: {formatCurrency(c.totalDebt)}
                      </span>
                    )}
                  </button>
                );
              }
            )
          )}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={() => onConfirm(picked)}
            disabled={picked.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            Gán {picked.length > 0 ? `(${picked.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AllocRow {
  customerId: number;
  name: string;
  amount: string; // chuỗi để dễ nhập
}

/** Modal phân bổ tiền + ghi chú cho từng khách → tạo phiếu thu */
function AllocationModal({
  tx,
  branchName,
  onConfirm,
  onClose,
  isPending,
}: {
  tx: SepayTransaction;
  branchName: string;
  onConfirm: (
    allocations: { customerId: number; amount: number; note: string }[]
  ) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const amountIn = Number(tx.amountIn);
  const allCustomers = tx.match?.customers || [];
  // Khách đã có phiếu thu còn hiệu lực → giữ nguyên, KHÔNG phân bổ lại.
  // Chỉ phân bổ cho khách chưa có phiếu, theo phần tiền chưa gắn.
  const pendingCustomers = allCustomers.filter((c) => !c.cashFlow);
  const targetAmount = Math.round(
    (tx.match?.unassignedAmount ?? amountIn) * 100
  ) / 100;

  const [rows, setRows] = useState<AllocRow[]>(() =>
    pendingCustomers.map((c, i) => ({
      customerId: c.id,
      name: c.name,
      // 1 khách chờ: prefill toàn bộ phần tiền chưa gắn. Nhiều khách: khách đầu, còn lại 0.
      amount:
        pendingCustomers.length === 1 || i === 0
          ? pendingCustomers.length === 1
            ? String(targetAmount)
            : ""
          : "",
    }))
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const setRow = (idx: number, patch: Partial<AllocRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  /** Nhập tiền: chỉ lấy chữ số, kẹp tối đa = phần còn lại (tổng không vượt phần chưa gắn). */
  const setAmount = (idx: number, raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") {
      setRow(idx, { amount: "" });
      return;
    }
    let val = Number(digits);
    if (!Number.isFinite(val) || val < 0) val = 0;
    const otherSum = rows.reduce(
      (s, r, i) => (i === idx ? s : s + (Number(r.amount) || 0)),
      0
    );
    const remaining = Math.max(0, targetAmount - otherSum);
    if (val > remaining) val = remaining;
    setRow(idx, { amount: String(val) });
  };

  // Hiển thị có tách dấu phẩy ngàn (en-US).
  const displayAmount = (v: string) =>
    v === "" ? "" : Number(v).toLocaleString("en-US");

  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const diff = Math.round((targetAmount - sum) * 100) / 100;
  const balanced = diff === 0;
  const allPositive = rows.every((r) => Number(r.amount) > 0);

  // Ghi chú tự điền theo mã tham chiếu của giao dịch (không cho nhập tay).
  const autoNote = tx.referenceNumber || tx.transactionContent || "";

  const handleSubmit = () => {
    if (!balanced || !allPositive) return;
    onConfirm(
      rows.map((r) => ({
        customerId: r.customerId,
        amount: Number(r.amount),
        note: autoNote,
      }))
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-16"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              {pendingCustomers.length > 1
                ? "Phân bổ & tạo phiếu thu"
                : "Tạo phiếu thu"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {targetAmount !== amountIn ? (
                <>
                  Cần phân bổ: <b>{formatCurrency(targetAmount)}</b> (giao dịch{" "}
                  {formatCurrency(amountIn)})
                </>
              ) : (
                <>
                  Số tiền giao dịch: <b>{formatCurrency(amountIn)}</b>
                </>
              )}{" "}
              • Chi nhánh: <b>{branchName}</b>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {rows.map((r, idx) => (
            <div key={r.customerId} className="border rounded-lg p-3 space-y-2">
              <div className="font-medium text-sm text-gray-800">{r.name}</div>
              <div className="flex flex-col gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Số tiền thu
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={displayAmount(r.amount)}
                    onChange={(e) => setAmount(idx, e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-gray-600">
              Tổng phân bổ:{" "}
              <b className={balanced ? "text-emerald-600" : "text-red-600"}>
                {formatCurrency(sum)}
              </b>{" "}
              / {formatCurrency(targetAmount)}
            </span>
            {!balanced && (
              <span className="text-red-600 text-xs">
                {diff > 0
                  ? `Còn thiếu ${formatCurrency(diff)}`
                  : `Vượt ${formatCurrency(-diff)}`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={!balanced || !allPositive || isPending}
              className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {pendingCustomers.length > 1
                ? `Tạo ${pendingCustomers.length} phiếu thu`
                : "Tạo phiếu thu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cụm thao tác đối soát của 1 dòng giao dịch */
export function SepayMatchActions({ tx }: { tx: SepayTransaction }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allocOpen, setAllocOpen] = useState(false);
  const { selectedBranch } = useBranchStore();
  const canAssign = usePermission("sepay", "assign");
  const canConfirm = usePermission("sepay", "confirm");

  const assignMut = useAssignSepayCustomer();
  const unassignMut = useUnassignSepayCustomer();
  const confirmMut = useConfirmSepayReceipt();

  const status = tx.match?.status || "processing";
  const customers: SepayMatchCustomer[] = tx.match?.customers || [];

  if (status === "completed") {
    const cfCodes = customers
      .map((c) => c.cashFlow?.code)
      .filter(Boolean) as string[];
    return (
      <span className="text-xs text-gray-400">
        {tx.match?.completedSource === "webhook"
          ? "Tự động (webhook)"
          : cfCodes.length > 0
            ? `Phiếu ${cfCodes.join(", ")}`
            : "Đã tạo phiếu thu"}
      </span>
    );
  }

  const handleAssign = (picked: PickedCustomer[]) => {
    setPickerOpen(false);
    assignMut.mutate({ id: tx.id, customerIds: picked.map((c) => c.id) });
  };

  const openAlloc = () => {
    if (!selectedBranch?.id) {
      Swal.fire({
        icon: "warning",
        title: "Chưa chọn chi nhánh",
        text: "Vui lòng chọn chi nhánh trước khi tạo phiếu thu.",
      });
      return;
    }
    setAllocOpen(true);
  };

  const handleConfirm = (
    allocations: { customerId: number; amount: number; note: string }[]
  ) => {
    if (!selectedBranch?.id) return;
    confirmMut.mutate(
      { id: tx.id, branchId: selectedBranch.id, allocations },
      { onSuccess: () => setAllocOpen(false) }
    );
  };

  // Chỉ cho gán/sửa khách CHƯA có phiếu thu (khách đã có phiếu giữ nguyên).
  const initialPicked: PickedCustomer[] = customers
    .filter((c) => !c.cashFlow)
    .map((c) => ({
      id: c.id,
      code: c.code || "",
      name: c.name,
    }));

  return (
    <div className="flex items-center gap-2 justify-end">
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
          {status === "assigned" ? "Sửa KH" : "Gán KH"}
        </button>
      )}

      {pickerOpen && (
        <CustomerPickerModal
          tx={tx}
          initial={initialPicked}
          onConfirm={handleAssign}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {canAssign && status === "assigned" && (
        <button
          onClick={() => unassignMut.mutate(tx.id)}
          disabled={unassignMut.isPending}
          title="Bỏ gán khách hàng"
          className="inline-flex items-center px-2 py-1.5 border rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {canConfirm && status === "assigned" && (
        <button
          onClick={openAlloc}
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

      {allocOpen && (
        <AllocationModal
          tx={tx}
          branchName={selectedBranch?.name || ""}
          onConfirm={handleConfirm}
          onClose={() => setAllocOpen(false)}
          isPending={confirmMut.isPending}
        />
      )}
    </div>
  );
}
