"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Pencil,
  SquareX,
} from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/lib/hooks/useCan";
import {
  useCancelCustomerDemandMonth,
  useCustomerDemand,
} from "@/lib/hooks/useCustomerDemand";
import type { CustomerDemand } from "@/lib/types/customer-demand";
import {
  DemandStatusChip,
  formatDemandDateTime,
  formatDemandMonth,
  formatDemandQty,
} from "./DemandUi";

interface CustomerDemandDetailProps {
  demandId: number;
  onEditMonth: (monthId: number) => void;
  onCopyMonth: (demand: CustomerDemand, monthId: number) => void;
}

interface CustomerDemandDetailRowProps extends CustomerDemandDetailProps {
  colSpan: number;
}

export function CustomerDemandDetailRow({
  demandId,
  colSpan,
  onEditMonth,
  onCopyMonth,
}: CustomerDemandDetailRowProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border-b-2 border-l-2 border-r-2 border-brand bg-gray-50">
        <div className="overflow-hidden border border-gray-200 bg-white">
          <CustomerDemandDetail
            demandId={demandId}
            onEditMonth={onEditMonth}
            onCopyMonth={onCopyMonth}
          />
        </div>
      </td>
    </tr>
  );
}

export function CustomerDemandDetail({
  demandId,
  onEditMonth,
  onCopyMonth,
}: CustomerDemandDetailProps) {
  const { data: demand, isLoading } = useCustomerDemand(demandId);
  const canCancel = useCan("customer_demand", "cancel");
  const canCreate = useCan("customer_demand", "create");
  const canUpdate = useCan("customer_demand", "update");
  const cancel = useCancelCustomerDemandMonth();
  const [collapsedMonths, setCollapsedMonths] = useState<
    Record<number, boolean>
  >({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        Đang tải chi tiết Demand...
      </div>
    );
  }

  if (!demand) {
    return (
      <div className="px-6 py-8 text-center text-sm text-red-600">
        Không tìm thấy thông tin Demand.
      </div>
    );
  }

  const editableMonths = demand.months.filter(
    (month) => month.status !== "CANCELLED"
  );
  const actionMonth = editableMonths[0] ?? demand.months[0] ?? null;
  const aggregateStatus = getAggregateStatus(demand);

  const handleCancel = async (monthId: number) => {
    if (
      !window.confirm(
        "Hủy tháng Demand này? Tháng đã hủy sẽ không được cộng vào dự kiến đặt hàng."
      )
    ) {
      return;
    }
    try {
      await cancel.mutateAsync({ id: monthId });
      toast.success("Đã hủy tháng Demand");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể hủy Demand"
      );
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 border-b border-gray-200 pb-3">
        <div className="mb-4 flex items-center justify-between border-b pb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-brand">#{demand.id}</span>
            <span className="text-gray-400">-</span>
            {demand.customer.code ? (
              <Link
                href={`/khach-hang?Code=${encodeURIComponent(demand.customer.code)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-brand hover:underline"
                onClick={(event) => event.stopPropagation()}>
                {demand.customer.name}
              </Link>
            ) : (
              <span className="text-lg font-semibold text-gray-800">
                {demand.customer.name}
              </span>
            )}
            <DemandStatusChip
              status={aggregateStatus}
              label={getAggregateStatusLabel(demand)}
            />
          </div>
          <span className="shrink-0 text-sm font-medium text-gray-600">
            {demand.months.length} tháng
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-3 pb-1 md:grid-cols-3">
          <InfoField
            label="Mã khách hàng:"
            value={demand.customer.code || `ID ${demand.customer.id}`}
          />
          <InfoField
            label="Ngày tạo:"
            value={formatDemandDateTime(demand.createdAt)}
          />
          <InfoField
            label="Ngày cập nhật:"
            value={formatDemandDateTime(demand.updatedAt)}
          />
          <InfoField
            label="Số tháng:"
            value={demand.months.length.toLocaleString("vi-VN")}
          />
          <InfoField
            label="Số sản phẩm:"
            value={demand.totalProducts.toLocaleString("vi-VN")}
          />
          <InfoField
            label="Tổng đơn vị cơ bản:"
            value={formatDemandQty(demand.totalQuantityBase)}
          />
        </div>

        <div className="mt-4 flex items-start gap-2 border-b border-gray-200 pb-3 text-sm text-gray-600">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <span className="mr-1 font-medium text-gray-500">
              Ghi chú phiếu:
            </span>
            <span>{demand.note || "Không có ghi chú"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {demand.months.length === 0 ? (
          <div className="rounded-lg border border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            Phiếu chưa có tháng Demand.
          </div>
        ) : (
          demand.months.map((month) => {
            const lines = month.lines ?? [];
            const collapsed = !!collapsedMonths[month.id];
            const totalQuantityBase = lines.reduce(
              (sum, line) => sum + Number(line.quantityBase || 0),
              0
            );
            const logs = (month.changeLogs ?? [])
              .filter((log) => log.action !== "APPROVE")
              .slice(0, 3);

            return (
              <section key={month.id}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Danh sách sản phẩm - {formatDemandMonth(month.month)}
                    </h4>
                    <DemandStatusChip status={month.status} />
                    <span className="text-xs text-gray-500">
                      {lines.length} sản phẩm ·{" "}
                      {formatDemandQty(totalQuantityBase)} đv cơ bản
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedMonths((prev) => ({
                        ...prev,
                        [month.id]: !prev[month.id],
                      }))
                    }
                    className="rounded-full border border-gray-300 bg-white p-1.5 text-gray-500 hover:bg-gray-50"
                    aria-label={collapsed ? "Mở rộng" : "Thu gọn"}>
                    {collapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {!collapsed && (
                  <>
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-100">
                            <th className="px-[10px] py-2 text-center text-sm font-semibold tracking-wider text-gray-700">
                              STT
                            </th>
                            <th className="px-[10px] py-2 text-left text-sm font-semibold tracking-wider text-gray-700">
                              Mã hàng
                            </th>
                            <th className="px-[10px] py-2 text-left text-sm font-semibold tracking-wider text-gray-700">
                              Tên hàng
                            </th>
                            <th className="px-[10px] py-2 text-center text-sm font-semibold tracking-wider text-gray-700">
                              Đơn vị
                            </th>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold tracking-wider text-gray-700">
                              Số lượng
                            </th>
                            <th className="px-[10px] py-2 text-right text-sm font-semibold tracking-wider text-gray-700">
                              Quy đổi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {lines.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-6 text-center text-sm text-gray-400">
                                Tháng chưa có sản phẩm.
                              </td>
                            </tr>
                          ) : (
                            lines.map((line, index) => (
                              <tr
                                key={line.id}
                                className="transition-colors hover:bg-gray-50">
                                <td className="px-[10px] py-2 text-center text-sm text-gray-900">
                                  {index + 1}
                                </td>
                                <td className="px-[10px] py-2 text-sm font-medium">
                                  {line.product?.code ? (
                                    <Link
                                      href={`/san-pham/danh-sach?Code=${encodeURIComponent(line.product.code)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-brand hover:underline"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }>
                                      {line.product.code}
                                    </Link>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-[10px] py-2 text-sm font-medium text-gray-900">
                                  {line.product?.name ??
                                    "Sản phẩm không xác định"}
                                </td>
                                <td className="px-[10px] py-2 text-center text-sm text-gray-700">
                                  {line.inputUnit === "CARTON"
                                    ? "Thùng"
                                    : (line.product?.unit ?? "Đơn vị")}
                                </td>
                                <td className="px-[10px] py-2 text-right text-sm font-semibold text-gray-900">
                                  {formatDemandQty(line.inputQuantity)}
                                </td>
                                <td className="px-[10px] py-2 text-right text-sm font-semibold text-gray-900">
                                  {formatDemandQty(line.quantityBase)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {logs.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs text-gray-500">
                        {logs.map((log) => (
                          <div key={log.id}>
                            {formatDemandDateTime(log.createdAt)} · {log.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2">
          {actionMonth &&
            actionMonth.status !== "CANCELLED" &&
            canCancel && (
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => void handleCancel(actionMonth.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                <SquareX className="h-3.5 w-3.5" />
                Hủy
              </button>
            )}
          {actionMonth && canCreate && (
            <button
              type="button"
              onClick={() => onCopyMonth(demand, actionMonth.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Copy className="h-3.5 w-3.5" />
              Sao chép
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actionMonth &&
            actionMonth.status !== "CANCELLED" &&
            canUpdate && (
            <button
              type="button"
              onClick={() => onEditMonth(actionMonth.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Pencil className="h-3.5 w-3.5" />
              Sửa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="block text-sm text-gray-500">{label}</label>
      <span className="block border-b pb-1 text-sm text-gray-900">
        {value}
      </span>
    </div>
  );
}

function getAggregateStatus(
  demand: CustomerDemand
): "DRAFT" | "CONFIRMED" | "CANCELLED" | "mixed" {
  const months = demand.months ?? [];
  if (!months.length) return "mixed";
  if (months.every((month) => month.status === "DRAFT")) return "DRAFT";
  if (months.every((month) => month.status === "CONFIRMED")) {
    return "CONFIRMED";
  }
  if (months.every((month) => month.status === "CANCELLED")) {
    return "CANCELLED";
  }
  return "mixed";
}

function getAggregateStatusLabel(demand: CustomerDemand) {
  const months = demand.months ?? [];
  const draft = months.filter((month) => month.status === "DRAFT").length;
  const confirmed = months.filter(
    (month) => month.status === "CONFIRMED"
  ).length;
  const cancelled = months.filter(
    (month) => month.status === "CANCELLED"
  ).length;
  if (draft > 0) return `${draft} chưa cập nhật`;
  if (confirmed === months.length) return `${confirmed} hoàn thành`;
  if (cancelled === months.length) return "Đã hủy";
  return `${confirmed} hoàn thành · ${cancelled} hủy`;
}
