"use client";

import { useQuery } from "@tanstack/react-query";
import { packingSlipsApi } from "@/lib/api/packing-slips";
import { apiClient } from "@/lib/config/api";
import { Loader2 } from "lucide-react";
import { CodeLink } from "../shared/CodeLink";

interface InvoicePackingSlipsTabProps {
  invoiceId: number;
}

const TYPE_ORDER: Record<string, number> = {
  "dong-hang": 0,
  loading: 1,
  "giao-hang": 2,
};

const TYPE_LABEL: Record<string, string> = {
  "giao-hang": "Giao hàng",
  "dong-hang": "Đóng hàng",
  loading: "Loading",
};

const TYPE_COLOR: Record<string, string> = {
  "giao-hang": "bg-green-100 text-green-800",
  "dong-hang": "bg-blue-100 text-blue-800",
  loading: "bg-purple-100 text-purple-800",
};

export function InvoicePackingSlipsTab({
  invoiceId,
}: InvoicePackingSlipsTabProps) {
  const { data: giaoHangData, isLoading: isLoadingGiaoHang } = useQuery({
    queryKey: ["packing-slips", "invoice", invoiceId],
    queryFn: () => packingSlipsApi.getPackingSlips({ invoiceId, limit: 100 }),
  });

  const { data: dongHangData, isLoading: isLoadingDongHang } = useQuery({
    queryKey: ["packing-hangs", "invoice", invoiceId],
    queryFn: () =>
      apiClient.get<{ data: any[] }>("/packing-hangs", {
        invoiceId,
        limit: 100,
      }),
  });

  const { data: loadingData, isLoading: isLoadingLoading } = useQuery({
    queryKey: ["packing-loadings", "invoice", invoiceId],
    queryFn: () =>
      apiClient.get<{ data: any[] }>("/packing-loadings", {
        invoiceId,
        limit: 100,
      }),
  });

  const isLoading = isLoadingGiaoHang || isLoadingDongHang || isLoadingLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  const allItems = [
    ...(dongHangData?.data || []).map((item: any) => ({
      ...item,
      type: "dong-hang",
    })),
    ...(loadingData?.data || []).map((item: any) => ({
      ...item,
      type: "loading",
    })),
    ...(giaoHangData?.data || []).map((item: any) => ({
      ...item,
      type: "giao-hang",
    })),
  ].sort((a, b) => {
    const orderDiff = (TYPE_ORDER[a.type] ?? 99) - (TYPE_ORDER[b.type] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (allItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">Chưa có báo đơn nào</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="px-4 py-3 text-left text-sm font-medium">Loại</th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Mã báo đơn
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Chi nhánh
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium">
              Số kiện
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Thời gian
            </th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item: any) => (
            <tr
              key={`${item.type}-${item.id}`}
              className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    TYPE_COLOR[item.type] || "bg-gray-100 text-gray-800"
                  }`}>
                  {TYPE_LABEL[item.type] || item.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <CodeLink entity="packing-slip" code={item.code} />
              </td>
              <td className="px-4 py-3 text-sm">{item.branch?.name || "-"}</td>
              <td className="px-4 py-3 text-center text-sm">
                {item.numberOfPackages}
              </td>
              <td className="px-4 py-3 text-sm">
                {new Date(item.createdAt).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
