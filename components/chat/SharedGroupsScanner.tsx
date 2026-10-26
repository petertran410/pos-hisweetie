"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useSaveZaloContact, useSharedGroups } from "@/lib/hooks/useSmaxChat";
import { ZaloAvatar } from "./ZaloAvatar";

interface Props {
  customerId: number;
  // Kênh Zalo của tôi dùng để quét
  pagePid: string | undefined;
  hasUserContact: boolean;
}

/** Quét các nhóm Zalo có cả kênh của tôi và khách, thêm nhanh vào danh sách nhóm. */
export function SharedGroupsScanner({ customerId, pagePid, hasUserContact }: Props) {
  const canManage = useCan("smax_chat", "manage_contacts");
  const queryClient = useQueryClient();
  const [started, setStarted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { data, isFetching, error } = useSharedGroups(customerId, pagePid, started);
  const save = useSaveZaloContact(customerId);

  if (!pagePid) return null;
  if (!hasUserContact) {
    return (
      <p className="text-xs text-gray-500">
        Thêm ID Zalo cá nhân của khách để quét các nhóm chung.
      </p>
    );
  }

  const rescan = async () => {
    setRefreshing(true);
    try {
      const fresh = await smaxChatApi.scanSharedGroups(customerId, pagePid, true);
      queryClient.setQueryData(["smaxSharedGroups", customerId, pagePid], fresh);
    } catch (e) {
      toast.error((e as Error).message || "Quét nhóm thất bại");
    } finally {
      setRefreshing(false);
    }
  };

  if (!started) {
    return (
      <button
        onClick={() => setStarted(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-brand text-brand hover:bg-cyan-bg text-sm">
        <Search className="w-4 h-4" /> Quét nhóm chung với khách
      </button>
    );
  }

  const loading = (isFetching && !data) || refreshing;

  return (
    <div className="rounded-md border p-3 text-sm text-left">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-medium">Nhóm chung với khách</span>
        {data && (
          <button
            onClick={rescan}
            disabled={loading}
            title="Quét lại"
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50">
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-gray-500">Đang quét nhóm Zalo của kênh… (lần đầu có thể mất ~20 giây)</p>
      ) : error ? (
        <p className="text-red-600">{(error as Error).message || "Quét nhóm thất bại"}</p>
      ) : data && data.groups.length === 0 ? (
        <p className="text-gray-500">Không tìm thấy nhóm nào có cả kênh của bạn và khách.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {data?.groups.map((g) => (
            <li key={g.zaloId} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
              <ZaloAvatar
                avatar={g.avatar}
                isGroup
                members={g.memberPreview}
                memberCount={g.memberCount}
                size={28}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{g.name || `Nhóm …${g.zaloId.slice(-6)}`}</span>
                <span className="block text-xs text-gray-500">
                  {g.memberCount} thành viên
                  {g.lastMessageAt &&
                    ` · tin gần nhất ${new Date(g.lastMessageAt).toLocaleDateString("vi-VN")}`}
                </span>
              </span>
              {g.saved ? (
                <span className="text-xs text-green-700 shrink-0">Đã thêm</span>
              ) : (
                canManage && (
                  <button
                    onClick={() =>
                      save.mutate({ kind: "group", zaloId: g.zaloId, name: g.name || undefined })
                    }
                    disabled={save.isPending}
                    className="shrink-0 px-2 py-1 rounded bg-brand text-white text-xs disabled:opacity-50">
                    Thêm
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {data?.truncated && (
        <p className="mt-2 text-xs text-amber-700">
          Kênh có nhiều nhóm — chỉ quét được 500 nhóm có tin nhắn gần nhất.
        </p>
      )}
    </div>
  );
}
