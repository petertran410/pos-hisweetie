"use client";

import { useRef, useEffect, useState } from "react";
import {
  useCompleteStockAudit,
  useCancelStockAudit,
} from "@/lib/hooks/useStockAudits";
import { usePermission } from "@/lib/hooks/usePermissions";
import { StockAudit } from "@/lib/types/stock-audit";
import { StockAuditForm } from "./StockAuditForm";

const formatDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString("vi-VN") : "-";

const formatMoney = (n: number) => n.toLocaleString("vi-VN") + " đ";

interface Props {
  audit: StockAudit;
  colSpan: number;
}

export function StockAuditDetailRow({ audit, colSpan }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const completeAudit = useCompleteStockAudit();
  const cancelAudit = useCancelStockAudit();
  const canUpdate = usePermission("stock_audits", "update");
  const [showEditForm, setShowEditForm] = useState(false);

  const isDraft = audit.status === 1;
  const isCompleted = audit.status === 2;
  const isCancelled = audit.status === 3;

  useEffect(() => {
    wrapperRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  const handleComplete = () => {
    if (
      confirm(
        `Hoàn thành phiếu ${audit.code}?\nTồn kho sẽ được điều chỉnh theo số thực tế.`
      )
    ) {
      completeAudit.mutate(audit.id);
    }
  };

  const handleCancel = () => {
    const msg = isCompleted
      ? `Hủy phiếu ${audit.code}?\nTồn kho sẽ được hoàn lại về giá trị trước khi kiểm.`
      : `Hủy phiếu tạm ${audit.code}?`;
    if (confirm(msg)) {
      cancelAudit.mutate(audit.id);
    }
  };

  // Tổng
  const totalDiff = audit.details.reduce((s, d) => s + Number(d.difference), 0);
  const totalDiffValue = audit.details.reduce(
    (s, d) => s + Number(d.differenceValue),
    0
  );

  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b-2 border-l-2 border-r-2 border-blue-500">
        <div ref={wrapperRef}>
          <div className="px-5 pb-5 bg-blue-50/30">
            {/* Header info */}
            <div className="grid grid-cols-4 gap-4 text-sm mb-4 pt-4">
              <div>
                <span className="text-gray-500">Mã phiếu:</span>
                <p className="font-semibold">{audit.code}</p>
              </div>
              <div>
                <span className="text-gray-500">Chi nhánh:</span>
                <p className="font-medium">{audit.branchName}</p>
              </div>
              <div>
                <span className="text-gray-500">Người kiểm:</span>
                <p className="font-medium">{audit.createdByName}</p>
              </div>
              <div>
                <span className="text-gray-500">Ngày kiểm:</span>
                <p className="font-medium">{formatDateTime(audit.checkDate)}</p>
              </div>
            </div>

            {audit.completedByName && (
              <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-500">Người hoàn thành:</span>
                  <p className="font-medium">{audit.completedByName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Ngày hoàn thành:</span>
                  <p className="font-medium">
                    {formatDateTime(audit.completedAt)}
                  </p>
                </div>
              </div>
            )}

            {audit.note && (
              <div className="mb-4 text-sm">
                <span className="text-gray-500">Ghi chú: </span>
                <span>{audit.note}</span>
              </div>
            )}

            {/* Status badge */}
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  isDraft
                    ? "bg-yellow-100 text-yellow-700"
                    : isCompleted
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                }`}>
                {isDraft ? "Phiếu tạm" : isCompleted ? "Hoàn thành" : "Đã hủy"}
              </span>
            </div>

            {/* Details table */}
            <div className="border rounded overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã hàng</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-center">ĐVT</th>
                    <th className="px-3 py-2 text-right">Tồn kho HT</th>
                    <th className="px-3 py-2 text-right">Thực tế</th>
                    <th className="px-3 py-2 text-right">SL lệch</th>
                    <th className="px-3 py-2 text-right">Giá trị lệch</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.details.map((d) => {
                    const diff = Number(d.difference);
                    const diffValue = Number(d.differenceValue);
                    return (
                      <tr key={d.id} className="border-t">
                        <td className="px-3 py-2 text-blue-600 font-medium">
                          {d.productCode}
                        </td>
                        <td className="px-3 py-2">{d.productName}</td>
                        <td className="px-3 py-2 text-center text-gray-500">
                          {d.unit || "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(d.systemQuantity).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {Number(d.actualQuantity).toLocaleString()}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-medium ${
                            diff < 0
                              ? "text-red-600"
                              : diff > 0
                                ? "text-green-600"
                                : ""
                          }`}>
                          {diff > 0
                            ? `+${diff.toLocaleString()}`
                            : diff.toLocaleString()}
                        </td>
                        <td
                          className={`px-3 py-2 text-right ${
                            diffValue < 0
                              ? "text-red-600"
                              : diffValue > 0
                                ? "text-green-600"
                                : ""
                          }`}>
                          {diffValue !== 0 ? formatMoney(diffValue) : "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {d.note || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-right">
                      Tổng:
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        totalDiff < 0
                          ? "text-red-600"
                          : totalDiff > 0
                            ? "text-green-600"
                            : ""
                      }`}>
                      {totalDiff > 0
                        ? `+${totalDiff.toLocaleString()}`
                        : totalDiff.toLocaleString()}
                    </td>
                    <td
                      className={`px-3 py-2 text-right ${
                        totalDiffValue < 0
                          ? "text-red-600"
                          : totalDiffValue > 0
                            ? "text-green-600"
                            : ""
                      }`}>
                      {totalDiffValue !== 0 ? formatMoney(totalDiffValue) : "-"}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {canUpdate && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {!isCancelled && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelAudit.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {cancelAudit.isPending ? "Đang xử lý..." : "Hủy phiếu"}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {isDraft && canUpdate && (
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                      Chỉnh sửa
                    </button>
                  )}
                  {isDraft && canUpdate && (
                    <button
                      onClick={handleComplete}
                      disabled={completeAudit.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {completeAudit.isPending ? "Đang xử lý..." : "Hoàn thành"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {showEditForm && (
              <StockAuditForm
                audit={audit}
                onClose={() => setShowEditForm(false)}
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
