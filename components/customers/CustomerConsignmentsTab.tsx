"use client";

import { useQuery } from "@tanstack/react-query";
import { consignmentsApi } from "@/lib/api/consignments";
import {
  CONSIGNMENT_STATUS_COLOR,
  getStatusLabel,
} from "@/lib/types/consignment";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { DocumentPreviewModal } from "../shared/DocumentPreviewModal";

interface CustomerConsignmentsTabProps {
  customerId: number;
}

export function CustomerConsignmentsTab({
  customerId,
}: CustomerConsignmentsTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["consignments", "customer", customerId],
    queryFn: () =>
      consignmentsApi.getAll({
        customerId,
        pageSize: 1000,
      }),
  });

  const [page, setPage] = useState(1);
  const limit = 5;
  const [preview, setPreview] = useState<{ id: number; code: string } | null>(
    null
  );

  const consignments = data?.data || [];

  const totalPages = Math.ceil(consignments.length / limit);
  const paginated = consignments.slice((page - 1) * limit, page * limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  if (consignments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có lịch sử ký gửi
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Mã ký gửi
            </th>
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Ngày ký gửi
            </th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Người bán
            </th>
            <th className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-left text-xs lg:text-sm font-medium">
              Chi nhánh
            </th>
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-right text-xs lg:text-sm font-medium">
              Tổng cộng
            </th>
            <th className="px-2 py-2 lg:px-4 lg:py-3 text-center text-xs lg:text-sm font-medium">
              Trạng thái
            </th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((c) => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview({ id: c.id, code: c.code });
                  }}
                  className="text-brand hover:underline">
                  {c.code}
                </button>
              </td>
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                {new Date(c.consignDate).toLocaleString("vi-VN")}
              </td>
              <td className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                {c.soldBy?.name || "-"}
              </td>
              <td className="hidden lg:table-cell px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm">
                {c.branch?.name || "-"}
              </td>
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-xs lg:text-sm text-right">
                {formatCurrency(Number(c.grandTotal))}
              </td>
              <td className="px-2 py-2 lg:px-4 lg:py-3 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    CONSIGNMENT_STATUS_COLOR[c.status] ??
                    "bg-gray-100 text-gray-700"
                  }`}>
                  {getStatusLabel(c.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
            Trước
          </button>
          <span className="text-sm text-gray-500">
            {page}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">
            Sau
          </button>
        </div>
      )}

      {preview && (
        <DocumentPreviewModal
          type="consignment"
          id={preview.id}
          code={preview.code}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
