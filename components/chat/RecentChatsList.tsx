"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { useRecentChats } from "@/lib/hooks/useSmaxChat";
import type { ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { LooseThread, RecentChat, ZaloContactKind } from "@/lib/types/smaxChat";
import { markSeen, newCount } from "@/lib/chat/seen";
import { ZaloAvatar } from "./ZaloAvatar";

const COLLAPSED = 8;

export interface RecentChatTarget {
  pagePid: string;
  kind: ZaloContactKind;
  // Nhóm cần mở (contact id) khi kind = group
  groupId: number | null;
}

interface Props {
  onOpen: (customer: ChatCustomerRef, target: RecentChatTarget | null) => void;
  // Hội thoại chưa gắn khách POS
  onOpenThread: (thread: LooseThread) => void;
  // Kênh đang chọn (hội thoại gần đây theo kênh)
  pagePid?: string | null;
}

function ago(iso: string | null) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} giờ`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

/** Hội thoại gần đây → trạng thái "chưa gắn khách POS" (kèm gợi ý nếu khớp mã trong tên nhóm). */
export function toLooseThread(c: RecentChat): LooseThread {
  return {
    pagePid: c.pagePid,
    tid: c.tid,
    zaloId: c.zaloId,
    isGroup: c.isGroup,
    name: c.name,
    suggestion: c.match?.type === "byCode" ? c.match.customer : null,
  };
}

/**
 * Mở hội thoại gần đây: đã gắn khách → chat theo khách; chưa gắn (kể cả chỉ khớp
 * mã khách trong tên nhóm) → mở hội thoại, thanh "Gắn khách POS" ở trên cùng.
 */
export function useOpenRecentChat(onOpen: Props["onOpen"], onOpenThread: (t: LooseThread) => void) {
  const open = (c: RecentChat) => {
    markSeen(c.tid, c.messageCount);
    if (c.match?.type === "linked") {
      onOpen(c.match.customer, {
        pagePid: c.pagePid,
        kind: c.match.kind,
        groupId: c.match.kind === "group" ? c.match.contactId : null,
      });
      return;
    }
    onOpenThread(toLooseThread(c));
  };
  return { open };
}

/** Hội thoại mới nhất trên kênh Zalo đang chọn, khớp với khách POS để mở nhanh. */
export function RecentChatsList({ onOpen, onOpenThread, pagePid }: Props) {
  const { data, isLoading, isFetching, error, refetch } = useRecentChats(true, pagePid);
  const { open } = useOpenRecentChat(onOpen, onOpenThread);
  const [showAll, setShowAll] = useState(false);
  const items = data?.items ?? [];

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-gray-500">Đang chat gần đây</h3>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Tải lại"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50">
          <RotateCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Đang tải hội thoại…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as Error).message || "Không tải được hội thoại"}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có hội thoại gần đây trên kênh này.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {(showAll ? items : items.slice(0, COLLAPSED)).map((c) => (
            <li key={c.tid}>
              <RecentChatRow c={c} onClick={() => open(c)} />
            </li>
          ))}
        </ul>
      )}
      {items.length > COLLAPSED && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-1 px-1 text-xs text-brand hover:underline">
          {showAll ? "Thu gọn" : `Xem thêm ${items.length - COLLAPSED} hội thoại`}
        </button>
      )}
    </section>
  );
}

/** 1 dòng hội thoại gần đây (dùng ở danh sách chọn khách và dropdown "…" của thanh thu gọn). */
export function RecentChatRow({ c, onClick }: { c: RecentChat; onClick: () => void }) {
  const m = c.match;
  const unseen = newCount(c.tid, c.messageCount);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-cyan-bg border border-transparent hover:border-brand-border">
      <span className="relative shrink-0">
        <ZaloAvatar avatar={c.avatar} isGroup={c.isGroup} members={c.isGroup ? c.memberPreview : [{ name: c.name, avatar: null }]} size={28} />
        {unseen > 0 && <UnseenBadge count={unseen} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}>
            {m?.type === "linked"
              ? `${m.customer.code ? `${m.customer.code} · ` : ""}${m.customer.name}`
              : c.name || c.zaloId}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-gray-400">{ago(c.lastMessageAt)}</span>
          {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" title="Chưa đọc" />}
        </span>
        <span className="block truncate text-xs text-gray-500">
          {c.isGroup && m?.type === "linked" ? `${c.name}: ` : ""}
          {c.lastMessage || "…"}
        </span>
        {m?.type !== "linked" && (
          <span className="block text-[11px] text-amber-700">
            {m?.type === "byCode"
              ? `Chưa gắn khách POS — gợi ý ${m.customer.code ?? m.customer.name}`
              : "Chưa gắn khách POS"}
          </span>
        )}
      </span>
    </button>
  );
}

/** Số tin mới (so với lần xem gần nhất trên POS). */
export function UnseenBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
