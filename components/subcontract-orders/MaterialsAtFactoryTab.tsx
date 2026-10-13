"use client";

import { useMaterialsAtFactory } from "@/lib/hooks/useSubcontractOrders";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CodeLink } from "../shared/CodeLink";

const formatDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "-";

/**
 * Nguyên liệu của mình đang nằm tại nhà máy. Không có "kho nhà máy" thật —
 * số liệu suy ra từ các lệnh đang mở: đã gửi − đã trả − tiêu hao ước tính theo
 * định mức của số thành phẩm đã nhận.
 */
export function MaterialsAtFactoryTab({ factoryId }: { factoryId?: number }) {
  const { data, isLoading } = useMaterialsAtFactory(
    factoryId ? { factoryId } : undefined,
  );
  const rows = data?.data ?? [];

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse" style={{ minWidth: 900 }}>
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr className="text-left text-sm font-medium text-gray-700">
            <th className="px-4 py-3">Nhà máy</th>
            <th className="px-4 py-3">Lệnh gia công</th>
            <th className="px-4 py-3">Nguyên liệu</th>
            <th className="px-4 py-3">Ngày gửi</th>
            <th className="px-4 py-3">Dự kiến xong</th>
            <th className="px-4 py-3 text-right">Đã gửi</th>
            <th className="px-4 py-3 text-right">Còn tại nhà máy</th>
            <th className="px-4 py-3 text-right">Giá trị</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8} className="py-16 text-center text-gray-400">
                Đang tải...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-20 text-center text-gray-400">
                Không có nguyên liệu nào đang nằm tại nhà máy
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={`${r.orderId}-${r.productId}`}
                className="border-b hover:bg-gray-50 text-sm">
                <td className="px-4 py-2.5">
                  {r.factory?.name || r.supplier?.name || "-"}
                </td>
                <td className="px-4 py-2.5">
                  <CodeLink entity="subcontract-order" code={r.orderCode} />
                </td>
                <td className="px-4 py-2.5">
                  <div>{r.productName}</div>
                  <div className="text-xs text-gray-400">{r.productCode}</div>
                </td>
                <td className="px-4 py-2.5">{formatDay(r.sentDate)}</td>
                <td className="px-4 py-2.5">{formatDay(r.expectedDate)}</td>
                <td className="px-4 py-2.5 text-right">
                  {formatNumber(r.sentQuantity)} {r.unit || ""}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatNumber(r.quantity)} {r.unit || ""}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.value == null ? "-" : formatCurrency(Math.round(r.value))}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {data?.totalValue != null && rows.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 text-sm font-semibold">
              <td colSpan={7} className="px-4 py-3 text-right">
                Tổng giá trị nguyên liệu tại nhà máy
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(Math.round(data.totalValue))}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
