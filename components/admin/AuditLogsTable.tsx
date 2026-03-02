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
    // Sử dụng message đã render sẵn từ backend
    if (log.message) {
      return log.message;
    }

    // Fallback nếu không có message
    return `${actionNames[log.actionType] || log.actionType} ${resourceNames[log.entityType] || log.entityType}`;
  };

  const formatExpandedDetail = (log: any) => {
    const sections: string[] = [];

    sections.push(`Người dùng: ${log.userName}`);
    sections.push(`Hành động: ${log.actionCode}`);
    sections.push(
      `Tài nguyên: ${resourceNames[log.entityType] || log.entityType}`
    );

    if (log.entityCode) {
      sections.push(`Mã: ${log.entityCode}`);
    }

    if (log.branchName) {
      sections.push(`Chi nhánh: ${log.branchName}`);
    }

    if (log.ipAddress) {
      sections.push(`IP: ${log.ipAddress}`);
    }

    if (log.metadata?.duration) {
      sections.push(`Thời gian xử lý: ${log.metadata.duration}ms`);
    }

    return sections.join("\n");
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
                <td className="px-6 py-4 text-sm">{log.message}</td>
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">Mã:</span>{" "}
                          {log.entityCode || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold">IP:</span>{" "}
                          {log.ipAddress || "N/A"}
                        </div>
                        <div>
                          <span className="font-semibold">Chi nhánh:</span>{" "}
                          {log.branchName || "N/A"}
                        </div>
                      </div>

                      {log.newValues && (
                        <div>
                          <div className="font-semibold mb-2">Dữ liệu mới:</div>
                          <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                            {JSON.stringify(log.newValues, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.oldValues && (
                        <div>
                          <div className="font-semibold mb-2">Dữ liệu cũ:</div>
                          <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                            {JSON.stringify(log.oldValues, null, 2)}
                          </pre>
                        </div>
                      )}
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
