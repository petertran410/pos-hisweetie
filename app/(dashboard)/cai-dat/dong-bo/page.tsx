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
  Database,
} from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { useSyncMisaDictionary } from "@/lib/hooks/useMisa";
import Swal from "sweetalert2";

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

  const syncMisaDictionary = useSyncMisaDictionary();

  const handleSyncMisa = async () => {
    const result = await Swal.fire({
      title: "Đồng bộ danh mục Misa?",
      text: "Kéo toàn bộ danh mục (hàng hóa, kho, đối tượng kế toán, đơn vị) từ Misa về database. Quá trình có thể mất vài phút.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Đồng bộ ngay",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) {
      syncMisaDictionary.mutate();
    }
  };

  return (
    <PagePermissionGuard resource="settings" action="update">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b bg-white">
          <h1 className="text-2xl font-bold">Đồng bộ dữ liệu</h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý đồng bộ dữ liệu từ KiotViet và Misa
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

          {/* Misa Dictionary Sync Section */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Đồng bộ danh mục Misa</h2>
                  <p className="text-sm text-gray-500">
                    Kéo danh mục từ Misa về database: hàng hóa, kho, đối tượng kế
                    toán, đơn vị tổ chức
                  </p>
                </div>
              </div>

              <button
                onClick={handleSyncMisa}
                disabled={syncMisaDictionary.isPending}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {syncMisaDictionary.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang đồng bộ...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Đồng bộ ngay
                  </>
                )}
              </button>
            </div>

            {syncMisaDictionary.isSuccess &&
              syncMisaDictionary.data?.success &&
              syncMisaDictionary.data.data && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Hàng hóa",
                      value: syncMisaDictionary.data.data.inventoryItems,
                    },
                    {
                      label: "Kho",
                      value: syncMisaDictionary.data.data.stocks,
                    },
                    {
                      label: "Đối tượng kế toán",
                      value: syncMisaDictionary.data.data.accountObjects,
                    },
                    {
                      label: "Đơn vị tổ chức",
                      value: syncMisaDictionary.data.data.organizationUnits,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-3 bg-gray-50 border rounded-lg text-center">
                      <p className="text-xs text-gray-500">{stat.label}</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            {syncMisaDictionary.isError && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Đồng bộ danh mục Misa thất bại. Vui lòng thử lại.
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
