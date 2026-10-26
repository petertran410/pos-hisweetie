"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useZaloProfile } from "@/lib/hooks/useSmaxChat";
import type { ZaloContact } from "@/lib/types/smaxChat";
import { ZaloAvatar } from "./ZaloAvatar";
import { confirmAction, openExternal } from "@/lib/chat/confirm";

interface Props {
  customerId: number;
  pagePid: string;
  contact: ZaloContact;
  channelName: string;
}

/** Thanh đầu hội thoại: avatar + tên Zalo của khách/nhóm, dòng trạng thái kết bạn. */
export function ChatThreadHeader({ customerId, pagePid, contact, channelName }: Props) {
  const { data: p, isLoading } = useZaloProfile(customerId, pagePid, contact.id);
  const canSend = useCan("smax_chat", "send");
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const isGroup = contact.kind === "group";
  const f = p?.friend;

  const act = async (action: "request" | "accept" | "undo") => {
    const label = { request: "gửi lời mời kết bạn", accept: "đồng ý kết bạn", undo: "thu hồi lời mời kết bạn" }[action];
    const ok = await confirmAction(
      `Xác nhận ${label} với "${p?.name ?? contact.zaloId}" qua kênh "${channelName}"?`,
      { title: "Kết bạn Zalo", confirmText: action === "undo" ? "Thu hồi" : "Đồng ý" }
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await smaxChatApi.friendAction(customerId, { pagePid, contactId: contact.id, action });
      queryClient.setQueryData(["smaxZaloProfile", customerId, pagePid, contact.id], p && { ...p, friend: res.friend });
      if (action === "accept" && !res.friend?.isFriend) {
        toast.warning("Đã gửi lại lời mời nhưng Zalo chưa ghi nhận là bạn bè — xử lý lời mời trên Smax nếu cần");
      } else {
        toast.success(`Đã ${label}`);
      }
    } catch (e) {
      toast.error((e as Error).message || `Không ${label} được`);
    } finally {
      setBusy(false);
    }
  };

  const subtitle = isGroup
    ? `Nhóm Zalo${p?.memberCount ? ` · ${p.memberCount} thành viên` : ""}`
    : f?.isFriend
      ? "Zalo cá nhân · Bạn bè"
      : "Zalo cá nhân";

  return (
    <div className="border-b bg-white">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <ZaloAvatar
          avatar={p?.avatar ?? null}
          isGroup={isGroup}
          members={p?.memberPreview}
          memberCount={p?.memberCount}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {isLoading ? "…" : p?.name || contact.name || contact.zaloId}
          </p>
          <p className="truncate text-[11px] text-gray-500">{subtitle}</p>
        </div>
        {p?.smaxUrl && (
          <a
            href={p.smaxUrl}
            target="_blank"
            rel="noreferrer"
            title="Mở hội thoại trên Smax"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {!isGroup && f && !f.isFriend && (
        <div className="flex items-center gap-2 border-t bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          <UserPlus className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            {f.isRequesting
              ? "Khách đã gửi lời mời kết bạn — đang chờ đồng ý"
              : f.isRequested
                ? "Đã gửi lời mời kết bạn — chờ khách đồng ý"
                : "Chưa kết bạn Zalo — khách có thể chặn tin từ người lạ"}
          </span>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {canSend && f.isRequesting && (
            <>
              <button
                onClick={() => act("accept")}
                disabled={busy}
                className="rounded bg-orange-500 px-2.5 py-1 font-medium text-white hover:bg-orange-600 disabled:opacity-50">
                Đồng ý
              </button>
              <button
                onClick={async () => {
                  if (!p?.smaxUrl) return;
                  const ok = await confirmAction(
                    "Smax chưa cho phép từ chối lời mời kết bạn qua API. Mở hội thoại trên Smax để từ chối?",
                    { title: "Từ chối kết bạn", confirmText: "Mở Smax" }
                  );
                  if (ok) openExternal(p.smaxUrl);
                }}
                className="rounded border border-orange-300 bg-white px-2.5 py-1 text-orange-600 hover:bg-orange-50">
                Từ chối
              </button>
            </>
          )}
          {canSend && !f.isRequesting && f.isRequested && (
            <button
              onClick={() => act("undo")}
              disabled={busy}
              className="rounded border border-amber-300 bg-white px-2.5 py-1 hover:bg-amber-100 disabled:opacity-50">
              Thu hồi
            </button>
          )}
          {canSend && !f.isRequesting && !f.isRequested && (
            <button
              onClick={() => act("request")}
              disabled={busy}
              className="rounded bg-brand px-2.5 py-1 font-medium text-white disabled:opacity-50">
              Gửi lời mời kết bạn
            </button>
          )}
        </div>
      )}
    </div>
  );
}
