"use client";

import { useState, useEffect } from "react";
import {
  useProductConditionLogs,
  useProductConditionSummary,
} from "@/lib/hooks/useProducts";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { CodeLink } from "../shared/CodeLink";

interface Props {
  productId: number;
  branchId?: number;
}

const PAGE_SIZE = 15;

const BUCKETS = [
  { key: "DAMAGED", label: "Bục rách (loại B)" },
  { key: "NEAR_EXPIRY", label: "Cận date" },
  { key: "PROMO", label: "Khuyến mãi" },
] as const;

const TX_LABELS: Record<string, string> = {
  OPENING: "Mở sổ",
  CLT_IN: "Chuyển vào",
  CLT_OUT: "Điều chỉnh giảm",
  CLT_CANCEL: "Hủy phiếu CLT",
  SALE_OUT: "Bán ra",
  SALE_CANCEL: "Hủy bán",
};

const formatMoney = (v: number | null | undefined) =>
  !v && v !== 0 ? "-" : new Intl.NumberFormat("en-US").format(v);

const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("vi-VN") : "-";

export function ProductConditionTab({ productId, branchId }: Props) {
  const [bucket, setBucket] = useState<string>("DAMAGED");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [productId, branchId, bucket]);

  const { data: summary } = useProductConditionSummary(productId, branchId);
  const { data, isLoading } = useProductConditionLogs(
    productId,
    bucket,
    branchId,
    currentPage,
    PAGE_SIZE
  );

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const isNearExpiry = bucket === "NEAR_EXPIRY";

  return (
    <div className="space-y-4">
      {/* Tồn tổng hợp — đối soát: good + damaged + nearExpiry + promo = onHand */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Tồn tổng", value: summary?.onHand, cls: "text-gray-900" },
          { label: "Hàng tốt", value: summary?.good, cls: "text-green-600" },
          {
            label: "Bục rách",
            value: summary?.damaged,
            cls: "text-red-600",
          },
          {
            label: "Cận date",
            value: summary?.nearExpiry,
            cls: "text-orange-600",
          },
          { label: "Khuyến mãi", value: summary?.promo, cls: "text-blue-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-lg font-semibold ${s.cls}`}>
              {s.value != null ? formatMoney(Number(s.value)) : "-"}
            </div>
          </div>
        ))}
      </div>

      {/* Bucket selector */}
      <div className="flex gap-1">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
              bucket === b.key
                ? "bg-brand text-white border-brand"
                : "hover:bg-gray-50 text-gray-700 border-gray-200"
            }`}>
            {b.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Chưa có dữ liệu thẻ kho loại tồn
        </div>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Mã liên quan
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Thời gian
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">
                  Loại giao dịch
                </th>
                {isNearExpiry && (
                  <th className="px-4 py-3 text-left font-medium text-gray-700">
                    Ngày sản xuất
                  </th>
                )}
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Giá vốn
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Số lượng
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">
                  Tồn cuối
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {log.refType === "clt" ? (
                      <CodeLink
                        entity="stock-condition-transfer"
                        code={log.refCode}
                      />
                    ) : log.refType === "invoice" ? (
                      <CodeLink entity="invoice" code={log.refCode} />
                    ) : (
                      <span className="font-medium text-gray-500">
                        {log.refCode || "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDateTime(log.transactionDate || log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {TX_LABELS[log.transactionType] || log.transactionType}
                  </td>
                  {isNearExpiry && (
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(log.expiryDate)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    {formatMoney(log.costPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {log.tonCuoi != null ? formatMoney(log.tonCuoi) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-xs text-gray-500">
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, total)} / {total} dòng
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-600 px-2">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-200 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
