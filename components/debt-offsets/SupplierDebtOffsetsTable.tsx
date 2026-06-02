"use client";

import { useState } from "react";
import { useSupplierReturns } from "@/lib/hooks/useSupplierReturns";
import { formatCurrency } from "@/lib/utils";
import type { SupplierReturn } from "@/lib/types/supplier-return";
import { CodeLink } from "@/components/shared/CodeLink";

interface SupplierDebtOffsetsTableProps {
  filters: any;
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString("vi-VN");
};

export function SupplierDebtOffsetsTable({
  filters,
}: SupplierDebtOffsetsTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSupplierReturns({
    page,
    limit,
    search,
    refundType: "debt_offset",
    status: 3,
    ...filters,
  });

  const items = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] mt-4 mr-4 mb-4 border rounded-xl">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <input
          type="text"
          placeholder="Tìm theo mã phiếu trả hàng, tên NCC..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border rounded-lg text-sm w-80"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Mã phiếu
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Mã phiếu nhập
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Nhà cung cấp
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Chi nhánh
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Số tiền cấn trừ
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Người thực hiện
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Thời gian
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  Không có bản ghi cấn trừ công nợ nhà cung cấp
                </td>
              </tr>
            ) : (
              items.map((item: SupplierReturn) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <CodeLink entity="supplier-return" code={item.code} />
                  </td>
                  <td className="px-4 py-3">
                    {item.purchaseOrder?.code ? (
                      <CodeLink
                        entity="purchase-order"
                        code={item.purchaseOrder.code}
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">{item.supplier?.name || "-"}</td>
                  <td className="px-4 py-3">{item.branch?.name || "-"}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {formatCurrency(Number(item.refundedAmount))}
                  </td>
                  <td className="px-4 py-3">
                    {item.refundConfirmedByName || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {formatDateTime(item.refundConfirmedAt || item.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Đã cấn trừ
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
        <div className="text-sm text-gray-600">Tổng: {total} bản ghi</div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 border rounded text-sm">
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">
            Trước
          </button>
          <span className="text-sm">
            {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
