"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/config/api";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

export default function SyncSettingsPage() {
  const queryClient = useQueryClient();
  const [togglingSync, setTogglingSync] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiClient.get("/settings"),
  });

  const { data: syncStatus, isLoading: isLoadingSyncStatus } = useQuery({
    queryKey: ["sync-kiot-status"],
    queryFn: () => apiClient.get("/sync-kiot/status"),
    refetchInterval: 10000,
  });

  const updateSettings = useMutation({
    mutationFn: (data: { syncKiotEnabled: boolean }) =>
      apiClient.put("/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const handleToggleSync = async () => {
    if (!settings) return;
    setTogglingSync(true);
    try {
      await updateSettings.mutateAsync({
        syncKiotEnabled: !settings.syncKiotEnabled,
      });
    } finally {
      setTogglingSync(false);
    }
  };

  const syncEnabled = settings?.syncKiotEnabled ?? true;

  return (
    <PagePermissionGuard resource="settings" action="update">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b bg-white">
          <h1 className="text-2xl font-bold">Đồng bộ dữ liệu</h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý đồng bộ dữ liệu từ KiotViet
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Toggle Section */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    syncEnabled ? "bg-green-100" : "bg-red-100"
                  }`}>
                  {syncEnabled ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Đồng bộ KiotViet</h2>
                  <p className="text-sm text-gray-500">
                    {syncEnabled
                      ? "Đang bật — Dữ liệu được đồng bộ tự động hàng ngày lúc 23:30 và qua webhook"
                      : "Đã tắt — Không nhận webhook và cron đồng bộ bị bỏ qua"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSync}
                disabled={isLoading || togglingSync}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  syncEnabled
                    ? "bg-green-500 focus:ring-green-500"
                    : "bg-gray-300 focus:ring-gray-400"
                } ${isLoading || togglingSync ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                {togglingSync ? (
                  <Loader2 className="absolute left-1/2 -translate-x-1/2 w-4 h-4 text-white animate-spin" />
                ) : (
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                      syncEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                )}
              </button>
            </div>

            {!syncEnabled && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Khi tắt đồng bộ, dữ liệu trên hệ thống sẽ không được cập nhật
                  từ KiotViet. Các webhook và cron job đều bị bỏ qua cho đến khi
                  bật lại.
                </p>
              </div>
            )}
          </div>

          {/* Sync Status Table */}
          {syncStatus && Array.isArray(syncStatus) && syncStatus.length > 0 && (
            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Trạng thái đồng bộ theo loại</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-600">
                      Loại dữ liệu
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-600">
                      Trạng thái
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-600">
                      Lần cuối đồng bộ
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-600">
                      Tổng đã đồng bộ
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-600">Lỗi</td>
                  </tr>
                </thead>
                <tbody>
                  {syncStatus.map((item: any) => (
                    <tr
                      key={item.entityType}
                      className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">
                        {item.entityType}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : item.status === "running"
                                ? "bg-blue-100 text-blue-700"
                                : item.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                          }`}>
                          {item.status === "running" && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {item.lastSyncAt
                          ? new Date(item.lastSyncAt).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-500">
                        {item.totalSynced ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-red-500 text-xs max-w-[200px] truncate">
                        {item.error || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PagePermissionGuard>
  );
}
