"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCw, Search, X } from "lucide-react";
import { useRecentChats } from "@/lib/hooks/useSmaxChat";
import { useChatSidebarStore, type ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { LooseThread, RecentChat, ZaloContactKind } from "@/lib/types/smaxChat";
import { markSeen, newCount } from "@/lib/chat/seen";
import { ZaloAvatar } from "./ZaloAvatar";

const COLLAPSED = 8;
// Số hội thoại lấy từ Smax khi tìm theo tên
const SEARCH_LIMIT = 50;

// So khớp tên không phân biệt hoa thường / dấu tiếng Việt
const foldVi = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

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
  // Lọc "Chưa đọc": Smax đánh dấu chưa đọc (chấm xanh) hoặc có tin mới chưa xem trên POS (số đỏ)
  const unreadOnly = useChatSidebarStore((s) => s.recentUnreadOnly);
  const setUnreadOnly = useChatSidebarStore((s) => s.setRecentUnreadOnly);
  const isUnread = (c: RecentChat) => c.unread || newCount(c.tid, c.messageCount) > 0;
  const unreadCount = items.filter(isUnread).length;
  const shown = unreadOnly ? items.filter(isUnread) : items;

  // Tìm theo tên Zalo / tên nhóm (không tìm nội dung): lọc ngay trong danh sách đã tải,
  // rồi bổ sung kết quả Smax tìm trên toàn bộ hội thoại (~2-3s)
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);
  const term = q.trim();
  const searching = term.length >= 2;
  const remote = useRecentChats(searching && debounced.length >= 2, pagePid, SEARCH_LIMIT, debounced);
  const remoteReady = searching && debounced === term && !!remote.data && !remote.isPlaceholderData;
  const found = (() => {
    if (!searching) return [];
    const key = foldVi(term);
    const byTid = new Map(items.filter((c) => foldVi(c.name).includes(key)).map((c) => [c.tid, c]));
    if (remoteReady) for (const c of remote.data!.items) byTid.set(c.tid, c);
    return [...byTid.values()].sort(
      (a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
    );
  })();
  const results = unreadOnly ? found.filter(isUnread) : found;
  const remoteLoading = searching && !remoteReady && !remote.error;
  // Smax tìm phân biệt dấu (vd "cong dong" bỏ sót "CỘNG ĐỒNG") → nhắc gõ có dấu
  const noAccent = /[a-z]/i.test(term) && term === term.normalize("NFD").replace(/[\u0300-\u036f]/g, "") && !/đ/i.test(term);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-gray-500">Đang chat gần đây</h3>
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          aria-pressed={unreadOnly}
          title="Chỉ hiện hội thoại chưa đọc"
          className={`ml-auto mr-1 rounded-full border px-2 py-0.5 text-xs ${
            unreadOnly ? "border-brand bg-brand text-white" : "text-gray-600 hover:border-brand hover:text-brand"
          }`}>
          Chưa đọc{unreadCount > 0 && ` (${unreadCount})`}
        </button>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Tải lại"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50">
          <RotateCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQ("")}
          placeholder="Tìm hội thoại, nhóm Zalo theo tên"
          className="w-full rounded-md border py-1.5 pl-7 pr-7 text-sm outline-none focus:border-brand"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Xoá tìm kiếm"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {searching ? (
        <>
          {results.length > 0 && (
            <ul className="flex flex-col gap-1">
              {results.map((c) => (
                <li key={c.tid}>
                  <RecentChatRow c={c} onClick={() => open(c)} />
                </li>
              ))}
            </ul>
          )}
          {remoteLoading ? (
            <p className="flex items-center gap-1.5 px-1 py-1 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tìm trên toàn bộ hội thoại…
            </p>
          ) : remote.error ? (
            <p className="px-1 py-1 text-xs text-red-600">
              {(remote.error as Error).message || "Không tìm được trên Smax"}
            </p>
          ) : (
            results.length === 0 && (
              <p className="text-sm text-gray-500">
                Không có hội thoại / nhóm {unreadOnly ? "chưa đọc " : ""}nào có tên khớp “{term}”.
              </p>
            )
          )}
          {remoteReady && noAccent && (
            <p className="px-1 pt-1 text-[11px] text-gray-400">Gõ có dấu (vd “Thúy”, “cộng đồng”) để tìm đầy đủ hơn.</p>
          )}
        </>
      ) : isLoading ? (
        <p className="text-sm text-gray-500">Đang tải hội thoại…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as Error).message || "Không tải được hội thoại"}</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-500">
          {unreadOnly ? "Không có hội thoại chưa đọc." : "Chưa có hội thoại gần đây trên kênh này."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {(showAll ? shown : shown.slice(0, COLLAPSED)).map((c) => (
            <li key={c.tid}>
              <RecentChatRow c={c} onClick={() => open(c)} />
            </li>
          ))}
        </ul>
      )}
      {!searching && shown.length > COLLAPSED && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-1 px-1 text-xs text-brand hover:underline">
          {showAll ? "Thu gọn" : `Xem thêm ${shown.length - COLLAPSED} hội thoại`}
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
