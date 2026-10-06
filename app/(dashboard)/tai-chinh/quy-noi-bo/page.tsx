"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  SquarePen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { InternalFinanceDateField } from "@/components/internal-finance/InternalFinanceDateField";
import { InternalFundReceiptForm } from "@/components/internal-fund/InternalFundReceiptForm";
import { WarehouseCashAttachmentsModal } from "@/components/warehouse-cash/WarehouseCashAttachmentsModal";
import ExpensePage from "@/app/(dashboard)/tai-chinh/phieu-chi-kho/page";
import { useBranches } from "@/lib/hooks/useBranches";
import {
  useAdjustInternalFundTransaction,
  useCancelInternalFundTransaction,
  useCancelInternalFundTransfer,
  useCloseInternalFundDay,
  useInternalFundAccess,
  useInternalFundApproval,
  useInternalFundApprovals,
  useInternalFundDailyClosing,
  useInternalFundDailyClosings,
  useInternalFundTransactions,
  useInternalFundTransfers,
  useInternalFundSummary,
  usePostInternalFundApproval,
} from "@/lib/hooks/useInternalFund";
import { useBranchStore } from "@/lib/store/branch";
import type {
  InternalFundDailyClosing,
  InternalFundQuery,
  InternalFundTransaction,
} from "@/lib/api/internal-fund";
import type { InternalFinanceAttachment } from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";

type View = "transactions" | "expenses" | "receipts" | "transfers" | "closings";
const views: Array<[View, string]> = [
  ["transactions", "Sổ quỹ"],
  ["expenses", "Phiếu chi"],
  ["receipts", "Phiếu thu"],
  ["transfers", "Chuyển tiền"],
  ["closings", "Chốt sổ"],
];
const labels: Record<string, string> = {
  RECEIPT: "Thu nội bộ",
  EXPENSE: "Chi",
  TRANSFER_IN: "Chuyển đến",
  TRANSFER_OUT: "Chuyển đi",
  POSTED: "Đã ghi quỹ",
  CANCELLED: "Đã hủy",
  PENDING: "Đang duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CREATE_FAILED: "Tạo thất bại",
  MATCHED: "Khớp",
  MISMATCHED: "Lệch quỹ",
};
const today = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const inputClass = "dt-input h-10 w-full";

