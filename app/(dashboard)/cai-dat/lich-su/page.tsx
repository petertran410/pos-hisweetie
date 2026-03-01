"use client";

import { useState } from "react";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "@/lib/api/audit-logs";
import { usePermission } from "@/lib/hooks/usePermissions";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState({
    userId: undefined as number | undefined,
    resource: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  const canView = usePermission("audit_logs", "view");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", filters, page, limit],
    queryFn: () => auditLogsApi.getAll({ ...filters, page, limit }),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-white">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Lịch sử thao tác</h1>
          <p className="text-gray-600 mt-1">
            Tổng số: {data?.total || 0} bản ghi
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tài nguyên</label>
            <input
              type="text"
              value={filters.resource}
              onChange={(e) =>
                setFilters({ ...filters, resource: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="orders, products..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hành động</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="create, update..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Từ ngày</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Đến ngày</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <AuditLogsTable
          logs={data?.data || []}
          isLoading={isLoading}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>
    </div>
  );
}
