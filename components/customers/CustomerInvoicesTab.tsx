"use client";

import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";
import { returnOrdersApi } from "@/lib/api/return-orders";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";

interface CustomerInvoicesTabProps {
  customerId: number;
}

interface TimelineItem {
  id: number;
  code: string;
  date: string;
  type: "invoice" | "return";
  sellerName: string;
  branchName: string;
  totalAmount: number;
  status: number;
  statusLabel: string;
  statusColor: string;
  debtAdjustment: number;
}

const getInvoiceStatusLabel = (status: number) => {
  switch (status) {
    case 1:
      return "Hoàn thành";
    case 2:
      return "Đã hủy";
    case 3:
      return "Đang xử lý";
    case 4:
      return "Không giao được";
    case 5:
      return "Đóng hàng";
    case 6:
      return "Loading";
    case 7:
      return "Giao thành công";
    case 8:
      return "Trả hàng";
    default:
      return "Không xác định";
  }
};

const getInvoiceStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-green-100 text-green-800";
    case 2:
      return "bg-red-100 text-red-800";
    case 3:
      return "bg-blue-100 text-blue-800";
    case 4:
      return "bg-yellow-100 text-yellow-800";
    case 5:
      return "bg-orange-100 text-orange-800";
    case 6:
      return "bg-purple-100 text-purple-800";
    case 7:
      return "bg-teal-100 text-teal-800";
    case 8:
      return "bg-pink-100 text-pink-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getReturnStatusLabel = (status: number) => {
  switch (status) {
    case 1:
      return "Yêu cầu trả hàng";
    case 2:
      return "Nhập hàng trả";
    case 3:
      return "Yêu cầu hoàn tiền";
    case 4:
      return "Hoàn thành";
    case 5:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const getReturnStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return "bg-blue-100 text-blue-800";
    case 2:
      return "bg-yellow-100 text-yellow-800";
    case 3:
      return "bg-orange-100 text-orange-800";
    case 4:
      return "bg-green-100 text-green-800";
    case 5:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", "customer", customerId],
    queryFn: () =>
      invoicesApi.getInvoices({
        customerIds: [customerId],
        limit: 100,
      }),
  });

  console.log(invoicesData?.data.map((i) => i.code));

  const { data: returnsData, isLoading: returnsLoading } = useQuery({
    queryKey: ["return-orders", "customer", customerId],
    queryFn: () =>
      returnOrdersApi.getAll({
        customerId,
        limit: 100,
      }),
  });

  const isLoading = invoicesLoading || returnsLoading;
  const [page, setPage] = useState(1);
  const limit = 5;

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    (invoicesData?.data || []).forEach((inv: any) => {
      items.push({
        id: inv.id,
        code: inv.code,
        date: inv.purchaseDate,
        type: "invoice",
        sellerName: inv.soldBy?.name || inv.creator?.name || "-",
        branchName: inv.branch?.name || "-",
        totalAmount: Number(inv.grandTotal),
        status: inv.status,
        statusLabel: getInvoiceStatusLabel(inv.status),
        statusColor: getInvoiceStatusColor(inv.status),
        debtAdjustment: Number(inv.grandTotal),
      });
    });

    (returnsData?.data || []).forEach((ro: any) => {
      const refundAmount = Number(ro.refundAmount || ro.totalReturnAmount || 0);
      items.push({
        id: ro.id,
        code: ro.code,
        date: ro.createdAt,
        type: "return",
        sellerName: ro.creator?.name || ro.createdByName || "-",
        branchName: ro.branch?.name || "-",
        totalAmount: refundAmount,
        status: ro.status,
        statusLabel: getReturnStatusLabel(ro.status),
        statusColor: getReturnStatusColor(ro.status),
        debtAdjustment: ro.status === 4 ? -refundAmount : 0,
      });
    });

    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return items;
  }, [invoicesData, returnsData]);

  const totalPages = Math.ceil(timeline.length / limit);
  const paginatedItems = timeline.slice((page - 1) * limit, page * limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Chưa có lịch sử bán hàng/trả hàng
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium">Loại</th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã phiếu
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thời gian
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Người thực hiện
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Chi nhánh
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium">
              Giá trị
            </th>
            {/* <th className="px-4 py-3 text-center text-sm font-medium">
              Trạng thái
            </th> */}
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((item) => (
            <tr
              key={`${item.type}-${item.id}`}
              className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                {item.type === "invoice" ? (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    Bán hàng
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-50 text-orange-700">
                    Trả hàng
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.code ? (
                  item.type === "invoice" ? (
                    <>
                      <Link
                        href={`/don-hang/hoa-don?Code=${item.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-md font-medium text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}>
                        {item.code}
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/don-hang/tra-hang?Code=${item.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-md font-medium text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}>
                        {item.code}
                      </Link>
                    </>
                  )
                ) : (
                  <span>-</span>
                )}
                {/* <span className="text-blue-600 hover:underline cursor-pointer">
                  {item.code}
                </span> */}
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(item.date).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-sm">{item.sellerName}</td>
              <td className="px-4 py-3 text-sm">{item.branchName}</td>
              <td className="px-4 py-3 text-sm text-right">
                {item.type === "invoice" ? (
                  <span className="text-red-600 font-medium">
                    +{formatCurrency(item.totalAmount)}
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    -{formatCurrency(item.totalAmount)}
                  </span>
                )}
              </td>
              {/* <td className="px-4 py-3 text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${item.statusColor}`}>
                  {item.statusLabel}
                </span>
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Tổng: {timeline.length} bản ghi
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
              Trước
            </button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
