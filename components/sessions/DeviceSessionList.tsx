"use client";

import { Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import type { DeviceSession } from "@/lib/api/sessions";
import { formatDate } from "@/lib/utils";

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
} as const;

/** "vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước". */
export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

interface DeviceSessionListProps {
  sessions: DeviceSession[] | undefined;
  isLoading?: boolean;
  /** id phiên đang bị đăng xuất (hiện spinner trên nút). */
  pendingId?: number | null;
  onRevoke: (session: DeviceSession) => void;
  emptyText?: string;
}

export function DeviceSessionList({
  sessions,
  isLoading,
  pendingId,
  onRevoke,
  emptyText = "Không có thiết bị nào đang đăng nhập.",
}: DeviceSessionListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải thiết bị...
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return <p className="py-6 text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <ul className="divide-y border rounded-lg bg-white">
      {sessions.map((session) => {
        const Icon = DEVICE_ICONS[session.deviceType] ?? Monitor;
        return (
          <li
            key={session.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 rounded-full bg-gray-100 p-2 shrink-0">
                <Icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {session.browser} trên {session.os}
                  </span>
                  {session.current && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Thiết bị này
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  Hoạt động {timeAgo(session.lastUsedAt)}
                  {session.ip ? ` · IP ${session.ip}` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  Đăng nhập lúc {formatDate(session.createdAt)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRevoke(session)}
              disabled={pendingId === session.id}
              className="self-start sm:self-center px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5">
              {pendingId === session.id && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              Đăng xuất
            </button>
          </li>
        );
      })}
    </ul>
  );
}
