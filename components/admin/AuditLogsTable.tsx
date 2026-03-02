"use client";

import { useState, Fragment } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AuditLogsTableProps {
  logs: any[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const resourceNames: Record<string, string> = {
  products: "Sản phẩm",
  orders: "Đơn đặt hàng",
  invoices: "Hóa đơn",
  customers: "Khách hàng",
  suppliers: "Nhà cung cấp",
  inventories: "Tồn kho",
  users: "Người dùng",
  branches: "Chi nhánh",
  transfers: "Chuyển kho",
  purchase_orders: "Đơn mua hàng",
  order_suppliers: "Đặt hàng NCC",
  packing_slips: "Thu khác",
  packing_hangs: "Hóa đơn",
  packing_loadings: "Đặt hàng",
  cashflows: "Thu chi",
  productions: "Sản xuất",
  destructions: "Hủy hàng",
  navigation: "Điều hướng",
};

const actionNames: Record<string, string> = {
  create: "Tạo",
  update: "Cập nhật",
  delete: "Xóa",
  view: "Xem",
  list: "Danh sách",
  page_view: "Xem trang",
};

export function AuditLogsTable({
  logs,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: AuditLogsTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const formatDetail = (log: any) => {
    const parts: string[] = [];

    if (log.resource === "packing_slips") {
      if (log.action === "create" && log.newData) {
        const data = log.newData;
        parts.push(`Thông tin thu khác cho hóa đơn: ${data.code || "N/A"}`);
        if (data.invoices?.length > 0) {
          data.invoices.forEach((inv: any) => {
            parts.push(`, khách hàng ${inv.customerCode}`);
          });
        }
        parts.push(`, với giá trị ${log.newData.cashAmount || 0}`);
        parts.push(
          `, thời gian: ${format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}`
        );
      }
    } else if (log.resource === "invoices") {
      if (log.action === "create" && log.newData) {
        parts.push(`Tạo hóa đơn: ${log.newData.code}`);
        parts.push(`( cho đơn đặt hàng: ${log.newData.orderCode || "N/A"} )`);
        parts.push(`, khách hàng ${log.newData.customerName || "N/A"}`);
      }
    } else if (log.resource === "orders") {
      if (log.action === "delete" && log.oldData) {
        parts.push(`Hủy đơn đặt hàng: ${log.oldData.code || log.resourceId}`);
      } else if (log.action === "create" && log.newData) {
        parts.push(`Tạo đơn đặt hàng: ${log.newData.code}`);
        parts.push(`, khách hàng: ${log.newData.customerName || "N/A"}`);
      }
    } else if (log.resource === "customers") {
      if (log.action === "update" && log.newData) {
        parts.push(`Cập nhật thông tin khách hàng mã KH: ${log.newData.code}`);
        parts.push(`, tên KH: ${log.newData.name}`);
      } else if (log.action === "create" && log.newData) {
        parts.push(
          `Cập nhật thông tin xuất hóa đơn điện tử khách hàng ${log.newData.name}`
        );
        parts.push(`: Loại khách hàng: ${log.newData.customerType || "N/A"}`);
      }
    } else {
      parts.push(
        `${actionNames[log.action] || log.action} ${resourceNames[log.resource] || log.resource}`
      );
      if (log.resourceId) {
        parts.push(`: ID ${log.resourceId}`);
      }
    }

    return parts.join("");
  };

  const formatExpandedDetail = (log: any) => {
    const lines: string[] = [];

    if (log.resource === "orders") {
      if (log.action === "create" && log.newData?.order) {
        const order = log.newData.order;
        lines.push(
          `Tạo đơn đặt hàng: ${order.code}, khách hàng: ${order.customer?.name || "N/A"}`
        );
        lines.push(`- Mã: ${order.customer?.code || "N/A"}`);
        lines.push(
          `- Loại thu: phi ship, với giá trị: ${order.grandTotal || 0}`
        );
        lines.push(
          `- Thời gian: ${format(new Date(order.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}`
        );
        if (order.delivery) {
          lines.push(
            `- Giao đến: ${order.delivery.receiver}, SĐT: ${order.delivery.contactNumber}`
          );
        }
      }
    } else if (log.resource === "invoices") {
      if (log.action === "create" && log.newData) {
        const invoice = log.newData;
        lines.push(
          `Tạo hóa đơn: ${invoice.code}( cho đơn đặt hàng: ${invoice.orderCode || "N/A"} ), khách hàng ${invoice.customerName || "N/A"}`
        );
      }
    } else if (log.resource === "packing_slips") {
      if (log.action === "create" && log.newData) {
        const data = log.newData;
        lines.push(
          `Thông tin thu khác cho hóa đơn: ${data.code || "N/A"}, khách hàng ${data.customerCode || "N/A"}, với giá trị ${data.cashAmount || 0}, thời gian: ${format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}`
        );
      }
    } else if (log.resource === "customers") {
      if (log.action === "update" && log.newData) {
        lines.push(
          `Cập nhật thông tin khách hàng mã KH: ${log.newData.code}, tên KH: ${log.newData.name}`
        );
      } else if (log.action === "create" && log.newData) {
        lines.push(
          `Cập nhật thông tin xuất hóa đơn điện tử khách hàng ${log.newData.name}: Loại khách hàng: ${log.newData.customerType || "N/A"}`
        );
      }
    } else {
      lines.push(
        `${actionNames[log.action] || log.action} ${resourceNames[log.resource] || log.resource}`
      );
      if (log.resourceId) lines.push(`ID: ${log.resourceId}`);
      if (log.path) lines.push(`Đường dẫn: ${log.path}`);
    }

    return lines.join("\n");
  };

  return (
    <div className="bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="w-8"></th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Nhân viên
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Tính năng
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Thời gian
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Chi tiết
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <Fragment key={log.id}>
              <tr
                onClick={() =>
                  setExpandedId(expandedId === log.id ? null : log.id)
                }
                className="hover:bg-gray-50 cursor-pointer border-b">
                <td className="px-4 py-4">
                  {expandedId === log.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{log.userName}</td>
                <td className="px-6 py-4 text-sm">
                  {resourceNames[log.resource] || log.resource}
                </td>
                <td className="px-6 py-4 text-sm">
                  {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                    locale: vi,
                  })}
                </td>
                <td className="px-6 py-4 text-sm">{formatDetail(log)}</td>
              </tr>
              {expandedId === log.id && (
                <tr className="bg-blue-50">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="mb-2">
                        <span className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">
                          Chi tiết
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap font-mono">
                        {formatExpandedDetail(log)}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Không có bản ghi nào
        </div>
      )}

      <div className="p-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-3 py-1 border rounded">
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">trên tổng số {total}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Trước
          </button>
          <span className="text-sm">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
