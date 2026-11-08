"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/lib/hooks/useCan";
import type { ThreadSource } from "@/lib/chat/threadSource";
import { platformLabel } from "@/lib/chat/platforms";
import { ZaloAvatar } from "./ZaloAvatar";
import { ThreadKindLogo } from "./ThreadKindIcon";
import { MetaAiSwitch } from "./MetaAiSwitch";
import { RenameThreadModal } from "./RenameThreadModal";
import { confirmAction, openExternal } from "@/lib/chat/confirm";
import { useChatSidebarStore } from "@/lib/store/chatSidebar";

interface Props {
  source: ThreadSource;
  channelName: string;
  // Hiện cùng hàng bên phải (vd Trực tiếp/Nhóm) và dòng phụ bên dưới (chọn nhóm)
  actions?: React.ReactNode;
  extra?: React.ReactNode;
  // Messenger đang do Meta AI trả lời mà nhân viên đã bấm tắt (tin gửi tiếp kèm HUMAN_AGENT)
  takeOver?: boolean;
  onTakeOverChange?: (v: boolean) => void;
}

/** Thanh đầu hội thoại: avatar + tên Zalo của khách/nhóm, dòng trạng thái kết bạn. */
export function ChatThreadHeader({ source, channelName, actions, extra, takeOver = false, onTakeOverChange }: Props) {
  const profileKey = ["smaxZaloProfile", source.key];
  const { data: p, isLoading } = useQuery({
    queryKey: profileKey,
    queryFn: () => source.fetchProfile(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const canSend = useCan("smax_chat", "send");
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const isGroup = source.kind === "group";
  const f = p?.friend;

  // Messenger: Meta Business AI đang trả lời (tắt cục bộ = chờ nhân viên gửi tin kèm HUMAN_AGENT)
  const metaAiOn = p?.controlledBy === "META_AI" && !takeOver;
  const toggleMetaAi = async () => {
    if (metaAiOn) {
      onTakeOverChange?.(true);
      toast.info("Đã tắt Meta AI cho hội thoại này — tin bạn gửi tiếp theo sẽ lấy lại quyền trả lời");
      return;
    }
    if (p?.controlledBy === "META_AI") return onTakeOverChange?.(false);
    // Bật ngay, không hỏi xác nhận (người dùng chủ động bấm công tắc)
    setBusy(true);
    try {
      await source.passControlAI(true);
      queryClient.setQueryData(profileKey, p && { ...p, controlledBy: "META_AI" });
      queryClient.invalidateQueries({ queryKey: ["smaxRecentChats"] });
      onTakeOverChange?.(false);
      toast.success("Đã bật Meta Business AI cho hội thoại");
    } catch (e) {
      toast.error((e as Error).message || "Không bật được Meta Business AI");
    } finally {
      setBusy(false);
    }
  };

  const rename = async (name: string) => {
    const res = await source.rename(name);
    const shown = res.alias || res.name;
    queryClient.setQueryData(profileKey, p && { ...p, smaxName: res.name, alias: res.alias, name: shown });
    // Hội thoại chưa gắn khách đang mở: thanh đầu sidebar đọc tên đã lưu khi mở
    const st = useChatSidebarStore.getState();
    if (st.loose?.tid === source.tid) st.openLoose({ ...st.loose, name: shown }, st.ownerId);
    queryClient.invalidateQueries({ queryKey: ["smaxRecentChats"] });
    queryClient.invalidateQueries({ queryKey: ["smaxSharedGroups"] });
    toast.success(`Đã đổi tên thành "${shown}"`);
  };

  const act = async (action: "request" | "accept" | "undo") => {
    const label = { request: "gửi lời mời kết bạn", accept: "đồng ý kết bạn", undo: "thu hồi lời mời kết bạn" }[action];
    const ok = await confirmAction(
      `Xác nhận ${label} với "${p?.name ?? source.zaloId}" qua kênh "${channelName}"?`,
      { title: "Kết bạn Zalo", confirmText: action === "undo" ? "Thu hồi" : "Đồng ý" }
    );
    if (!ok || !source.friendAction) return;
    setBusy(true);
    try {
      const res = await source.friendAction(action);
      queryClient.setQueryData(profileKey, p && { ...p, friend: res.friend });
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

  const threadName = p?.name || source.name || source.zaloId;
  // Đã gắn khách POS (không phải nhóm): tên khách lên tiêu đề, tên trên kênh xuống dòng phụ
  const posName = !isGroup ? source.customerName || null : null;
  const subtitle =
    source.platform !== "zaloweb"
      ? `${platformLabel(source.platform)}${p?.isComment ? " · Bình luận bài viết" : ""}`
      : isGroup
        ? `Nhóm Zalo${p?.memberCount ? ` · ${p.memberCount} thành viên` : ""}`
        : f?.isFriend
          ? "Zalo cá nhân · Bạn bè"
          : "Zalo cá nhân";
  const subtitleText = posName && !isLoading && threadName !== posName ? `${subtitle} · ${threadName}` : subtitle;

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
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-sm font-semibold leading-tight">
              {posName || (isLoading ? "…" : threadName)}
            </p>
            {p?.canRename && canSend && (
              <button
                onClick={() => setRenaming(true)}
                title={isGroup ? "Đổi tên nhóm (trên Smax)" : "Đổi tên hội thoại (trên Smax)"}
                aria-label="Đổi tên hội thoại"
                className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brand">
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="truncate text-xs text-gray-500" title={subtitleText}>{subtitleText}</p>
        </div>
        {p?.canPassControlAI && canSend && (
          <MetaAiSwitch on={metaAiOn} busy={busy} onClick={toggleMetaAi} />
        )}
        {p?.commentUrl && (
          <a
            href={p.commentUrl}
            target="_blank"
            rel="noreferrer"
            title="Mở bình luận trên bài viết Facebook"
            className="rounded p-1 hover:bg-gray-100">
            <ThreadKindLogo isComment className="h-4 w-4" />
          </a>
        )}
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
        {actions}
      </div>
      {extra && <div className="px-3 pb-1.5">{extra}</div>}
      {renaming && p && (
        <RenameThreadModal profile={p} isGroup={isGroup} onSave={rename} onClose={() => setRenaming(false)} />
      )}


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
          {canSend && source.friendAction && f.isRequesting && (
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
          {canSend && source.friendAction && !f.isRequesting && f.isRequested && (
            <button
              onClick={() => act("undo")}
              disabled={busy}
              className="rounded border border-amber-300 bg-white px-2.5 py-1 hover:bg-amber-100 disabled:opacity-50">
              Thu hồi
            </button>
          )}
          {canSend && source.friendAction && !f.isRequesting && !f.isRequested && (
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
