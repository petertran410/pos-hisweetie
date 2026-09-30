"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileWarning,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import {
  useAddInternalFinanceAttachments,
  usePostInternalFinanceEntry,
  useReviewInternalFinance,
  useUpdateInternalFinanceCashIssued,
} from "@/lib/hooks/useInternalFinance";
import { uploadPackingSlipExpenseFiles } from "@/lib/hooks/usePackingSlips";
import { useCan } from "@/lib/hooks/useCan";
import { formatCurrency } from "@/lib/utils";
import {
  displayEntryCode,
  displayOccurredAt,
  displaySource,
} from "@/lib/internal-finance/display";
import { InternalFinanceDetailRow } from "./InternalFinanceDetailRow";

const CATEGORY_LABELS: Record<string, string> = {
  DELIVERY_FEE: "Chi phí giao hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  SALARY_ADVANCE: "Tạm ứng lương",
  CUSTOMER_RECEIPT: "Thu tiền khách hàng",
  MANUAL_RECEIPT: "Phiếu thu thủ công",
  OTHER_EXPENSE: "Chi phí khác",
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  FEE_GUI_BEN: "Phí gửi bến",
  FEE_GRAB: "Phí Grab",
  SHIPPING_OUT: "Cước gửi hàng",
  SHIPPING_IN: "Cước nhận hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  SALARY_ADVANCE: "Tạm ứng lương",
  OTHER: "Chi phí khác",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_ACCOUNTANT: "Chờ kế toán",
  ACCOUNTANT_APPROVED: "Kế toán đã duyệt",
  PENDING_MANAGER: "Chờ quản lý",
  MANAGER_APPROVED: "Quản lý đã duyệt",
  READY_FOR_WEEKLY_APPROVAL: "Sẵn sàng tổng hợp",
  IN_WEEKLY_APPROVAL: "Đang duyệt tuần",
  APPROVED: "Đã duyệt",
  POSTED: "Đã ghi sổ",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_ACCOUNTANT: "bg-yellow-100 text-yellow-700",
  ACCOUNTANT_APPROVED: "bg-teal-100 text-teal-700",
  PENDING_MANAGER: "bg-orange-100 text-orange-700",
  MANAGER_APPROVED: "bg-teal-100 text-teal-600",
  READY_FOR_WEEKLY_APPROVAL: "bg-blue-100 text-blue-700",
  IN_WEEKLY_APPROVAL: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  POSTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const EVIDENCE_COLORS: Record<string, string> = {
  COMPLETE: "bg-green-100 text-green-700",
  MISSING: "bg-yellow-100 text-yellow-700",
  EXCEPTION_APPROVED: "bg-orange-100 text-orange-700",
};

const EVIDENCE_LABELS: Record<string, string> = {
  COMPLETE: "Đủ chứng từ",
  MISSING: "Thiếu chứng từ",
  EXCEPTION_APPROVED: "Duyệt ngoại lệ",
};

const primaryButton =
  "inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton =
  "inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

export interface InternalFinanceSummaryItem {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "negative" | "warning";
}

export function InternalFinanceTable({
  rows,
  isLoading,
  title,
  toolbar,
  summary,
  search = "",
  onSearchChange,
  total = rows.length,
  page = 1,
  pageSize = 50,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}: {
  rows: InternalFinanceEntry[];
  isLoading: boolean;
  title: string;
  toolbar?: ReactNode;
  summary?: InternalFinanceSummaryItem[];
  search?: string;
  onSearchChange?: (search: string) => void;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const canUpdate = useCan("cash_flows", "update");
  const canCreate = useCan("cash_flows", "create");
  const review = useReviewInternalFinance();
  const post = usePostInternalFinanceEntry();
  const updateCashIssued = useUpdateInternalFinanceCashIssued();
  const addAttachments = useAddInternalFinanceAttachments();
  const attachmentInputs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingEntryId, setUploadingEntryId] = useState<number | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<number | null>(null);

  const uploadEvidence = async (entryId: number, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingEntryId(entryId);
    try {
      const result = await uploadPackingSlipExpenseFiles(Array.from(files));
      if (result.files.length) {
        addAttachments.mutate({
          id: entryId,
          attachments: result.files.map((file) => ({
            fileUrl: file.fileUrl,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            kind: "EVIDENCE",
          })),
        });
      }
      if (result.errors.length) {
        await Swal.fire({
          title: "Một số file chưa được upload",
          text: result.errors
            .map((error) => `${error.originalname}: ${error.reason}`)
            .join("\n"),
          icon: "warning",
        });
      }
    } catch (error) {
      await Swal.fire({
        title: "Upload thất bại",
        text:
          error instanceof Error
            ? error.message
            : "Không thể upload chứng từ",
        icon: "error",
      });
    } finally {
      setUploadingEntryId(null);
    }
  };

  const runReview = async (
    row: InternalFinanceEntry,
    role: "accountant" | "manager",
    decision: string,
  ) => {
    let reason: string | undefined;
    let dueAt: string | undefined;
    if (decision === "EXCEPTION_APPROVE" || decision === "MARK_MISSING") {
      const result = await Swal.fire({
        title:
          decision === "MARK_MISSING"
            ? "Ghi nhận thiếu chứng từ"
            : "Duyệt ngoại lệ",
        input: "textarea",
        inputLabel: "Lý do",
        inputPlaceholder: "Nhập lý do hoặc chứng từ còn thiếu",
        inputValidator: (value) => (!value ? "Cần nhập lý do" : undefined),
        showCancelButton: true,
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy",
      });
      if (!result.isConfirmed) return;
      reason = result.value;
      if (decision === "EXCEPTION_APPROVE") {
        dueAt = new Date(Date.now() + 7 * 86400000).toISOString();
      }
    } else {
      const result = await Swal.fire({
        title:
          decision === "REJECT" ? "Từ chối khoản này?" : "Xác nhận kiểm tra?",
        text: displayEntryCode({
          code: row.code,
          description: row.description,
          invoiceCodes: row.invoiceLinks.map(({ invoice }) => invoice.code),
        }),
        icon: decision === "REJECT" ? "warning" : "question",
        showCancelButton: true,
        confirmButtonText: "Xác nhận",
        cancelButtonText: "Hủy",
      });
      if (!result.isConfirmed) return;
    }
    review.mutate({
      id: row.id,
      role,
      payload: { decision, reason, dueAt },
    });
  };

  const [searchText, setSearchText] = useState(search);

  useEffect(() => {
    if (!search) setSearchText("");
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchText.trim();
      if (next === search.trim()) return;
      onSearchChange?.(next);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText, search, onSearchChange]);

  const toneClass = (tone?: InternalFinanceSummaryItem["tone"]) => {
    if (tone === "positive") return "text-green-700";
    if (tone === "negative") return "text-red-600";
    if (tone === "warning") return "text-orange-600";
    return "text-gray-900";
  };

  const renderActions = (row: InternalFinanceEntry) => {
    const canUpload =
      canUpdate &&
      row.evidenceStatus !== "COMPLETE" &&
      !["POSTED", "REJECTED", "CANCELLED"].includes(row.status);
    const showAccountant = canUpdate && row.status === "PENDING_ACCOUNTANT";
    const showManager = canUpdate && row.status === "PENDING_MANAGER";
    const showPost =
      canCreate &&
      row.direction === "RECEIPT" &&
      row.status === "ACCOUNTANT_APPROVED" &&
      !row.cashFlow;
    const showCashIssued =
      canUpdate &&
      row.direction === "EXPENSE" &&
      row.status === "APPROVED" &&
      row.weeklyBatch?.status === "APPROVED";
    if (
      !canUpload &&
      !showAccountant &&
      !showManager &&
      !showPost &&
      !showCashIssued
    )
      return null;

    return (
      <>
        {canUpload && (
          <>
            <input
              ref={(element) => {
                attachmentInputs.current[row.id] = element;
              }}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                void uploadEvidence(row.id, event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => attachmentInputs.current[row.id]?.click()}
              disabled={uploadingEntryId === row.id}
              className={secondaryButton}>
              {uploadingEntryId === row.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Bổ sung chứng từ
            </button>
          </>
        )}
        {showAccountant && (
          <>
            <button
              type="button"
              onClick={() => runReview(row, "accountant", "APPROVE")}
              className={primaryButton}>
              <Check className="h-3.5 w-3.5" />
              Kế toán duyệt
            </button>
            <button
              type="button"
              onClick={() => runReview(row, "accountant", "MARK_MISSING")}
              className={secondaryButton}>
              <FileWarning className="h-3.5 w-3.5" />
              Thiếu chứng từ
            </button>
          </>
        )}
        {showManager && (
          <>
            <button
              type="button"
              onClick={() => runReview(row, "manager", "APPROVE")}
              className={primaryButton}>
              <Check className="h-3.5 w-3.5" />
              Quản lý duyệt
            </button>
            {row.evidenceStatus === "MISSING" && (
              <button
                type="button"
                onClick={() => runReview(row, "manager", "EXCEPTION_APPROVE")}
                className={secondaryButton}>
                <FileWarning className="h-3.5 w-3.5" />
                Duyệt ngoại lệ
              </button>
            )}
            <button
              type="button"
              onClick={() => runReview(row, "manager", "REJECT")}
              className={dangerButton}>
              <XCircle className="h-3.5 w-3.5" />
              Từ chối
            </button>
          </>
        )}
        {showPost && (
          <button
            type="button"
            onClick={() => post.mutate(row.id)}
            disabled={post.isPending}
            className={primaryButton}>
            {post.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Lập phiếu thu
          </button>
        )}
        {showCashIssued && (
          <button
            type="button"
            onClick={() =>
              updateCashIssued.mutate({
                id: row.id,
                cashIssued: !row.cashIssued,
              })
            }
            disabled={updateCashIssued.isPending}
            className={row.cashIssued ? primaryButton : secondaryButton}>
            {updateCashIssued.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckSquare className="h-3.5 w-3.5" />
            )}
            {row.cashIssued ? "Đã chi" : "Đánh dấu đã chi"}
          </button>
        )}
      </>
    );
  };

  const columns: Array<{
    key: string;
    label: string;
    width: string;
    align?: "left" | "right";
  }> = [
    { key: "code", label: "Mã", width: "150px" },
    { key: "date", label: "Thời gian", width: "160px" },
    { key: "branch", label: "Chi nhánh", width: "150px" },
    { key: "category", label: "Nghiệp vụ", width: "220px" },
    { key: "invoice", label: "Hóa đơn", width: "150px" },
    { key: "amount", label: "Số tiền", width: "140px", align: "right" },
    { key: "evidence", label: "Chứng từ", width: "140px" },
    { key: "reviewer", label: "Người kiểm tra", width: "170px" },
    { key: "status", label: "Trạng thái", width: "150px" },
    { key: "weekly", label: "Approval tuần", width: "170px" },
    { key: "cashIssued", label: "Đã chi", width: "110px" },
    { key: "cashFlow", label: "CashFlow", width: "140px" },
    { key: "source", label: "Nguồn", width: "140px" },
  ];
  const colSpan = columns.length + 1;
  const displayTotalPages = Math.max(totalPages, 1);
  const pageNumbers = Array.from(
    { length: Math.min(5, displayTotalPages) },
    (_, index) =>
      Math.min(
        Math.max(page - 2 + index, index + 1),
        displayTotalPages - (Math.min(5, displayTotalPages) - 1 - index),
      ),
  );

  return (
    <div className="mb-4 mr-4 mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-white">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <h2 className="whitespace-nowrap text-base font-semibold text-gray-900">
            {title}
          </h2>
          <input
            type="text"
            placeholder="Tìm mã phiếu, khách hàng..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-64 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">{toolbar}</div>
      </div>

      <div className="flex-1 overflow-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-500 ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                  style={{ width: column.width, minWidth: column.width }}>
                  {column.label}
                </th>
              ))}
              <th className="w-8 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {summary && summary.length > 0 && (
              <tr className="border-b bg-gray-50/60">
                <td colSpan={colSpan} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                    {summary.map((item) => (
                      <span key={item.label} className="whitespace-nowrap text-sm">
                        <span className="mr-2 text-gray-500">{item.label}</span>
                        <span className={`font-semibold ${toneClass(item.tone)}`}>
                          {formatCurrency(item.value)}
                        </span>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            )}
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                    <span className="text-xs">Đang tải...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-20 text-center text-gray-400">
                  <div className="text-sm">Không có dòng tài chính nào</div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const expanded = expandedEntryId === row.id;
                const edge = expanded ? "border-t-2 border-brand" : "";
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() =>
                        setExpandedEntryId((current) =>
                          current === row.id ? null : row.id,
                        )
                      }
                      className={`cursor-pointer transition-colors ${
                        expanded ? "bg-brand-soft" : "border-b hover:bg-gray-50"
                      }`}>
                      <td
                        className={`px-4 py-2.5 ${edge} ${
                          expanded ? "border-l-2 bg-brand-soft" : ""
                        }`}
                        style={{ width: "150px", minWidth: "150px" }}>
                        <span className="font-medium text-brand">
                          {displayEntryCode({
                            code: row.code,
                            description: row.description,
                            invoiceCodes: row.invoiceLinks.map(
                              ({ invoice }) => invoice.code,
                            ),
                          })}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        {displayOccurredAt(row)}
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        {row.branch?.name || "-"}
                      </td>
                      <td className={`px-4 py-2.5 ${edge}`}>
                        <div className="text-gray-900">
                          {SUBCATEGORY_LABELS[row.subCategory || ""] ||
                            CATEGORY_LABELS[row.category] ||
                            row.category}
                        </div>
                        {row.description && (
                          <div className="max-w-[220px] truncate text-xs text-gray-500">
                            {row.description}
                          </div>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        {row.invoiceLinks.length
                          ? row.invoiceLinks
                              .map(({ invoice }) => invoice.code)
                              .join(", ")
                          : "-"}
                      </td>
                      <td className={`px-4 py-2.5 text-right ${edge}`}>
                        <span
                          className={`font-semibold ${
                            row.direction === "RECEIPT"
                              ? "text-green-700"
                              : "text-red-600"
                          }`}>
                          {row.direction === "RECEIPT" ? "+" : "-"}
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 ${edge}`}>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            EVIDENCE_COLORS[row.evidenceStatus] ||
                            "bg-gray-100 text-gray-600"
                          }`}>
                          {EVIDENCE_LABELS[row.evidenceStatus] || row.evidenceStatus}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        {row.reviews.length > 0
                          ? row.reviews
                              .map(
                                (review) =>
                                  review.reviewer?.name ||
                                  review.reviewerNameSnapshot ||
                                  "Người dùng Lark chưa liên kết",
                              )
                              .join(", ")
                          : "-"}
                      </td>
                      <td className={`px-4 py-2.5 ${edge}`}>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[row.status] || "bg-gray-100 text-gray-600"
                          }`}>
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        {row.weeklyBatch ? (
                          <Link
                            href={`/tai-chinh/approval-tuan?batchId=${row.weeklyBatch.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="text-brand hover:underline">
                            {row.weeklyBatch.code}
                          </Link>
                        ) : row.direction === "RECEIPT" ? (
                          "Không áp dụng"
                        ) : (
                          "-"
                        )}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${edge}`}
                        onClick={(event) => event.stopPropagation()}>
                        {row.direction === "RECEIPT" ? (
                          <span className="text-xs text-gray-400">-</span>
                        ) : (
                          <label className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={row.cashIssued}
                              disabled={
                                !canUpdate ||
                                row.status !== "APPROVED" ||
                                row.weeklyBatch?.status !== "APPROVED" ||
                                updateCashIssued.isPending
                              }
                              onChange={(event) =>
                                updateCashIssued.mutate({
                                  id: row.id,
                                  cashIssued: event.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                            />
                            {row.cashIssued ? "Đã chi" : "Chưa chi"}
                          </label>
                        )}
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        {row.cashFlow?.code || "-"}
                      </td>
                      <td className={`px-4 py-2.5 text-gray-900 ${edge}`}>
                        <div>{displaySource(row.sourceType)}</div>
                        {row.packingSlip && (
                          <div className="text-brand">{row.packingSlip.code}</div>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${edge} ${
                          expanded ? "border-r-2" : ""
                        }`}>
                        <ChevronDown
                          className={`h-4 w-4 text-gray-400 transition-transform ${
                            expanded ? "rotate-180" : ""
                          }`}
                        />
                      </td>
                    </tr>
                    {expanded && (
                      <InternalFinanceDetailRow
                        row={row}
                        colSpan={colSpan}
                        footer={renderActions(row)}
                      />
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 items-center justify-between border-t bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
            className="rounded border bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand">
            {[10, 15, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange?.(1)}
            disabled={!onPageChange || page <= 1}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            disabled={!onPageChange || page <= 1}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange?.(pageNumber)}
              className={`h-7 w-7 rounded border text-xs font-medium transition-colors ${
                pageNumber === page
                  ? "border-brand bg-brand text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onPageChange?.(Math.min(displayTotalPages, page + 1))}
            disabled={!onPageChange || page >= displayTotalPages}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(displayTotalPages)}
            disabled={!onPageChange || page >= displayTotalPages}
            className="rounded border p-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-gray-400">
          Trang {page}/{displayTotalPages}
          {total > 0 ? ` · ${total.toLocaleString("vi-VN")} dòng` : ""}
        </span>
      </div>
    </div>
  );
}
