"use client";

import { useState } from "react";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { useQuery } from "@tanstack/react-query";
import { auditLogsApi } from "@/lib/api/audit-logs";
import { Filter } from "lucide-react";

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

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", filters, page, limit],
    queryFn: () => auditLogsApi.getAll({ ...filters, page, limit }),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-white">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Lịch sử thao tác</h1>
          <p className="text-gray-600 text-sm mt-1">
            Theo dõi tất cả thao tác của nhân viên trên KiotViet.
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
          <Filter className="w-4 h-4" />
          Lọc
        </button>
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