function FundScreen() {
  const selectedBranch = useBranchStore((state) => state.selectedBranch);
  const setSelectedBranch = useBranchStore((state) => state.setSelectedBranch);
  const access = useInternalFundAccess();
  const branchQuery = useBranches();
  const params = useSearchParams();
  const allBranches = Array.isArray(branchQuery.data) ? branchQuery.data : [];
  const branches = allBranches.filter((branch) =>
    access.data?.[branch.id]?.includes("view"),
  );
  const branchId =
    branches.find((branch) => branch.id === selectedBranch?.id)?.id ||
    branches[0]?.id ||
    6;
  const can = (action: string, branch = branchId) =>
    Boolean(access.data?.[branch]?.includes(action));
  const [view, setView] = useState<View>(() =>
    views.some(([key]) => key === params.get("view"))
      ? (params.get("view") as View)
      : "transactions",
  );
  const [showForm, setShowForm] = useState<"receipt" | "transfer" | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "POSTED" | "CANCELLED">("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [approvalPage, setApprovalPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);
  const [closingPage, setClosingPage] = useState(1);
  const query: InternalFundQuery = {
    branchId,
    search: search || undefined,
    status: status || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit: 30,
  };
  const ready = branches.length > 0;
  const transactions = useInternalFundTransactions(query, ready);
  const approvals = useInternalFundApprovals(
    {
      branchId,
      status: approvalStatus || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page: approvalPage,
      limit: 30,
    },
    ready,
  );
  const transfers = useInternalFundTransfers(
    {
      branchId,
      status: status || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page: transferPage,
      limit: 30,
    },
    ready,
  );
  const closings = useInternalFundDailyClosings(
    {
      branchId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page: closingPage,
      limit: 30,
    },
    ready,
  );
  const cancelTransaction = useCancelInternalFundTransaction();
  const cancelTransfer = useCancelInternalFundTransfer();
  const adjust = useAdjustInternalFundTransaction();
  const close = useCloseInternalFundDay();
  const postApproval = usePostInternalFundApproval();
  const [action, setAction] = useState<{
    kind: "cancel" | "transfer" | "adjust";
    id: number;
    description?: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [closingDate, setClosingDate] = useState(today);
  const [actual, setActual] = useState(["", "", "", ""]);
  const [notes, setNotes] = useState("");
  const [detail, setDetail] = useState<InternalFundDailyClosing | null>(null);
  const [approvalDetailId, setApprovalDetailId] = useState<number | null>(null);
  const [approvalAttachments, setApprovalAttachments] = useState<
    InternalFinanceAttachment[]
  >([]);
  const selectedApproval = useInternalFundApproval(approvalDetailId);
  const selectedClosing = useInternalFundDailyClosing(detail?.id || null);
  const rows = transactions.data?.data || [];
  const approvalRows = approvals.data?.data || [];
  const transferRows = transfers.data?.data || [];
  const closingRows = closings.data?.data || [];
  const summary = useInternalFundSummary({
    branchId,
    fromDate: view === "closings" ? closingDate : today(),
  }, ready);
  const totalPages = Math.max(
    1,
    Math.ceil((transactions.data?.total || 0) / 30),
  );
  const approvalTotalPages = Math.max(
    1,
    Math.ceil((approvals.data?.total || 0) / 30),
  );
  const transferTotalPages = Math.max(
    1,
    Math.ceil((transfers.data?.total || 0) / 30),
  );
  const closingTotalPages = Math.max(
    1,
    Math.ceil((closings.data?.total || 0) / 30),
  );
  const requestAction = (
    kind: "cancel" | "transfer" | "adjust",
    id: number,
    text?: string,
  ) => {
    setAction({ kind, id, description: text });
    setReason("");
    setDescription(text || "");
  };
  const submitAction = () => {
    if (!action || !reason.trim()) {
      toast.error("Cần lý do");
      return;
    }
    const success = { onSuccess: () => setAction(null) };
    if (action.kind === "transfer")
      cancelTransfer.mutate({ id: action.id, reason }, success);
    else if (action.kind === "cancel")
      cancelTransaction.mutate({ id: action.id, reason }, success);
    else adjust.mutate({ id: action.id, description, reason }, success);
  };
  const submitClosing = () => {
    const values = actual.map((value) =>
      value === "" ? undefined : Number(value.replace(/,/g, "")),
    );
    if (
      values.some((value) => value !== undefined && !Number.isFinite(value))
    ) {
      toast.error("Số liệu kiểm kê không hợp lệ");
      return;
    }
    close.mutate({
      branchId,
      closingDate,
      actualOpeningBalance: values[0],
      actualReceipt: values[1],
      actualExpense: values[2],
      actualClosingBalance: values[3],
      notes,
    });
  };
  const activeError =
    view === "transactions"
      ? transactions.error
      : view === "receipts"
        ? approvals.error
        : view === "transfers"
          ? transfers.error
          : view === "closings"
            ? closings.error
            : null;
  const pending =
    cancelTransaction.isPending || cancelTransfer.isPending || adjust.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col border-t">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <h1 className="text-base font-semibold">Quỹ nội bộ</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Chi nhánh quỹ"
            className="dt-select h-9"
            value={branchId}
            onChange={(event) => {
              const next = branches.find(
                (branch) => branch.id === Number(event.target.value),
              );
              if (next) setSelectedBranch(next);
              setPage(1);
              setApprovalPage(1);
              setTransferPage(1);
              setClosingPage(1);
            }}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {can("create_receipt") && can("submit_approval") && (
            <button
              type="button"
              onClick={() => setShowForm("receipt")}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm text-white"
            >
              <Plus className="h-4 w-4" /> Phiếu thu
            </button>
          )}
          {can("transfer") && can("submit_approval") && (
            <button
              type="button"
              onClick={() => setShowForm("transfer")}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
            >
              <Plus className="h-4 w-4" /> Chuyển tiền
            </button>
          )}
        </div>
      </div>
      <div
        role="tablist"
        className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 py-2"
      >
        {views.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            type="button"
            onClick={() => setView(key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${view === key ? "border-brand font-semibold text-brand" : "border-transparent text-gray-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {activeError && (
        <div
          role="alert"
          className="border-b bg-red-50 p-3 text-sm text-red-700"
        >
          {activeError instanceof Error
            ? activeError.message
            : "Không tải được dữ liệu"}
        </div>
      )}
      {access.error && (
        <div role="alert" className="bg-red-50 p-3 text-sm text-red-700">
          {access.error instanceof Error
            ? access.error.message
            : "Không tải được quyền quỹ"}
        </div>
      )}
      {summary.data?.[0] && (
        <div className="flex shrink-0 flex-wrap gap-x-6 gap-y-1 border-b bg-gray-50 px-4 py-2 text-sm">
          <span>Ngày {view === "closings" ? closingDate : today()}</span>
          <span>
            Đầu kỳ <strong>{formatCurrency(summary.data[0].opening)}</strong>
          </span>
          <span>
            Thu{" "}
            <strong className="text-green-700">
              {formatCurrency(summary.data[0].receipt)}
            </strong>
          </span>
          <span>
            Chi{" "}
            <strong className="text-red-600">
              {formatCurrency(summary.data[0].expense)}
            </strong>
          </span>
          <span>
            Cuối kỳ <strong>{formatCurrency(summary.data[0].closing)}</strong>
          </span>
        </div>
      )}
      {view === "expenses" ? (
        <ExpensePage />
      ) : view === "transactions" ? (
        <>
          <div className="flex flex-wrap items-end gap-3 border-b p-3">
            <label className="text-xs">
              Tìm kiếm
              <input
                className={inputClass}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="text-xs">
              Trạng thái
              <select
                className="dt-select h-10"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                <option value="">Đã ghi quỹ</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </label>
            <InternalFinanceDateField
              label="Từ ngày"
              value={fromDate}
              onChange={(value) => {
                setFromDate(value || "");
                setPage(1);
              }}
            />
            <InternalFinanceDateField
              label="Đến ngày"
              value={toDate}
              onChange={(value) => {
                setToDate(value || "");
                setPage(1);
              }}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {[
                    "Mã",
                    "Ngày",
                    "Loại",
                    "Nội dung",
                    "Số tiền",
                    "Trạng thái",
                    "",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-3 py-2 text-left font-medium"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : !rows.length ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400">
                      Chưa có giao dịch
                    </td>
                  </tr>
                ) : (
                  rows.map((row: InternalFundTransaction) => (
                    <tr key={row.id} className="border-b hover:bg-gray-50">
                      <td className="max-w-48 break-all px-3 py-2 font-mono text-xs">
                        {row.code}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {dateLabel(row.occurredAt)}
                      </td>
                      <td className="px-3 py-2">
                        {labels[row.transactionType]}
                      </td>
                      <td className="max-w-64 break-words px-3 py-2">
                        {row.description}
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-medium ${["EXPENSE", "TRANSFER_OUT"].includes(row.transactionType) ? "text-red-600" : "text-green-700"}`}
                      >
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-3 py-2">{labels[row.status]}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          {row.status === "POSTED" && (
                            <>
                              {can("adjust") && !row.transferId && (
                                <button
                                  type="button"
                                  title="Điều chỉnh nội dung"
                                  onClick={() =>
                                    requestAction(
                                      "adjust",
                                      row.id,
                                      row.description || "",
                                    )
                                  }
                                >
                                  <SquarePen className="h-4 w-4" />
                                </button>
                              )}
                              {can("cancel") && (
                                <button
                                  type="button"
                                  title="Hủy giao dịch"
                                  onClick={() =>
                                    requestAction("cancel", row.id)
                                  }
                                >
                                  <Ban className="h-4 w-4 text-red-600" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span>
              Trang {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Trang trước"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                title="Trang sau"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      ) : view === "receipts" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex flex-wrap items-end gap-3 border-b p-3">
            <label className="text-xs">
              Trạng thái Approval
              <select
                className="dt-select h-10"
                value={approvalStatus}
                onChange={(event) => {
                  setApprovalStatus(event.target.value);
                  setApprovalPage(1);
                }}
              >
                <option value="">Tất cả</option>
                <option value="PENDING">Đang duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </label>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Approval", "Loại", "Trạng thái", "Giao dịch quỹ"].map(
                  (heading) => (
                    <th key={heading} className="px-4 py-3 text-left">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {approvalRows.map((approval) => (
                <tr
                  key={approval.id}
                  className="cursor-pointer border-b hover:bg-gray-50"
                  onClick={() => setApprovalDetailId(approval.id)}
                >
                  <td className="max-w-60 break-all px-4 py-3 font-mono text-xs">
                    {approval.instanceCode || `#${approval.id}`}
                  </td>
                  <td className="px-4 py-3">
                    {approval.sourceType === "INTERNAL_FUND_TRANSFER"
                      ? "Chuyển tiền"
                      : "Phiếu thu"}
                  </td>
                  <td className="px-4 py-3">
                    {labels[approval.status] || approval.status}
                  </td>
                  <td className="max-w-64 break-all px-4 py-3 text-xs">
                    {approval.internalFundTransactions
                      .map((row) => row.code)
                      .join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!approvalRows.length && (
            <div className="p-10 text-center text-gray-400">
              Chưa có Approval nội bộ
            </div>
          )}
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span>
              Trang {approvalPage}/{approvalTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Trang trước"
                disabled={approvalPage === 1}
                onClick={() => setApprovalPage((value) => value - 1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                title="Trang sau"
                disabled={approvalPage >= approvalTotalPages}
                onClick={() => setApprovalPage((value) => value + 1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : view === "transfers" ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Mã",
                  "Ngày",
                  "Quỹ nguồn",
                  "Quỹ đích",
                  "Số tiền",
                  "Trạng thái",
                  "",
                ].map((heading) => (
                  <th key={heading} className="px-3 py-2 text-left">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transferRows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="max-w-48 break-all px-3 py-2 font-mono text-xs">
                    {row.code}
                  </td>
                  <td className="px-3 py-2">{dateLabel(row.occurredAt)}</td>
                  <td className="px-3 py-2">{row.sourceBranch.name}</td>
                  <td className="px-3 py-2">{row.destinationBranch.name}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-3 py-2">{labels[row.status]}</td>
                  <td className="px-3 py-2">
                    {row.status !== "CANCELLED" &&
                      can("cancel", row.sourceBranchId) &&
                      can("cancel", row.destinationBranchId) && (
                        <button
                          type="button"
                          title="Hủy cả hai chiều chuyển tiền"
                          onClick={() => requestAction("transfer", row.id)}
                        >
                          <Ban className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!transferRows.length && (
            <div className="p-10 text-center text-gray-400">
              Chưa có chuyển tiền
            </div>
          )}
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span>
              Trang {transferPage}/{transferTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Trang trước"
                disabled={transferPage === 1}
                onClick={() => setTransferPage((value) => value - 1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                title="Trang sau"
                disabled={transferPage >= transferTotalPages}
                onClick={() => setTransferPage((value) => value + 1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          {can("close") && (
            <section className="border-b p-4">
              <div className="grid max-w-4xl gap-3 sm:grid-cols-3">
                <InternalFinanceDateField
                  label="Ngày chốt"
                  value={closingDate}
                  onChange={(value) => value && setClosingDate(value)}
                />
                {[
                  "Đầu kỳ thực tế",
                  "Thu thực tế",
                  "Chi thực tế",
                  "Cuối kỳ thực tế",
                ].map((label, index) => (
                  <label key={label} className="text-xs">
                    {label}
                    <input
                      inputMode="decimal"
                      value={actual[index]}
                      onChange={(event) =>
                        setActual(
                          actual.map((value, i) =>
                            i === index ? event.target.value : value,
                          ),
                        )
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
                <label className="text-xs">
                  Ghi chú
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={submitClosing}
                disabled={close.isPending}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm text-white"
              >
                {close.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}{" "}
                Chốt sổ
              </button>
            </section>
          )}
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Ngày",
                  "Đầu kỳ",
                  "Thu",
                  "Chi",
                  "Cuối kỳ",
                  "Thực tế",
                  "Đối soát",
                ].map((label) => (
                  <th key={label} className="px-3 py-2 text-left">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closingRows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b hover:bg-gray-50"
                  onClick={() => setDetail(row)}
                >
                  <td className="px-3 py-2">{row.closingDate.slice(0, 10)}</td>
                  {[
                    row.systemOpeningBalance,
                    row.systemReceipt,
                    row.systemExpense,
                    row.systemClosingBalance,
                  ].map((value, index) => (
                    <td key={index} className="px-3 py-2 text-right">
                      {formatCurrency(value)}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    {row.actualClosingBalance === null
                      ? "-"
                      : formatCurrency(row.actualClosingBalance)}
                  </td>
                  <td
                    className={`px-3 py-2 ${row.reconciliationStatus === "MISMATCHED" ? "text-red-600" : "text-green-700"}`}
                  >
                    {row.reconciliationStatus === "PENDING"
                      ? "Chờ đối soát"
                      : labels[row.reconciliationStatus]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!closingRows.length && (
            <div className="p-10 text-center text-gray-400">
              Chưa có ngày chốt sổ
            </div>
          )}
          <div className="flex items-center justify-between border-t p-3 text-sm">
            <span>
              Trang {closingPage}/{closingTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Trang trước"
                disabled={closingPage === 1}
                onClick={() => setClosingPage((value) => value - 1)}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                title="Trang sau"
                disabled={closingPage >= closingTotalPages}
                onClick={() => setClosingPage((value) => value + 1)}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <InternalFundReceiptForm
          key={`${showForm}-${branchId}`}
          transfer={showForm === "transfer"}
          onClose={() => setShowForm(null)}
        />
      )}
      {action && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAction(null)}
        >
          <form
            className="w-full max-w-md rounded-lg bg-white p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              submitAction();
            }}
          >
            <div className="mb-4 flex justify-between">
              <h2 className="font-semibold">
                {action.kind === "adjust" ? "Điều chỉnh" : "Hủy giao dịch quỹ"}
              </h2>
              <button
                type="button"
                title="Đóng"
                onClick={() => setAction(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {action.kind === "adjust" && (
              <label className="mb-3 block text-xs">
                Nội dung
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={inputClass}
                />
              </label>
            )}
            <label className="block text-xs">
              Lý do
              <textarea
                value={reason}
                required
                onChange={(event) => setReason(event.target.value)}
                className="dt-input mt-1 w-full"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="mt-4 rounded-lg bg-brand px-3 py-2 text-sm text-white"
            >
              Xác nhận
            </button>
          </form>
        </div>
      )}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex justify-between">
              <h2 className="font-semibold">
                Chốt sổ {detail.closingDate.slice(0, 10)}
              </h2>
              <button
                type="button"
                title="Đóng"
                onClick={() => setDetail(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedClosing.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <p className="text-sm">
                {selectedClosing.data?.notes || detail.notes || "-"}
              </p>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="border-b pb-2 text-sm">
                Cuối kỳ hệ thống:{" "}
                <strong>{formatCurrency(detail.systemClosingBalance)}</strong>
              </div>
              <div className="border-b pb-2 text-sm">
                Cuối kỳ thực tế:{" "}
                <strong>
                  {detail.actualClosingBalance === null
                    ? "-"
                    : formatCurrency(detail.actualClosingBalance)}
                </strong>
              </div>
              <div className="border-b pb-2 text-sm">
                Chênh lệch:{" "}
                <strong>
                  {detail.actualClosingBalance === null
                    ? "-"
                    : formatCurrency(
                        Number(detail.actualClosingBalance) -
                          Number(detail.systemClosingBalance),
                      )}
                </strong>
              </div>
            </div>
            <h3 className="mt-4 text-sm font-semibold">Lịch sử chốt</h3>
            <div className="mt-2 divide-y">
                  {(selectedClosing.data?.log || detail.log || []).map((item, index) => {
                const entry = item as Record<string, unknown>;
                const amounts = Array.isArray(entry.system) ? entry.system : [];
                return (
                  <div
                    key={index}
                    className="flex flex-wrap justify-between gap-2 py-2 text-xs"
                  >
                    <span>{String(entry.capturedAt || "")}</span>
                    <span>Người chốt #{String(entry.actorId || "")}</span>
                    <span>
                      Cuối kỳ {formatCurrency(Number(amounts[3] || 0))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {approvalDetailId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setApprovalDetailId(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Chi tiết Approval nội bộ</h2>
              <button
                type="button"
                title="Đóng"
                onClick={() => setApprovalDetailId(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {selectedApproval.isLoading ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : selectedApproval.data ? (
              <div className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <span>
                    Trạng thái:{" "}
                    <strong>
                      {labels[selectedApproval.data.status] ||
                        selectedApproval.data.status}
                    </strong>
                  </span>
                  <span>
                    Hình thức thu: <strong>Tiền mặt</strong>
                  </span>
                  <span>
                    Nguồn quỹ:{" "}
                    <strong>
                      {selectedApproval.data.metadata?.cashSourceLabel || "-"}
                    </strong>
                  </span>
                  <span>
                    Người nộp:{" "}
                    <strong>
                      {Array.isArray(selectedApproval.data.metadata?.payer)
                        ? selectedApproval.data.metadata?.payer.join(", ")
                        : String(selectedApproval.data.metadata?.payer || "-")}
                    </strong>
                  </span>
                  <span>
                    Ngày:{" "}
                    <strong>
                      {selectedApproval.data.metadata?.occurredAt || "-"}
                    </strong>
                  </span>
                  <span>
                    Số tiền:{" "}
                    <strong>
                      {formatCurrency(
                        selectedApproval.data.metadata?.amount || 0,
                      )}
                    </strong>
                  </span>
                  <span className="sm:col-span-2">
                    Nội dung:{" "}
                    <strong>
                      {selectedApproval.data.metadata?.description || "-"}
                    </strong>
                  </span>
                </div>
                <div>
                  Chứng từ:
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedApproval.data.metadata?.attachments || []).map(
                      (file) =>
                        file.url ? (
                          <a
                            key={file.code}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border px-2 py-1 text-brand hover:bg-gray-50"
                          >
                            {file.name || file.code}
                          </a>
                        ) : (
                          <span
                            key={file.code}
                            className="rounded border border-dashed px-2 py-1 text-gray-500"
                          >
                            Chứng từ Lark chưa có URL
                          </span>
                        ),
                    )}
                  </div>
                  {selectedApproval.data.metadata?.attachments?.some(
                    (file) => Boolean(file.url),
                  ) && (
                    <button
                      type="button"
                      className="mt-2 rounded border px-3 py-1.5 text-xs text-brand hover:bg-gray-50"
                      onClick={() =>
                        setApprovalAttachments(
                          (selectedApproval.data?.metadata?.attachments || [])
                            .filter((file) => Boolean(file.url))
                            .map((file) => ({
                              fileUrl: file.url as string,
                              fileName: file.name || file.code,
                              fileType: file.type || undefined,
                            })),
                        )
                      }
                    >
                      Xem chứng từ
                    </button>
                  )}
                </div>
                <div>
                  Giao dịch quỹ:{" "}
                  {selectedApproval.data.internalFundTransactions
                    .map((row) => row.code)
                    .join(", ") || "Chưa ghi nhận"}
                </div>
                {selectedApproval.data.status === "APPROVED" &&
                  !selectedApproval.data.internalFundTransactions.length &&
                  (selectedApproval.data.sourceType ===
                  "INTERNAL_FUND_TRANSFER"
                    ? can(
                        "transfer",
                        selectedApproval.data.internalFundTransfer
                          ?.sourceBranchId || branchId,
                      ) &&
                      can(
                        "transfer",
                        selectedApproval.data.internalFundTransfer
                          ?.destinationBranchId || branchId,
                      )
                    : can("mark_received", selectedApproval.data.branchId)) && (
                    <button
                      type="button"
                      onClick={() =>
                        postApproval.mutate(selectedApproval.data!.id, {
                          onSuccess: () => setApprovalDetailId(null),
                        })
                      }
                      disabled={postApproval.isPending}
                      className="rounded-lg bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
                    >
                      Ghi nhận lại vào quỹ
                    </button>
                  )}
              </div>
            ) : (
              <p className="text-sm text-red-600">Không tải được chi tiết</p>
            )}
          </div>
        </div>
      )}
      {approvalAttachments.length > 0 && (
        <WarehouseCashAttachmentsModal
          attachments={approvalAttachments}
          title="Chứng từ Approval quỹ nội bộ"
          onClose={() => setApprovalAttachments([])}
        />
      )}
    </div>
  );
}

export default function QuyNoiBoPage() {
  return (
    <PagePermissionGuard
      permissions={[
        { resource: "internal_fund", action: "view_hn" },
        { resource: "internal_fund", action: "view_sg" },
        { resource: "internal_fund", action: "view_vp" },
      ]}
    >
      <FundScreen />
    </PagePermissionGuard>
  );
}
