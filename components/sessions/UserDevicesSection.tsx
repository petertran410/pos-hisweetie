"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import type { DeviceSession } from "@/lib/api/sessions";
import {
  useRevokeAllUserSessions,
  useRevokeUserSession,
  useUserSessions,
} from "@/lib/hooks/useSessions";
import { DeviceSessionList } from "./DeviceSessionList";

/** Admin xem & đăng xuất thiết bị của 1 nhân viên (cần quyền users:update). */
export function UserDevicesSection({
  userId,
  userName,
}: {
  userId: number;
  userName?: string;
}) {
  const { data: sessions, isLoading } = useUserSessions(userId);
  const revokeOne = useRevokeUserSession(userId);
  const revokeAll = useRevokeAllUserSessions(userId);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const confirm = (title: string, text: string) =>
    Swal.fire({
      title,
      text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đăng xuất",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    }).then((r) => r.isConfirmed);

  const handleRevoke = async (session: DeviceSession) => {
    const ok = await confirm(
      `Đăng xuất ${session.browser} trên ${session.os}?`,
      `${userName ?? "Người dùng"} sẽ bị đăng xuất khỏi thiết bị này ngay.`,
    );
    if (!ok) return;
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

  const handleRevokeAll = async () => {
    const ok = await confirm(
      "Đăng xuất tất cả thiết bị?",
      `${userName ?? "Người dùng"} sẽ phải đăng nhập lại trên mọi thiết bị.`,
    );
    if (!ok) return;
    try {
      const res = await revokeAll.mutateAsync();
      toast.success(`Đã đăng xuất ${res?.count ?? 0} thiết bị`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không thể đăng xuất");
    }
  };

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium">
          Thiết bị đăng nhập
          {sessions && sessions.length > 0 && (
            <span className="ml-1 text-gray-500">({sessions.length})</span>
          )}
        </label>
        {sessions && sessions.length > 0 && (
          <button
            type="button"
            onClick={handleRevokeAll}
            disabled={revokeAll.isPending}
            className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
            Đăng xuất tất cả
          </button>
        )}
      </div>
      <DeviceSessionList
        sessions={sessions}
        isLoading={isLoading}
        pendingId={pendingId}
        onRevoke={handleRevoke}
        emptyText="Người dùng này hiện không đăng nhập trên thiết bị nào."
      />
    </div>
  );
}
