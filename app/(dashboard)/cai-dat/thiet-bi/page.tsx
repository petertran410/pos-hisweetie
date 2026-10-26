"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { DeviceSessionList } from "@/components/sessions/DeviceSessionList";
import type { DeviceSession } from "@/lib/api/sessions";
import { logout } from "@/lib/auth/session";
import {
  useMySessions,
  useRevokeMySession,
  useRevokeOtherSessions,
} from "@/lib/hooks/useSessions";

export default function DeviceSessionsPage() {
  const { data: sessions, isLoading } = useMySessions();
  const revokeOne = useRevokeMySession();
  const revokeOthers = useRevokeOtherSessions();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const otherCount = (sessions ?? []).filter((s) => !s.current).length;

  const handleRevoke = async (session: DeviceSession) => {
    const result = await Swal.fire({
      title: session.current
        ? "Đăng xuất thiết bị này?"
        : `Đăng xuất ${session.browser} trên ${session.os}?`,
      text: session.current
        ? "Bạn sẽ phải đăng nhập lại."
        : "Thiết bị đó sẽ bị đăng xuất ngay lập tức.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;

    if (session.current) {
      await logout();
      return;
    }
    setPendingId(session.id);
    try {
      await revokeOne.mutateAsync(session.id);
      toast.success("Đã đăng xuất thiết bị");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể đăng xuất");
    } finally {
      setPendingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    const result = await Swal.fire({
      title: "Đăng xuất tất cả thiết bị khác?",
      text: `${otherCount} thiết bị khác sẽ bị đăng xuất ngay. Thiết bị này vẫn giữ đăng nhập.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đăng xuất tất cả",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await revokeOthers.mutateAsync();
      toast.success(`Đã đăng xuất ${res?.count ?? 0} thiết bị`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể đăng xuất");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Thiết bị đăng nhập</h1>
          <p className="text-sm text-gray-500 mt-1">
            Các trình duyệt/thiết bị đang đăng nhập tài khoản của bạn. Nếu thấy
            thiết bị lạ, hãy đăng xuất nó và đổi mật khẩu.
          </p>
        </div>
        {otherCount > 0 && (
          <button
            type="button"
            onClick={handleRevokeOthers}
            disabled={revokeOthers.isPending}
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 disabled:opacity-50">
            Đăng xuất tất cả thiết bị khác
          </button>
        )}
      </div>

      <DeviceSessionList
        sessions={sessions}
        isLoading={isLoading}
        pendingId={pendingId}
        onRevoke={handleRevoke}
      />

      <p className="mt-3 text-xs text-gray-400">
        Địa chỉ IP và tên thiết bị chỉ mang tính tham khảo.
      </p>
    </div>
  );
}
