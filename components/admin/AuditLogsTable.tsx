"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface AuditLogsTableProps {
  logs: any[];
  isLoading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function AuditLogsTable({
  logs,
  isLoading,
  total,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: AuditLogsTableProps) {
  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      view: "bg-gray-100 text-gray-800",
    };

    return colors[action] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Thời gian
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Người dùng
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Hành động
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">
              Tài nguyên
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold">IP</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm">
                {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                  locale: vi,
                })}
              </td>
              <td className="px-6 py-4">
                <div className="font-medium">{log.userName}</div>
                <div className="text-sm text-gray-600">{log.user?.email}</div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getActionBadge(log.action)}`}>
                  {log.action}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="font-medium">{log.resource}</div>
                {log.resourceId && (
                  <div className="text-xs text-gray-600">
                    ID: {log.resourceId}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {log.ipAddress || "-"}
              </td>
            </tr>
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
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Trước
          </button>
          <span className="text-sm">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
