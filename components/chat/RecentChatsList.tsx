"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCw, Search, X } from "lucide-react";
import { useRecentChats } from "@/lib/hooks/useSmaxChat";
import { useChatSidebarStore, type ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { LooseThread, RecentChat, ZaloContactKind } from "@/lib/types/smaxChat";
import { markSeen, newCount } from "@/lib/chat/seen";
import { ZaloAvatar } from "./ZaloAvatar";
import { ThreadKindIcon, ThreadKindLogo } from "./ThreadKindIcon";
import { MetaAiSwitch } from "./MetaAiSwitch";
import { LEAD_FIRST_PLATFORMS } from "@/lib/leads/constants";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useMetaAiTakeOver } from "@/lib/store/metaAiTakeOver";

const COLLAPSED = 8;
// Mỗi lần "Tải thêm" xin thêm từng này hội thoại (backend tối đa 200)
const PAGE = 30;
const MAX_RECENT = 200;
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
    platform: c.platform,
    phones: c.phones,
    lead: c.lead,
    suggestion: c.match?.type === "byCode" || c.match?.type === "byPhone" ? c.match.customer : null,
  };
}

/** Tên khách đã gắn hội thoại; nhóm gắn nhiều khách ghi số khách trước (vd "5 khách · KH1 · Little Cam (NTMK)"). */
export function linkedChatLabel(m: Extract<RecentChat["match"], { type: "linked" }>) {
  const count = m.customers?.length ?? 1;
  return `${count > 1 ? `${count} khách · ` : ""}${m.customer.code ? `${m.customer.code} · ` : ""}${m.customer.name}`;
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
  // Số hội thoại xin Smax theo kênh (đổi kênh → về mặc định)
  const [limitBy, setLimitBy] = useState<{ pagePid?: string | null; n: number }>({ n: PAGE });
  const limit = limitBy.pagePid === pagePid ? limitBy.n : PAGE;
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useRecentChats(true, pagePid, limit);
  // Smax trả đủ số đã xin → có thể còn nữa (đang tải trang lớn hơn thì giữ nút ở trạng thái "Đang tải…")
  const canLoadMore = isPlaceholderData || ((data?.items.length ?? 0) >= limit && limit < MAX_RECENT);
  const loadMore = () => {
    setShowAll(true);
    setLimitBy({ pagePid, n: Math.min(MAX_RECENT, limit + PAGE) });
  };
  const { open } = useOpenRecentChat(onOpen, onOpenThread);
  const [showAll, setShowAll] = useState(false);
  // Fanpage Facebook: lọc tin nhắn Messenger / bình luận bài viết (đổi kênh → về "Tất cả")
  const [kindFilter, setKindFilter] = useState<{ pagePid?: string | null; kind: "all" | "message" | "comment" }>({
    kind: "all",
  });
  const kind = kindFilter.pagePid === pagePid ? kindFilter.kind : "all";
  const setKind = (k: typeof kind) => setKindFilter({ pagePid, kind: k });
  const isFanpage = (data?.items ?? []).some((c) => c.platform === "facebook");
  const kindOk = (c: RecentChat) => !isFanpage || kind === "all" || (kind === "comment") === !!c.isComment;
  const items = (data?.items ?? []).filter(kindOk);
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
    if (remoteReady) for (const c of remote.data!.items.filter(kindOk)) byTid.set(c.tid, c);
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
      {/* Lọc Messenger / Bình luận (fanpage) cùng hàng ô tìm */}
      <div className="mb-2 flex items-center gap-2">
      {isFanpage && (
        <div className="inline-flex shrink-0 self-stretch overflow-hidden rounded-md border text-xs">
          {(
            [
              ["all", "Tất cả"],
              ["message", "Messenger"],
              ["comment", "Bình luận"],
            ] as const
          ).map(([k, label], i) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              title={k === "comment" ? "Bình luận bài viết trên fanpage" : k === "message" ? "Tin nhắn Messenger" : ""}
              className={`inline-flex items-center gap-1 px-2.5 py-1 ${i ? "border-l" : ""} ${
                kind === k ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-50"
              }`}>
              {k !== "all" && (
                <span className={`flex rounded-full ${kind === k ? "bg-white" : ""}`}>
                  <ThreadKindLogo isComment={k === "comment"} className="h-3.5 w-3.5" />
                </span>
              )}
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="relative min-w-0 flex-1">
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
          {unreadOnly
            ? "Không có hội thoại chưa đọc."
            : kind === "comment"
              ? "Chưa có bình luận gần đây trên fanpage này."
              : kind === "message"
                ? "Chưa có tin nhắn Messenger gần đây."
                : "Chưa có hội thoại gần đây trên kênh này."}
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
      {!searching && !isLoading && !error && (
        <div className="mt-1 flex items-center gap-3 px-1 text-xs">
          {shown.length > COLLAPSED && (
            // "Thu gọn" căn phải, "Tải thêm hội thoại" bên trái
            <button
              onClick={() => setShowAll((v) => !v)}
              className={`text-brand hover:underline ${showAll ? "order-last ml-auto" : ""}`}>
              {showAll ? "Thu gọn" : `Xem thêm ${shown.length - COLLAPSED} hội thoại`}
            </button>
          )}
          {/* Đã hiện hết hội thoại đã tải mà Smax còn → tải tiếp */}
          {(showAll || shown.length <= COLLAPSED) && canLoadMore && (
            <button
              onClick={loadMore}
              disabled={isPlaceholderData}
              className="inline-flex items-center gap-1 text-brand hover:underline disabled:opacity-50">
              {isPlaceholderData && <Loader2 className="h-3 w-3 animate-spin" />}
              {isPlaceholderData ? "Đang tải…" : "Tải thêm hội thoại"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/** 1 dòng hội thoại gần đây (dùng ở danh sách chọn khách và dropdown "…" của thanh thu gọn). */
export function RecentChatRow({ c, onClick }: { c: RecentChat; onClick: () => void }) {
  const m = c.match;
  const unseen = newCount(c.tid, c.messageCount);
  const canSend = useCan("smax_chat", "send");
  const showMetaAi = !!c.canPassControlAI && canSend;
  return (
    <div className="relative">
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-cyan-bg border border-transparent hover:border-brand-border">
      <span className="relative shrink-0">
        <ZaloAvatar avatar={c.avatar} isGroup={c.isGroup} members={c.isGroup ? c.memberPreview : [{ name: c.name, avatar: null }]} size={28} />
        {unseen > 0 && <UnseenBadge count={unseen} />}
        <ThreadKindIcon platform={c.platform} isComment={c.isComment} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}>
            {m?.type === "linked" ? linkedChatLabel(m) : c.name || c.zaloId}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-gray-400">{ago(c.lastMessageAt)}</span>
          {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" title="Chưa đọc" />}
        </span>
        <span className={`block truncate text-xs text-gray-500 ${showMetaAi && m?.type === "linked" ? "pr-24" : ""}`}>
          {c.isGroup && m?.type === "linked" ? `${c.name}: ` : ""}
          {c.lastMessage || "…"}
        </span>
        {m?.type !== "linked" && c.lead && (
          <span className="block text-[11px] text-green-700">Lead · {c.lead.name}</span>
        )}
        {m?.type === "byCode" || m?.type === "byPhone" ? (
          // Gợi ý gắn khách POS (Facebook/Tiktok: chỉ khi SĐT trong hội thoại / của lead trùng khách)
          <span className="block text-[11px] text-amber-700">
            {LEAD_FIRST_PLATFORMS.has(c.platform) ? "SĐT trùng khách POS" : "Chưa gắn khách POS"} — gợi ý{" "}
            {m.customer.code ?? m.customer.name}
            {m.type === "byPhone" && !LEAD_FIRST_PLATFORMS.has(c.platform) ? " (theo SĐT)" : ""}
          </span>
        ) : (
          m?.type !== "linked" &&
          !c.lead && (
            <span className={`block text-[11px] ${LEAD_FIRST_PLATFORMS.has(c.platform) ? "text-violet-700" : "text-amber-700"}`}>
              {LEAD_FIRST_PLATFORMS.has(c.platform) ? "Chưa có lead — mở để tạo lead" : "Chưa gắn khách POS"}
            </span>
          )
        )}
      </span>
    </button>
    {/* Ngoài nút mở hội thoại (không lồng button) */}
    {showMetaAi && (
      <span className="absolute bottom-1.5 right-3">
        <RowMetaAiSwitch c={c} />
      </span>
    )}
    </div>
  );
}

/**
 * Bật/tắt Meta Business AI ngay trên danh sách, không mở hội thoại. Bật: gọi Smax. Tắt: Smax không
 * có API — đánh dấu hội thoại; tin nhân viên gửi tiếp (kèm HUMAN_AGENT) mới lấy lại quyền trả lời.
 */
function RowMetaAiSwitch({ c }: { c: RecentChat }) {
  const queryClient = useQueryClient();
  const takeOver = useMetaAiTakeOver((s) => !!s.tids[c.tid]);
  const [busy, setBusy] = useState(false);
  const metaAi = c.controlledBy === "META_AI";
  const on = metaAi && !takeOver;

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const { set } = useMetaAiTakeOver.getState();
    if (on) {
      set(c.tid, true);
      toast.info(`Đã tắt Meta AI cho "${c.name}" — tin bạn gửi tiếp trong hội thoại sẽ lấy lại quyền trả lời`);
      return;
    }
    if (metaAi) return set(c.tid, false);
    // Bật ngay, không hỏi xác nhận
    setBusy(true);
    try {
      await smaxChatApi.passControlAI({ pagePid: c.pagePid, tid: c.tid, confirmed: true });
      queryClient.setQueriesData<{ items: RecentChat[] }>({ queryKey: ["smaxRecentChats"] }, (d) =>
        d && { ...d, items: d.items.map((i) => (i.tid === c.tid ? { ...i, controlledBy: "META_AI" } : i)) }
      );
      queryClient.invalidateQueries({ queryKey: ["smaxZaloProfile"] });
      toast.success(`Đã bật Meta Business AI cho "${c.name}"`);
    } catch (err) {
      toast.error((err as Error).message || "Không bật được Meta Business AI");
    } finally {
      setBusy(false);
    }
  };

  return <MetaAiSwitch on={on} busy={busy} onClick={toggle} />;
}

/** Số tin mới (so với lần xem gần nhất trên POS). */
export function UnseenBadge({ count }: { count: number }) {
  return (
    <span className="absolute -right-1.5 -top-1.5 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
