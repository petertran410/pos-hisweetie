"use client";

import { useEffect, useState } from "react";
import { Link2Off, Loader2, RotateCw, UserPlus } from "lucide-react";
import { useRecentChats, useRefreshRecentChats } from "@/lib/hooks/useSmaxChat";
import { useChatSidebarStore, type ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { LooseThread, RecentChat, ZaloContactKind } from "@/lib/types/smaxChat";
import { markSeen, newCount } from "@/lib/chat/seen";
import { ZaloAvatar } from "./ZaloAvatar";
import { GroupMark, ThreadKindIcon, ThreadKindLogo } from "./ThreadKindIcon";
import { MetaAiSwitch } from "./MetaAiSwitch";
import { LEAD_FIRST_PLATFORMS } from "@/lib/leads/constants";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useMetaAiTakeOver } from "@/lib/store/metaAiTakeOver";

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
  // Từ khoá tìm theo tên hội thoại / nhóm (ô tìm chung của ChatCustomerPicker)
  query?: string;
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

type ListFilter = "all" | "unlinked" | "group";

/**
 * Hội thoại mới nhất trên kênh Zalo đang chọn, khớp với khách POS để mở nhanh.
 * Ô tìm nằm ở ChatCustomerPicker (`query`): có từ khoá → tìm theo tên hội thoại / nhóm.
 */
