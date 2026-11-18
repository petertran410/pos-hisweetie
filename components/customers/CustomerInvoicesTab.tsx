"use client";

import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";
import { returnOrdersApi } from "@/lib/api/return-orders";
import { formatCurrency } from "@/lib/utils";
import { Receipt } from "lucide-react";
import {
  DateCell,
  MoneyChange,
  StatusPill,
  TabEmpty,
  TabLoading,
  TabPagination,
  TabTable,
  Td,
  Th,
  Tr,
} from "./CustomerTabUI";
import { useMemo, useState } from "react";
import { DocumentPreviewModal } from "../shared/DocumentPreviewModal";

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
        limit: 1000,
      }),
  });

  const { data: returnsData, isLoading: returnsLoading } = useQuery({
    queryKey: ["return-orders", "customer", customerId],
    queryFn: () =>
      returnOrdersApi.getAll({
        customerId,
        limit: 1000,
      }),
  });

  const isLoading = invoicesLoading || returnsLoading;
  const [page, setPage] = useState(1);
  const limit = 9;
  const [preview, setPreview] = useState<{
    type: "invoice" | "return-order";
    id: number;
    code: string;
  } | null>(null);

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    (invoicesData?.data || [])
      .filter((inv: any) => inv.status !== 2) // loại bỏ hóa đơn đã hủy
      .forEach((inv: any) => {
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

    (returnsData?.data || [])
      .filter((ro: any) => ro.status !== 5 && !ro.code?.startsWith("CTN")) // loại bỏ phiếu trả hàng đã hủy + phiếu cấn trừ nợ
      .forEach((ro: any) => {
        const refundAmount = Number(
          ro.refundAmount || ro.totalReturnAmount || 0
        );
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

  if (isLoading) return <TabLoading />;

  if (timeline.length === 0) {
    return (
      <TabEmpty
        icon={Receipt}
        title="Chưa có lịch sử bán hàng/trả hàng"
        description="Hóa đơn và phiếu trả hàng của khách sẽ hiện ở đây."
      />
    );
  }

  return (
    <>
      <TabTable
        footer={
          <TabPagination
            page={page}
            totalPages={totalPages}
            total={timeline.length}
            unit="bản ghi"
            onChange={setPage}
          />
        }>
        <thead>
          <tr>
            <Th className="hidden md:table-cell">Loại</Th>
            <Th>Mã phiếu</Th>
            <Th>Thời gian</Th>
            <Th>Người thực hiện</Th>
            <Th className="hidden md:table-cell">Chi nhánh</Th>
            <Th align="right">Giá trị</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedItems.map((item) => (
            <Tr key={`${item.type}-${item.id}`}>
              <Td className="hidden md:table-cell">
                {item.type === "invoice" ? (
                  <StatusPill colorClass="bg-blue-50 text-blue-700">
                    Bán hàng
                  </StatusPill>
                ) : (
                  <StatusPill colorClass="bg-orange-50 text-orange-700">
                    Trả hàng
                  </StatusPill>
                )}
              </Td>
              <Td>
                {item.code ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreview({
                        type:
                          item.type === "invoice" ? "invoice" : "return-order",
                        id: item.id,
                        code: item.code,
                      });
                    }}
                    className="font-medium text-brand hover:underline">
                    {item.code}
                  </button>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <DateCell value={item.date} />
              </Td>
              <Td>{item.sellerName}</Td>
              <Td className="hidden md:table-cell">{item.branchName}</Td>
              <Td align="right">
                <MoneyChange
                  direction={item.type === "invoice" ? "increase" : "decrease"}
                  formatted={formatCurrency(item.totalAmount)}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </TabTable>

      {preview && (
        <DocumentPreviewModal
          type={preview.type}
          id={preview.id}
          code={preview.code}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
