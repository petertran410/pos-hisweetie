"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import { CodeLink } from "@/components/shared/CodeLink";
import { formatCurrency } from "@/lib/utils";
import {
  displayEntryCode,
  displayOccurredAt,
  displaySource,
  humanSnapshotRows,
} from "@/lib/internal-finance/display";

const CATEGORY_LABELS: Record<string, string> = {
  DELIVERY_FEE: "Chi phí giao hàng",
  FUEL: "Xăng dầu",
  VEHICLE_CARE: "Chăm sóc xe",
  SALARY_ADVANCE: "Tạm ứng lương",
  CUSTOMER_RECEIPT: "Thu tiền khách hàng",
  MANUAL_RECEIPT: "Phiếu thu thủ công",
  OTHER_EXPENSE: "Chi phí khác",
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

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="mb-2 flex flex-col gap-2 border-b pb-1">
      <label className="block text-sm text-gray-500">{label}</label>
      <span className="block text-sm text-gray-900">{value || "-"}</span>
    </div>
  );
}

function DetailTable({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">{title}</h4>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-100">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-[10px] py-2 text-left text-sm font-semibold tracking-wider text-gray-700">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function InternalFinanceDetailRow({
  row,
  colSpan,
  footer,
}: {
  row: InternalFinanceEntry;
  colSpan: number;
  footer?: ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const snapshotRows = humanSnapshotRows(row.sourceSnapshot);
  const entryCode = displayEntryCode({
    code: row.code,
    description: row.description,
    invoiceCodes: row.invoiceLinks.map(({ invoice }) => invoice.code),
  });
  const reviewers = row.reviews
    .map(
      (review) =>
        `${review.reviewer?.name || review.reviewerNameSnapshot || "Người dùng Lark chưa liên kết"} (${review.role === "ACCOUNTANT" ? "Kế toán" : "Quản lý"})`,
    )
    .join(", ");

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let scrollEl: HTMLElement | null = el.parentElement;
    while (scrollEl) {
      const overflowX = getComputedStyle(scrollEl).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") break;
      scrollEl = scrollEl.parentElement;
    }
    if (!scrollEl) return;

    const update = () => {
      const next = `${scrollEl!.clientWidth}px`;
      if (el.style.width !== next) el.style.width = next;
    };
    update();

    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [row.id]);

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
        <div ref={wrapperRef} className="sticky left-0 bg-gray-50" style={{ width: 0 }}>
          <div className="overflow-hidden border border-gray-200 bg-white">
            <div className="p-4">
              <div className="mb-4 border-b border-gray-200 pb-3">
                <div className="mb-4 flex items-center justify-between border-b pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-lg font-bold text-brand">{entryCode}</span>
                    <span className="text-gray-400">-</span>
                    {row.customer?.code ? (
                      <>
                        <Link
                          href={`/khach-hang?Code=${row.customer.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-lg font-semibold text-brand hover:underline"
                          onClick={(event) => event.stopPropagation()}>
                          {row.customer.name}
                        </Link>
                        <Link
                          href={`/khach-hang?Code=${row.customer.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 transition-colors hover:text-brand"
                          onClick={(event) => event.stopPropagation()}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <span className="truncate text-lg font-semibold text-gray-800">
                        {CATEGORY_LABELS[row.category] || row.category}
                      </span>
                    )}
                    <span
                      className={`ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[row.status] || "bg-gray-100 text-gray-700"
                      }`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-gray-600">
                    {row.branch?.name || "-"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-x-8 pb-4">
                  <InfoField
                    label="Loại phiếu:"
                    value={row.direction === "RECEIPT" ? "Phiếu thu" : "Phiếu chi"}
                  />
                  <InfoField
                    label="Ngày:"
                    value={displayOccurredAt({
                      occurredAt: row.occurredAt,
                      sourceType: row.sourceType,
                      sourceSnapshot: row.sourceSnapshot,
                    })}
                  />
                  <InfoField
                    label="Số tiền:"
                    value={
                      <span
                        className={`font-semibold ${
                          row.direction === "RECEIPT"
                            ? "text-green-700"
                            : "text-red-600"
                        }`}>
                        {row.direction === "RECEIPT" ? "+" : "-"}
                        {formatCurrency(row.amount)}
                      </span>
                    }
                  />
                  <InfoField label="Nguồn:" value={displaySource(row.sourceType)} />
                  <InfoField
                    label="Báo đơn:"
                    value={row.packingSlip?.code || "-"}
                  />
                  <InfoField
                    label="Approval tuần:"
                    value={
                      row.weeklyBatch
                        ? (
                            <Link
                              href={`/tai-chinh/approval-tuan?batchId=${row.weeklyBatch.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="text-brand hover:underline">
                              {row.weeklyBatch.code} ·{" "}
                              {STATUS_LABELS[row.weeklyBatch.status] ||
                                row.weeklyBatch.status}
                            </Link>
                          )
                        : row.direction === "RECEIPT"
                          ? "Không áp dụng"
                          : "-"
                    }
                  />
                  <InfoField
                    label="CashFlow:"
                    value={
                      row.cashFlow ? (
                        <Link
                          href={`/tai-chinh/so-quy?Code=${row.cashFlow.code}`}
                          className="text-brand hover:underline">
                          {row.cashFlow.code}
                        </Link>
                      ) : (
                        "Chưa ghi nhận"
                      )
                    }
                  />
                  <InfoField label="Người kiểm tra:" value={reviewers || "-"} />
                  <InfoField
                    label="Đã chi:"
                    value={
                      row.direction === "RECEIPT"
                        ? "Không áp dụng"
                        : row.cashIssued
                          ? `${row.cashIssuer?.name || "Đã xác nhận"}${
                              row.cashIssuedAt
                                ? ` · ${new Date(row.cashIssuedAt).toLocaleString("vi-VN")}`
                                : ""
                            }`
                          : row.weeklyBatch?.status === "APPROVED"
                            ? "Chưa chi"
                            : "Chờ Approval tuần"
                    }
                  />
                  <InfoField label="Nội dung:" value={row.description || "-"} />
                  {row.direction === "EXPENSE" && (
                    <>
                      <InfoField
                        label="Khoản mục:"
                        value={row.expenseItem || "-"}
                      />
                      <InfoField
                        label="Người chi:"
                        value={row.payer?.name || "-"}
                      />
                      {row.quantity != null && row.unitPrice != null && (
                        <InfoField
                          label="Số lượng × Đơn giá:"
                          value={`${formatCurrency(row.quantity)} × ${formatCurrency(row.unitPrice)}`}
                        />
                      )}
                      {row.vehicle && (
                        <InfoField label="Xe:" value={row.vehicle.label} />
                      )}
                      {row.note && <InfoField label="Ghi chú:" value={row.note} />}
                    </>
                  )}
                </div>
              </div>

              {snapshotRows.length > 0 && (
                <DetailTable title="Chi tiết phát sinh" headers={["Hạng mục", "Giá trị"]}>
                  {snapshotRows.map((item) => (
                    <tr key={item.label} className="transition-colors hover:bg-gray-50">
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {item.label}
                      </td>
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {item.value}
                      </td>
                    </tr>
                  ))}
                </DetailTable>
              )}

              {row.invoiceLinks.length > 0 && (
                <DetailTable title="Hóa đơn liên quan" headers={["STT", "Mã hóa đơn"]}>
                  {row.invoiceLinks.map(({ invoice }, index) => (
                    <tr key={invoice.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-[10px] py-2 text-center text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-[10px] py-2">
                        <CodeLink entity="invoice" code={invoice.code} />
                      </td>
                    </tr>
                  ))}
                </DetailTable>
              )}

              <DetailTable title="Chứng từ" headers={["STT", "Tên file", "Loại"]}>
                {row.attachments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-[10px] py-6 text-center text-sm text-gray-400">
                      Chưa có chứng từ
                    </td>
                  </tr>
                ) : (
                  row.attachments.map((attachment, index) => (
                    <tr key={attachment.fileUrl} className="transition-colors hover:bg-gray-50">
                      <td className="px-[10px] py-2 text-center text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-[10px] py-2 text-sm">
                        <a
                          href={attachment.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand hover:underline">
                          {attachment.fileName || "Mở chứng từ"}
                        </a>
                      </td>
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {attachment.kind || attachment.fileType || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </DetailTable>

              {row.reviews.length > 0 && (
                <DetailTable
                  title="Lịch sử kiểm tra"
                  headers={["Người kiểm tra", "Vai trò", "Kết quả", "Lý do"]}>
                  {row.reviews.map((review) => (
                    <tr key={review.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {review.reviewer?.name || "-"}
                      </td>
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {review.role === "ACCOUNTANT" ? "Kế toán" : "Quản lý"}
                      </td>
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {review.decision}
                      </td>
                      <td className="px-[10px] py-2 text-sm text-gray-900">
                        {review.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </DetailTable>
              )}

              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 pt-4">
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