export function RecentChatsList({ onOpen, onOpenThread, pagePid, query = "" }: Props) {
  // Số hội thoại xin Smax theo kênh (đổi kênh → về mặc định)
  const [limitBy, setLimitBy] = useState<{ pagePid?: string | null; n: number }>({ n: PAGE });
  const limit = limitBy.pagePid === pagePid ? limitBy.n : PAGE;
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useRecentChats(true, pagePid, limit);
  const refresh = useRefreshRecentChats(pagePid, limit);
  // Smax trả đủ số đã xin → có thể còn nữa (đang tải trang lớn hơn thì giữ nút ở trạng thái "Đang tải…")
  const canLoadMore = isPlaceholderData || ((data?.items.length ?? 0) >= limit && limit < MAX_RECENT);
  const loadMore = () => setLimitBy({ pagePid, n: Math.min(MAX_RECENT, limit + PAGE) });
  const { open } = useOpenRecentChat(onOpen, onOpenThread);
  // Fanpage Facebook: lọc tin nhắn Messenger / bình luận bài viết (đổi kênh → về "Tất cả")
  const [kindFilter, setKindFilter] = useState<{ pagePid?: string | null; kind: "all" | "message" | "comment" }>({
    kind: "all",
  });
  const kind = kindFilter.pagePid === pagePid ? kindFilter.kind : "all";
  const setKind = (k: typeof kind) => setKindFilter({ pagePid, kind: k });
  const isFanpage = (data?.items ?? []).some((c) => c.platform === "facebook");
  const kindOk = (c: RecentChat) => !isFanpage || kind === "all" || (kind === "comment") === !!c.isComment;
  const items = (data?.items ?? []).filter(kindOk);
  // Lọc nhanh: "Chưa đọc" nhớ trong store (dùng chung thanh thu gọn); "Chưa gắn POS" / "Nhóm" chỉ trong phiên
  const unreadOnly = useChatSidebarStore((s) => s.recentUnreadOnly);
  const setUnreadOnly = useChatSidebarStore((s) => s.setRecentUnreadOnly);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const filter: ListFilter | "unread" = unreadOnly ? "unread" : listFilter;
  const pickFilter = (f: ListFilter | "unread") => {
    setUnreadOnly(f === "unread");
    setListFilter(f === "unread" ? "all" : f);
  };
  // "Chưa đọc": Smax đánh dấu chưa đọc (chấm xanh) hoặc có tin mới chưa xem trên POS (số đỏ)
  const isUnread = (c: RecentChat) => c.unread || newCount(c.tid, c.messageCount) > 0;
  const isUnlinked = (c: RecentChat) => c.match?.type !== "linked";
  const passes = (c: RecentChat) =>
    filter === "unread" ? isUnread(c) : filter === "unlinked" ? isUnlinked(c) : filter === "group" ? c.isGroup : true;
  const counts = {
    unread: items.filter(isUnread).length,
    unlinked: items.filter(isUnlinked).length,
    group: items.filter((c) => c.isGroup).length,
  };
  const shown = items.filter(passes);

  // Tìm theo tên Zalo / tên nhóm (không tìm nội dung): lọc ngay trong danh sách đã tải,
  // rồi bổ sung kết quả Smax tìm trên toàn bộ hội thoại (~2-3s)
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);
  const term = query.trim();
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
  const results = found.filter(passes);
  const remoteLoading = searching && !remoteReady && !remote.error;
  // Smax tìm phân biệt dấu (vd "cong dong" bỏ sót "CỘNG ĐỒNG") → nhắc gõ có dấu
  const noAccent = /[a-z]/i.test(term) && term === term.normalize("NFD").replace(/[̀-ͯ]/g, "") && !/đ/i.test(term);

  // Cuộn tới cuối danh sách "Tất cả" → tự tải thêm (bộ lọc khác: bấm nút, tránh tải liên tục tới 200)
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  const autoLoad = !searching && filter === "all" && canLoadMore && !isPlaceholderData;
  useEffect(() => {
    if (!sentinel || !autoLoad) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore());
    io.observe(sentinel);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinel, autoLoad, limit]);

  const chips: { key: ListFilter | "unread"; label: string; count?: number }[] = [
    { key: "all", label: "Tất cả" },
    { key: "unread", label: "Chưa đọc", count: counts.unread },
    { key: "unlinked", label: "Chưa gắn POS", count: counts.unlinked },
    { key: "group", label: "Nhóm", count: counts.group },
  ];
  const emptyText =
    filter === "unread"
      ? "Không có hội thoại chưa đọc."
      : filter === "unlinked"
        ? "Mọi hội thoại đã tải đều đã gắn khách POS."
        : filter === "group"
          ? "Không có nhóm trong các hội thoại đã tải."
          : kind === "comment"
            ? "Chưa có bình luận gần đây trên fanpage này."
            : kind === "message"
              ? "Chưa có tin nhắn Messenger gần đây."
              : "Chưa có hội thoại gần đây trên kênh này.";

  return (
    <section aria-label={searching ? "Hội thoại khớp tìm kiếm" : "Đang chat gần đây"}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-xs font-semibold uppercase text-gray-500">{searching ? "Hội thoại" : "Đang chat gần đây"}</h3>
        <button
          onClick={refresh}
          disabled={isFetching}
          title="Tải lại"
          aria-label="Tải lại danh sách hội thoại"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-50">
          <RotateCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      {/* Lọc nhanh (áp cho cả danh sách và kết quả tìm) */}
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Lọc hội thoại">
        {chips.map((c) => {
          const on = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => pickFilter(c.key)}
              aria-pressed={on}
              className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs ${
                on ? "border-brand bg-brand text-white" : "text-gray-600 hover:border-brand hover:text-brand"
              }`}>
              {c.label}
              {!!c.count && <span className={on ? "text-white/90" : "text-gray-500"}>{c.count}</span>}
            </button>
          );
        })}
      </div>
      {/* Lọc Messenger / Bình luận (fanpage) */}
      {isFanpage && (
        <div className="mb-2 inline-flex overflow-hidden rounded-md border text-xs">
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
      {searching ? (
        <>
          {results.length > 0 && (
            <ul className="flex flex-col">
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
                Không có hội thoại / nhóm nào có tên khớp “{term}”{filter !== "all" ? " trong bộ lọc đang chọn" : ""}.
              </p>
            )
          )}
          {remoteReady && noAccent && (
            <p className="px-1 pt-1 text-xs text-gray-500">Gõ có dấu (vd “Thúy”, “cộng đồng”) để tìm đầy đủ hơn.</p>
          )}
        </>
      ) : isLoading ? (
        <ul className="flex flex-col gap-2" aria-label="Đang tải hội thoại">
          {[70, 55, 80, 60].map((w, i) => (
            <li key={i} className="flex items-center gap-2 px-2 py-1.5">
              <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
              <span className="h-4 animate-pulse rounded bg-gray-200" style={{ width: `${w}%` }} />
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="text-sm text-red-600">
          {(error as Error).message || "Không tải được hội thoại"}{" "}
          <button onClick={() => refetch()} className="text-brand hover:underline">
            Thử lại
          </button>
        </p>
      ) : (
        <>
          {shown.length === 0 ? (
            <p className="text-sm text-gray-500">{emptyText}</p>
          ) : (
            <ul className="flex flex-col">
              {shown.map((c) => (
                <li key={c.tid}>
                  <RecentChatRow c={c} onClick={() => open(c)} />
                </li>
              ))}
            </ul>
          )}
          {canLoadMore && (
            <button
              ref={setSentinel}
              onClick={loadMore}
              disabled={isPlaceholderData}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs text-brand hover:bg-cyan-bg disabled:text-gray-500">
              {isPlaceholderData && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPlaceholderData ? "Đang tải thêm…" : "Tải thêm hội thoại"}
            </button>
          )}
        </>
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
  const leadFirst = LEAD_FIRST_PLATFORMS.has(c.platform);
  const bold = c.unread || unseen > 0;
  // Chưa gắn khách, không gợi ý, không lead: chỉ 1 icon nhỏ cạnh tên (thay dòng chữ cam lặp lại)
  const plainUnlinked = m?.type !== "linked" && m?.type !== "byCode" && m?.type !== "byPhone" && !c.lead;
  return (
    <div className="relative">
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cyan-bg">
      <span className="relative shrink-0">
        <ZaloAvatar avatar={c.avatar} isGroup={c.isGroup} members={c.isGroup ? c.memberPreview : [{ name: c.name, avatar: null }]} size={36} />
        {unseen > 0 && <UnseenBadge count={unseen} />}
        <ThreadKindIcon platform={c.platform} isComment={c.isComment} />
        <GroupMark show={c.isGroup && !!c.avatar} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate text-sm ${bold ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
            {/* Giữ tên hội thoại trên Smax kể cả đã gắn khách POS; khách POS ghi ở dòng dưới */}
            {c.name || c.zaloId}
          </span>
          {plainUnlinked &&
            (leadFirst ? (
              <UserPlus className="h-3.5 w-3.5 shrink-0 text-violet-600" aria-label="Chưa có lead — mở để tạo lead">
                <title>Chưa có lead — mở để tạo lead</title>
              </UserPlus>
            ) : (
              <Link2Off className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-label="Chưa gắn khách POS">
                <title>Chưa gắn khách POS</title>
              </Link2Off>
            ))}
          <span className={`ml-auto shrink-0 text-xs ${bold ? "font-medium text-brand-deep" : "text-gray-500"}`}>
            {ago(c.lastMessageAt)}
          </span>
          {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" title="Chưa đọc" />}
        </span>
        <span
          className={`block truncate text-xs ${bold ? "text-gray-700" : "text-gray-500"} ${
            showMetaAi && m?.type === "linked" ? "pr-24" : ""
          }`}>
          {c.lastMessage || "…"}
        </span>
        {m?.type === "linked" && (
          <span className="block truncate text-xs text-brand-deep">{linkedChatLabel(m)}</span>
        )}
        {m?.type !== "linked" && c.lead && (
          <span className="block text-xs text-green-700">Lead · {c.lead.name}</span>
        )}
        {(m?.type === "byCode" || m?.type === "byPhone") && (
          // Gợi ý gắn khách POS (Facebook/Tiktok: chỉ khi SĐT trong hội thoại / của lead trùng khách)
          <span className="block truncate text-xs text-amber-700">
            {leadFirst ? "SĐT trùng khách POS" : "Gợi ý gắn"}: {m.customer.code ?? m.customer.name}
            {m.type === "byPhone" && !leadFirst ? " (theo SĐT)" : ""}
          </span>
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
export function UnseenBadge({ count, max = 99 }: { count: number; max?: number }) {
  return (
    <span
      aria-label={`${count} tin mới`}
      className="absolute -right-1.5 -top-1.5 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white">
      {count > max ? `${max}+` : count}
    </span>
  );
}
