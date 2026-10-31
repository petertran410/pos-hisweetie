"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageCircle,
  MessageSquareDot,
  MoreHorizontal,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import {
  useChatSidebarStore,
  type ChatCustomerRef,
} from "@/lib/store/chatSidebar";
import { useCan } from "@/lib/hooks/useCan";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";
import { useChatContext, useRecentChats } from "@/lib/hooks/useSmaxChat";
import { newCount } from "@/lib/chat/seen";
import { linkedChatLabel, RecentChatRow, UnseenBadge, useOpenRecentChat } from "./RecentChatsList";
import { pickChannel, useActiveChannel } from "@/lib/chat/channels";
import { customerSource } from "@/lib/chat/threadSource";
import { LooseChat } from "./LooseChat";
import { useFastTitle } from "@/lib/chat/useFastTitle";
import type { ChatChannel, ChatContext, LinkedCustomer, LooseThread, RecentChat } from "@/lib/types/smaxChat";
import { ChatCustomerPicker } from "./ChatCustomerPicker";
import { ChatCustomerCard } from "./ChatCustomerCard";
import { GroupCustomersBar } from "./GroupCustomersBar";
import { ChatThread } from "./ChatThread";
import { ZaloContactEditor } from "./ZaloContactEditor";
import { ZaloContactsManager } from "./ZaloContactsManager";
import { SharedGroupsScanner } from "./SharedGroupsScanner";
import { ZaloAvatar } from "./ZaloAvatar";

/**
 * Sidebar chat Zalo (Smax) mép phải. Desktop: đẩy nội dung (rail 44px khi thu
 * gọn); mobile: sheet toàn màn hình mở từ nút trên header.
 */
export function ZaloChatSidebar() {
  const canView = useCan("smax_chat", "view");
  const isClient = useIsClient();
  const isMobile = useIsMobile();
  const open = useChatSidebarStore((s) => s.open);
  const setOpen = useChatSidebarStore((s) => s.setOpen);
  const customer = useCurrentChatCustomer();
  const panelWidth = useChatSidebarStore((s) => s.panelWidth);
  const railWidth = useChatSidebarStore((s) => s.railWidth);

  // Các bảng chi tiết (…DetailRow) chỉ đo lại độ rộng khi window resize →
  // báo khi khung chat mở / thu gọn / kéo đổi độ rộng làm vùng nội dung đổi theo
  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [open, panelWidth, railWidth]);

  if (!canView || !isClient) return null;

  if (isMobile) {
    if (!open) return null;
    return (
      <div
        className="fixed top-0 left-0 z-50 flex flex-col bg-white"
        // html { zoom: 0.85 } → bù kích thước viewport
        style={{ width: "calc(100vw / 0.85)", height: "calc(100dvh / 0.85)" }}
      >
        <ChatPanel onClose={() => setOpen(false)} mobile />
      </div>
    );
  }

  if (!open)
    return <CollapsedRail customer={customer} onExpand={() => setOpen(true)} />;

  return <ResizableAside onClose={() => setOpen(false)} />;
}

const PANEL_MIN_WIDTH = 360;
const PANEL_MAX_WIDTH = 1200;
// Từ độ rộng này hiện cột "Thông tin POS" cạnh khung chat (thay cho mục thu gọn)
const PANEL_WIDE_WIDTH = 700;
// Khung chat đủ rộng để hiện cột Thông tin POS riêng
const PanelWideContext = createContext(false);
// Thanh chia giữa khung chat và cột Thông tin POS: độ rộng tối thiểu mỗi bên
const CHAT_MIN_WIDTH = 360;
const POS_MIN_WIDTH = 220;

/** Khung chat kéo mép trái để mở rộng / thu hẹp; bấm đúp mép để về mặc định. */
function ResizableAside({ onClose }: { onClose: () => void }) {
  const panelWidth = useChatSidebarStore((s) => s.panelWidth);
  const setPanelWidth = useChatSidebarStore((s) => s.setPanelWidth);
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = el.offsetWidth;
    // Toạ độ con trỏ theo px màn hình, độ rộng theo px CSS (html có zoom) → quy đổi
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
    setResizing(true);
    const onMove = (ev: PointerEvent) =>
      setPanelWidth(
        Math.round(
          Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, startW + (startX - ev.clientX) / scale)),
        ),
      );
    const onUp = () => {
      setResizing(false);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  return (
    <aside
      ref={ref}
      className={`relative shrink-0 border-l bg-white flex min-h-0 ${
        panelWidth ? "" : "w-[420px] min-[1440px]:w-[720px]"
      } ${resizing ? "select-none" : ""}`}
      // Chừa tối thiểu 480px cho màn hình POS bên trái (html zoom 0.85 → bù viewport)
      style={{ ...(panelWidth ? { width: panelWidth } : {}), maxWidth: "calc(100vw / 0.85 - 480px)" }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để đổi chiều rộng khung chat"
        title="Kéo để mở rộng / thu hẹp · bấm đúp để về mặc định"
        onPointerDown={startResize}
        onDoubleClick={() => setPanelWidth(null)}
        className="group absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize touch-none items-center justify-center"
      >
        <span
          className={`h-10 w-1 rounded-full transition-colors group-hover:bg-brand ${
            resizing ? "bg-brand" : "bg-transparent"
          }`}
        />
      </div>
      <PanelWideContext.Provider value={width >= PANEL_WIDE_WIDTH}>
        <ChatPanel onClose={onClose} />
      </PanelWideContext.Provider>
    </aside>
  );
}

// Chiều cao 1 bong bóng hội thoại trên thanh thu gọn (32px + gap 8px)
const RAIL_ITEM = 40;
// Thanh thu gọn: rộng mặc định (chỉ avatar); kéo quá RAIL_NAMES_WIDTH thì hiện tên hội thoại
const RAIL_WIDTH = 48;
const RAIL_NAMES_WIDTH = 120;
const RAIL_MAX_WIDTH = 360;

/**
 * Thanh thu gọn: mở chat, chọn nhanh kênh Zalo (avatar), và avatar các hội thoại
 * gần nhất của kênh kèm số tin mới (so với lần xem gần nhất trên POS).
 */
function CollapsedRail({
  customer,
  onExpand,
}: {
  customer: ChatCustomerRef | null;
  onExpand: () => void;
}) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { usable, channel } = useActiveChannel();
  const setPagePid = useChatSidebarStore((s) => s.setPagePid);
  const selectCustomer = useChatSidebarStore((s) => s.selectCustomer);
  // Số bong bóng vừa khít khung (đo theo chiều cao); phần còn lại xem trong dropdown "…"
  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(15);
  // Dropdown "…" đang mở: nút neo + vị trí (tính lúc bấm)
  const [moreAt, setMoreAt] = useState<{ anchor: HTMLElement; right: number; bottom: number } | null>(null);
  // Số hội thoại lấy từ Smax (dropdown bấm "Tải thêm" để tăng), theo kênh
  const [limitBy, setLimitBy] = useState<{ pagePid: string | null; n: number }>({ pagePid: null, n: 30 });
  const limit = limitBy.pagePid === (channel?.pagePid ?? null) ? limitBy.n : 30;
  useEffect(() => {
    if (!listEl) return;
    // Bong bóng 32px + gap 8px; trừ padding trên/dưới
    const measure = () =>
      setFit(Math.max(2, Math.floor((listEl.clientHeight - 12 + 8) / RAIL_ITEM)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(listEl);
    return () => ro.disconnect();
  }, [listEl]);
  const { data, isFetching } = useRecentChats(!!channel && !channel.missing, channel?.pagePid, limit);
  // Lọc "Chưa đọc" dùng chung với danh sách "Đang chat gần đây" khi mở rộng
  const unreadOnly = useChatSidebarStore((s) => s.recentUnreadOnly);
  const setUnreadOnly = useChatSidebarStore((s) => s.setRecentUnreadOnly);
  const all = data?.items ?? [];
  const isUnread = (c: RecentChat) => c.unread || newCount(c.tid, c.messageCount) > 0;
  const unreadCount = all.filter(isUnread).length;
  const items = unreadOnly ? all.filter(isUnread) : all;
  // Còn hội thoại thì ô cuối là "…"
  const shown = items.length > fit ? items.slice(0, fit - 1) : items;
  const rest = items.slice(shown.length);
  // Smax trả đủ số đã xin → có thể còn nữa (backend tối đa 200)
  const canLoadMore = all.length >= limit && limit < 200;
  const toggleMore = (btn: HTMLElement) => {
    if (moreAt) return setMoreAt(null);
    // Mép phải dropdown sát trái thanh, đáy ngang nút "…" (position:fixed bị nhân zoom của <html>)
    const zoom = parseFloat(getComputedStyle(document.documentElement).zoom || "1") || 1;
    const a = btn.getBoundingClientRect();
    const rail = btn.closest("aside")?.getBoundingClientRect() ?? a;
    setMoreAt({
      anchor: btn,
      right: (window.innerWidth - rail.left + 6) / zoom,
      bottom: Math.max(8, window.innerHeight - a.bottom) / zoom,
    });
  };
  const openLoose = useChatSidebarStore((s) => s.openLoose);
  const { open } = useOpenRecentChat(
    (c, target) => {
      selectCustomer(c, userId);
      if (target) {
        const st = useChatSidebarStore.getState();
        st.setPagePid(target.pagePid);
        st.setKind(target.kind);
        st.setGroupId(target.groupId);
      }
      onExpand();
    },
    (thread) => {
      openLoose(thread, userId);
      onExpand();
    },
  );

  // title hiện sau 200ms thay vì ~1s của trình duyệt
  const railRef = useRef<HTMLElement>(null);
  useFastTitle(railRef);

  // Kéo mép trái để giãn thanh; thả khi chưa đủ rộng hiện tên thì về lại cỡ avatar
  const railWidth = useChatSidebarStore((s) => s.railWidth);
  const setRailWidth = useChatSidebarStore((s) => s.setRailWidth);
  const [resizing, setResizing] = useState(false);
  const width = railWidth ?? RAIL_WIDTH;
  const showNames = width >= RAIL_NAMES_WIDTH;
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = railRef.current;
    if (!el) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = el.offsetWidth;
    // Toạ độ con trỏ theo px màn hình, độ rộng theo px CSS (html có zoom) → quy đổi
    const scale = el.getBoundingClientRect().width / el.offsetWidth || 1;
    let w = startW;
    setResizing(true);
    const onMove = (ev: PointerEvent) => {
      w = Math.round(Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_WIDTH, startW + (startX - ev.clientX) / scale)));
      setRailWidth(w);
    };
    const onUp = () => {
      setResizing(false);
      if (w < RAIL_NAMES_WIDTH) setRailWidth(null);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  return (
    <aside
      ref={railRef}
      className={`relative shrink-0 border-l bg-white flex flex-col gap-2 py-3 min-h-0 ${
        showNames ? "items-stretch" : "items-center"
      } ${resizing ? "select-none" : ""}`}
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để hiện tên hội thoại"
        title="Kéo sang trái để hiện tên hội thoại · bấm đúp để thu lại"
        onPointerDown={startResize}
        onDoubleClick={() => setRailWidth(null)}
        className="group absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize touch-none items-center justify-center"
      >
        <span
          className={`h-10 w-1 rounded-full transition-colors group-hover:bg-brand ${
            resizing ? "bg-brand" : "bg-transparent"
          }`}
        />
      </div>
      <button
        onClick={onExpand}
        title="Mở chat Zalo"
        className={`h-8 shrink-0 flex items-center gap-2 rounded-md text-brand hover:bg-cyan-bg ${
          showNames ? "mx-2 px-1.5 text-sm font-medium" : "w-8 justify-center"
        }`}
      >
        <MessageCircle className="w-5 h-5 shrink-0" />
        {showNames && "Mở chat Zalo"}
      </button>
      {customer && (
        <button
          onClick={onExpand}
          title={`Chat với ${customer.code ?? ""} ${customer.name}`}
          className={`shrink-0 flex items-center gap-2 text-left ${
            showNames ? "mx-2 rounded-md px-1 hover:bg-cyan-bg" : ""
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white text-xs font-semibold">
            {initials(customer.name)}
          </span>
          {showNames && (
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {customer.code ? `${customer.code} · ` : ""}
              {customer.name}
            </span>
          )}
        </button>
      )}

      {/* Kênh đang chọn; từ 2 kênh trở lên bấm để chọn kênh khác */}
      {channel && (
        <div className={`w-full shrink-0 border-t pt-2 flex ${showNames ? "px-2" : "justify-center"}`}>
          <RailChannelPicker
            channels={usable}
            active={channel}
            onPick={setPagePid}
            showName={showNames}
          />
        </div>
      )}

      {channel && (
        <button
          onClick={() => setUnreadOnly(!unreadOnly)}
          aria-pressed={unreadOnly}
          title={`${unreadOnly ? "Đang lọc" : "Chỉ hiện"} hội thoại chưa đọc${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          className={`relative h-8 shrink-0 flex items-center gap-2 ${
            showNames ? "mx-2 rounded-md px-1.5 text-xs" : "w-8 self-center justify-center rounded-full"
          } ${unreadOnly ? "bg-brand text-white" : "text-gray-500 hover:bg-cyan-bg hover:text-brand"}`}
        >
          <MessageSquareDot className="h-4 w-4 shrink-0" />
          {showNames && `Chưa đọc${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
          {!showNames && unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 min-w-[16px] rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Hội thoại gần nhất của kênh đang chọn */}
      <div
        ref={setListEl}
        className={`flex w-full min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-2 pb-1 ${
          showNames ? "items-stretch px-2" : "items-center"
        } ${all.length ? "border-t" : ""}`}
      >
          {shown.map((c) => {
            const unseen = newCount(c.tid, c.messageCount);
            const who = c.match
              ? `${c.match.customer.code ?? ""} ${c.match.customer.name}`
              : `${c.name} (chưa gắn khách POS — mở Smax)`;
            const label =
              c.match?.type === "linked" ? linkedChatLabel(c.match) : c.name || c.zaloId;
            return (
              <button
                key={c.tid}
                onClick={() => open(c)}
                title={`${who}\n${c.isGroup ? `${c.name}: ` : ""}${c.lastMessage}`}
                className={`relative shrink-0 ${
                  showNames ? "flex min-w-0 items-center gap-2 rounded-md px-1 text-left hover:bg-cyan-bg" : "rounded-full"
                } ${c.match ? "" : "opacity-50 hover:opacity-80"} disabled:opacity-40`}
              >
                <span className="relative shrink-0">
                <ZaloAvatar
                  avatar={c.avatar}
                  isGroup={c.isGroup}
                  members={
                    c.isGroup
                      ? c.memberPreview
                      : [{ name: c.name, avatar: null }]
                  }
                  size={32}
                />
                {unseen > 0 && <UnseenBadge count={unseen} />}
                </span>
                {showNames && (
                  <span className={`min-w-0 flex-1 truncate text-xs ${c.unread || unseen > 0 ? "font-semibold" : ""}`}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
          {unreadOnly && items.length === 0 && !isFetching && showNames && (
            <p className="px-1 text-xs text-gray-500">Không có hội thoại chưa đọc.</p>
          )}
          {rest.length > 0 && (
            <button
              onClick={(e) => toggleMore(e.currentTarget)}
              title={`${rest.length}${canLoadMore ? "+" : ""} hội thoại khác`}
              aria-label="Xem thêm hội thoại"
              aria-expanded={!!moreAt}
              className={`relative flex h-8 shrink-0 items-center justify-center gap-1.5 hover:bg-cyan-bg hover:text-brand ${
                showNames ? "rounded-md px-2 text-xs" : "w-8 self-center rounded-full"
              } ${moreAt ? "bg-cyan-bg text-brand" : "bg-gray-100 text-gray-500"}`}
            >
              <MoreHorizontal className="h-4 w-4" />
              {showNames && `${rest.length}${canLoadMore ? "+" : ""} hội thoại khác`}
              {rest.some((c) => newCount(c.tid, c.messageCount) > 0) && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </button>
          )}
      </div>
      {moreAt && rest.length > 0 && (
        <RailMoreDropdown
          anchor={moreAt.anchor}
          pos={moreAt}
          items={rest}
          loading={isFetching}
          canLoadMore={canLoadMore}
          onLoadMore={() => setLimitBy({ pagePid: channel?.pagePid ?? null, n: Math.min(200, limit + 30) })}
          onPick={(c) => {
            setMoreAt(null);
            open(c);
          }}
          onClose={() => setMoreAt(null)}
        />
      )}
    </aside>
  );
}

/**
 * Dropdown "…" của thanh thu gọn: các hội thoại không đủ chỗ trên thanh. Nổi bên trái
 * thanh (portal, không đẩy layout), kẹp trong viewport; cuối danh sách "Tải thêm".
 */
function RailMoreDropdown({
  anchor,
  pos,
  items,
  loading,
  canLoadMore,
  onLoadMore,
  onPick,
  onClose,
}: {
  anchor: HTMLElement;
  pos: { right: number; bottom: number };
  items: RecentChat[];
  loading: boolean;
  canLoadMore: boolean;
  onLoadMore: () => void;
  onPick: (c: RecentChat) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label="Hội thoại khác"
      style={{ right: pos.right, bottom: pos.bottom }}
      className="fixed z-[1000] flex max-h-[min(70vh,calc(100vh-16px))] w-80 flex-col rounded-lg border bg-white shadow-xl"
    >
      <div className="border-b px-3 py-2 text-xs font-semibold uppercase text-gray-500">
        Hội thoại khác ({items.length}
        {canLoadMore ? "+" : ""})
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-1">
        {items.map((c) => (
          <li key={c.tid}>
            <RecentChatRow c={c} onClick={() => onPick(c)} />
          </li>
        ))}
      </ul>
      {canLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={loading}
          className="flex items-center justify-center gap-1 border-t py-2 text-xs text-brand hover:bg-cyan-bg disabled:opacity-60"
        >
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {loading ? "Đang tải…" : "Tải thêm hội thoại"}
        </button>
      )}
    </div>,
    document.body,
  );
}

function ChannelDot({ c, size }: { c: ChatChannel; size: number }) {
  return (
    <span className="relative inline-flex">
      <ZaloAvatar
        avatar={c.avatar}
        isGroup={false}
        members={[{ name: c.name, avatar: null }]}
        size={size}
      />
      {c.connectionError && (
        <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
      )}
    </span>
  );
}

/** Avatar kênh đang chọn ở thanh thu gọn; ≥ 2 kênh thì mở danh sách để chọn. */
function RailChannelPicker({
  channels,
  active,
  onPick,
  showName = false,
}: {
  channels: ChatChannel[];
  active: ChatChannel;
  onPick: (pagePid: string) => void;
  // Thanh thu gọn đã kéo giãn: hiện tên kênh cạnh avatar
  showName?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const many = channels.length >= 2;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${showName ? "min-w-0 flex-1" : ""}`}>
      <button
        onClick={() => many && setOpen((o) => !o)}
        title={`${active.name}${active.connectionError ? " · Mất kết nối" : ""}${many ? " — bấm để chọn kênh khác" : ""}`}
        className={`flex items-center gap-2 text-left ${showName ? "w-full rounded-md p-1 hover:bg-cyan-bg" : ""} ${
          many ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <span className="relative shrink-0 rounded-full ring-2 ring-brand ring-offset-1">
          <ChannelDot c={active} size={30} />
          {many && (
            <span className="absolute -left-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-gray-500 shadow ring-1 ring-gray-200">
              <ChevronDown className="h-2.5 w-2.5" />
            </span>
          )}
        </span>
        {showName && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-xs font-medium">{active.name}</span>
            {active.connectionError && <span className="block text-[11px] text-red-600">Mất kết nối</span>}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-full top-0 z-50 mr-2 w-64 rounded-lg border bg-white py-1 text-sm shadow-xl">
          <p className="px-3 py-1 text-[11px] font-semibold uppercase text-gray-500">
            Kênh Zalo của tôi
          </p>
          {channels.map((c) => (
            <button
              key={c.pagePid}
              onClick={() => {
                onPick(c.pagePid);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 ${
                c.pagePid === active.pagePid ? "bg-cyan-bg" : ""
              }`}
            >
              <ChannelDot c={c} size={26} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                  c.connectionError
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {c.connectionError ? "Mất kết nối" : "Hoạt động"}
              </span>
              {c.pagePid === active.pagePid && (
                <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Nút mở chat trên header mobile. */
export function ChatSidebarToggle() {
  const canView = useCan("smax_chat", "view");
  const setOpen = useChatSidebarStore((s) => s.setOpen);
  if (!canView) return null;
  return (
    <button
      onClick={() => setOpen(true)}
      className="p-2 hover:bg-gray-200 rounded transition-colors"
      aria-label="Chat Zalo"
    >
      <MessageCircle className="w-5 h-5" />
    </button>
  );
}

function useCurrentChatCustomer(): ChatCustomerRef | null {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ownerId = useChatSidebarStore((s) => s.ownerId);
  const customer = useChatSidebarStore((s) => s.customer);
  return ownerId === userId ? customer : null;
}

/** Hội thoại chưa gắn khách POS đang mở (nếu có). */
function useCurrentLooseThread(): LooseThread | null {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ownerId = useChatSidebarStore((s) => s.ownerId);
  const loose = useChatSidebarStore((s) => s.loose);
  return ownerId === userId ? loose : null;
}

/** Đầu sidebar: avatar + chọn kênh Zalo của tôi + tình trạng kênh (thay chữ "Chat Zalo"). */
function ChannelSwitcher() {
  const { usable, channel } = useActiveChannel();
  const setPagePid = useChatSidebarStore((s) => s.setPagePid);
  if (!channel) {
    return (
      <>
        <MessageCircle className="w-5 h-5 text-brand shrink-0" />
        <p className="shrink-0 text-sm font-semibold leading-tight">
          Chat Zalo
        </p>
      </>
    );
  }
  return (
    <>
      <ZaloAvatar
        avatar={channel.avatar}
        isGroup={false}
        members={[{ name: channel.name, avatar: null }]}
        size={28}
      />
      {usable.length >= 2 ? (
        <select
          value={channel.pagePid}
          onChange={(e) => setPagePid(e.target.value)}
          title="Kênh Zalo gửi tin"
          className="min-w-0 max-w-[180px] shrink rounded border px-2 py-1 text-sm font-medium"
        >
          {usable.map((c) => (
            <option key={c.pagePid} value={c.pagePid}>
              {c.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="min-w-0 truncate text-sm font-semibold">
          {channel.name}
        </span>
      )}
      <span
        className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${
          channel.missing
            ? "bg-gray-100 text-gray-600"
            : channel.connectionError
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
        }`}
      >
        {channel.missing
          ? "Không còn trên Smax"
          : channel.connectionError
            ? "Mất kết nối"
            : "Hoạt động"}
      </span>
    </>
  );
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function ChatPanel({
  onClose,
  mobile,
}: {
  onClose: () => void;
  mobile?: boolean;
}) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const customer = useCurrentChatCustomer();
  const loose = useCurrentLooseThread();
  const selectCustomer = useChatSidebarStore((s) => s.selectCustomer);
  const openLoose = useChatSidebarStore((s) => s.openLoose);
  const [picking, setPicking] = useState(false);
  const showPicker = picking || (!customer && !loose);

  return (
    <div className="flex flex-1 min-w-0 min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <ChannelSwitcher />
        {/* Khách đang chat: căn phải, sát các nút */}
        <p className="min-w-0 flex-1 truncate text-right text-xs text-gray-500">
          {!showPicker &&
            (loose ? (
              <span className="text-amber-700">{loose.name || loose.zaloId} · chưa gắn khách POS</span>
            ) : (
              customer && (
                <>
                  {customer.code ? `${customer.code} · ` : ""}
                  {customer.name}
                </>
              )
            ))}
        </p>
        {(customer || loose) && (
          <button
            onClick={() => setPicking(!picking)}
            title={showPicker ? "Quay lại hội thoại" : "Đổi khách"}
            className="p-1.5 rounded hover:bg-gray-100"
          >
            <Users className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onClose}
          title="Thu gọn"
          className="p-1.5 rounded hover:bg-gray-100"
        >
          {mobile ? (
            <X className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {showPicker ? (
        <ChatCustomerPicker
          onSelect={(c, target) => {
            selectCustomer(c, userId);
            if (target) {
              const st = useChatSidebarStore.getState();
              st.setPagePid(target.pagePid);
              st.setKind(target.kind);
              st.setGroupId(target.groupId);
            }
            setPicking(false);
          }}
          onOpenThread={(t) => {
            openLoose(t, userId);
            setPicking(false);
          }}
        />
      ) : loose ? (
        <LooseChat key={loose.tid} thread={loose} />
      ) : (
        customer && <CustomerChat key={customer.id} customerId={customer.id} />
      )}
    </div>
  );
}

/** Nhóm đang mở của khách + mọi khách POS cùng gắn nhóm đó (theo thứ tự gắn). */
function useCurrentGroup(ctx: ChatContext | undefined) {
  const kind = useChatSidebarStore((s) => s.kind);
  const groupId = useChatSidebarStore((s) => s.groupId);
  const groups = ctx?.contacts.groups ?? [];
  const group = kind === "group" ? (groups.find((g) => g.id === groupId) ?? groups[0] ?? null) : null;
  const customers: LinkedCustomer[] =
    group && ctx
      ? [
          { id: ctx.customer.id, code: ctx.customer.code, name: ctx.customer.name, contactId: group.id },
          ...group.sharedWith,
        ].sort((a, b) => a.contactId - b.contactId)
      : [];
  return { group, customers };
}

/** Chuyển sang khách khác cùng nhóm (vẫn mở nhóm đó). */
function useSwitchGroupCustomer() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  return (c: LinkedCustomer) => {
    const st = useChatSidebarStore.getState();
    st.selectCustomer({ id: c.id, code: c.code, name: c.name }, userId);
    st.setKind("group");
    st.setGroupId(c.contactId);
  };
}

function CustomerChat({ customerId }: { customerId: number }) {
  const {
    data: ctx,
    isLoading,
    error,
    refetch,
  } = useChatContext(customerId, true);
  const wide = useContext(PanelWideContext);
  const posRatio = useChatSidebarStore((s) => s.posRatio);
  const setPosRatio = useChatSidebarStore((s) => s.setPosRatio);
  const splitRef = useRef<HTMLDivElement>(null);
  const [splitting, setSplitting] = useState(false);

  // Kéo thanh chia → đổi tỷ lệ cột POS theo thời gian thực (lưu tỷ lệ, không lưu px)
  const startSplit = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = splitRef.current;
    if (!box) return;
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    // rect theo px màn hình (html có zoom), min width theo px CSS → quy đổi
    const rect = box.getBoundingClientRect();
    const scale = rect.width / box.offsetWidth || 1;
    const minPos = POS_MIN_WIDTH * scale;
    const maxPos = rect.width - CHAT_MIN_WIDTH * scale;
    setSplitting(true);
    const onMove = (ev: PointerEvent) => {
      const pos = Math.min(maxPos, Math.max(minPos, rect.right - ev.clientX));
      setPosRatio(Math.round((pos / rect.width) * 1000) / 1000);
    };
    const onUp = () => {
      setSplitting(false);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-3">
        {[80, 50, 65].map((w, i) => (
          <div
            key={i}
            className="h-6 rounded bg-gray-200 animate-pulse"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }
  if (error || !ctx) {
    return (
      <div className="p-4 text-sm">
        <p className="text-red-600 mb-2">
          {(error as Error | null)?.message || "Không tải được dữ liệu chat"}
        </p>
        <button
          onClick={() => refetch()}
          className="text-brand hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div ref={splitRef} className={`flex flex-1 min-h-0 ${splitting ? "select-none" : ""}`}>
      <div className="flex flex-1 min-w-0 min-h-0 flex-col">
        {!wide && (
        <details className="border-b">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase text-gray-500">
            Thông tin POS
          </summary>
          <div className="px-3 pb-3 max-h-64 overflow-y-auto">
            <ChatCustomerCard context={ctx} />
          </div>
        </details>
        )}
        <ChannelChat ctx={ctx} />
      </div>
      {wide && (
      <div className="relative shrink-0">
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để chia lại khung chat và Thông tin POS"
          title="Kéo để chia lại · bấm đúp để về mặc định"
          onPointerDown={startSplit}
          onDoubleClick={() => setPosRatio(null)}
          className="group absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize touch-none items-center justify-center"
        >
          <span
            className={`h-10 w-1 rounded-full transition-colors group-hover:bg-brand ${
              splitting ? "bg-brand" : "bg-transparent"
            }`}
          />
        </div>
      </div>
      )}
      {wide && (
      <div
        className={`${posRatio ? "" : "w-[300px]"} shrink-0 border-l overflow-y-auto p-3`}
        // Theo tỷ lệ đã lưu, kẹp min/max để khung chat luôn còn ≥ CHAT_MIN_WIDTH
        style={
          posRatio
            ? {
                width: `${posRatio * 100}%`,
                minWidth: POS_MIN_WIDTH,
                maxWidth: `calc(100% - ${CHAT_MIN_WIDTH}px)`,
              }
            : undefined
        }
      >
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Thông tin POS
        </h3>
        <ChatCustomerCard context={ctx} />
      </div>
      )}
    </div>
  );
}

function ChannelChat({ ctx }: { ctx: ChatContext }) {
  const userName = useAuthStore((s) => s.user?.name ?? "");
  const canSettings = useCan("settings", "update");
  const canSend = useCan("smax_chat", "send");
  const canManage = useCan("smax_chat", "manage_contacts");
  const { kind, groupId, pagePid, setKind, setGroupId, setPagePid } =
    useChatSidebarStore();
  const { customers: groupCustomers } = useCurrentGroup(ctx);
  const switchCustomer = useSwitchGroupCustomer();
  const [managing, setManaging] = useState(false);
  const [adding, setAdding] = useState(false);

  const channels = ctx.myChannels;
  const channel = pickChannel(channels, pagePid);

  const settingsLink = canSettings ? (
    <Link
      href="/cai-dat/smax"
      className="text-brand font-medium hover:underline"
    >
      Liên kết tại Cài đặt → Smax
    </Link>
  ) : (
    <span>Liên hệ quản trị để liên kết.</span>
  );

  if (!channel) {
    return (
      <Notice>
        Tài khoản <b>{userName}</b> chưa liên kết kênh Zalo nào. {settingsLink}
      </Notice>
    );
  }
  if (channel.missing) {
    return (
      <Notice>
        Kênh <b>{channel.name}</b> không còn trên Smax. {settingsLink}
      </Notice>
    );
  }
  if (channel.platform !== "zaloweb") {
    return (
      <Notice>
        Chưa hỗ trợ chat qua Zalo OA (<b>{channel.name}</b>) trong POS. Hãy liên
        kết thêm một kênh Zalo cá nhân. {settingsLink}
      </Notice>
    );
  }

  const { user, groups } = ctx.contacts;
  const group = groups.find((g) => g.id === groupId) ?? groups[0];
  const contact = kind === "group" ? group : user;
  const missingOthers = channels.filter((c) => c.missing);

  const sendDisabledReason = !canSend
    ? "Bạn không có quyền gửi tin Zalo"
    : channel.connectionError
      ? "Kênh đang mất kết nối — không gửi được"
      : null;

  const recipientLabel = contact
    ? kind === "group"
      ? `Nhóm ${contact.name ?? ""} (ID ${contact.zaloId})`
      : `${contact.name || ctx.customer.name} (ID ${contact.zaloId})`
    : "";

  // Trực tiếp / Nhóm + quản lý ID Zalo — nằm cùng hàng với avatar & tên Zalo của khách
  const toolbar = (
    <div className="flex items-center gap-1">
      <div className="inline-flex rounded-md border overflow-hidden text-sm">
        <button
          onClick={() => {
            setKind("user");
            setAdding(false);
          }}
          title={user ? "" : "Khách chưa có ID Zalo"}
          className={`px-3 py-1 ${kind === "user" ? "bg-brand text-white" : "hover:bg-gray-50"} ${
            user ? "" : "text-gray-400"
          }`}
        >
          Trực tiếp
        </button>
        <button
          onClick={() => {
            setKind("group");
            setAdding(false);
          }}
          title={groups.length ? "" : "Khách chưa có nhóm Zalo"}
          className={`px-3 py-1 border-l ${kind === "group" ? "bg-brand text-white" : "hover:bg-gray-50"} ${
            groups.length ? "" : "text-gray-400"
          }`}
        >
          Nhóm
        </button>
      </div>
      <button
        onClick={() => setManaging(!managing)}
        title="ID Zalo của khách"
        className={`p-1.5 rounded ${managing ? "bg-cyan-bg text-brand" : "hover:bg-gray-100"}`}
      >
        <Settings2 className="w-4 h-4" />
      </button>
    </div>
  );
  const groupSelect =
    kind === "group" && groups.length >= 2 ? (
      <select
        value={group?.id}
        onChange={(e) => setGroupId(Number(e.target.value))}
        className="w-full border rounded px-2 py-1 text-sm"
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name || "Nhóm"} · …{g.zaloId.slice(-6)}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {(!contact || managing) && (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="ml-auto">{toolbar}</div>
          {groupSelect}
        </div>
      )}

      {channel.connectionError && (
        <div className="flex gap-2 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Kênh <b>{channel.name}</b> mất kết nối
            {channel.connectionError.note
              ? ` (${channel.connectionError.note})`
              : ""}
            {channel.connectionError.at
              ? ` từ ${new Date(channel.connectionError.at).toLocaleString("vi-VN")}`
              : ""}{" "}
            — làm mới kết nối trên Smax.
          </span>
        </div>
      )}
      {missingOthers.length > 0 && (
        <div className="bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Kênh không còn trên Smax:{" "}
          {missingOthers.map((c) => c.name).join(", ")}
        </div>
      )}

      {managing ? (
        <div className="flex-1 overflow-y-auto p-3">
          <ZaloContactsManager customerId={ctx.customer.id} />
        </div>
      ) : contact ? (
        <ChatThread
          key={`${channel.pagePid}-${contact.id}`}
          source={customerSource(ctx.customer.id, channel.pagePid, contact)}
          channelName={channel.name}
          recipientLabel={recipientLabel}
          confirmBeforeSend={ctx.confirmBeforeSend}
          sendDisabledReason={sendDisabledReason}
          ctx={ctx}
          headerActions={toolbar}
          headerExtra={
            kind === "group" && group ? (
              <>
                {groupSelect}
                <GroupCustomersBar
                  group={group}
                  customers={groupCustomers}
                  currentId={ctx.customer.id}
                  onSelect={switchCustomer}
                />
              </>
            ) : (
              groupSelect
            )
          }
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {adding ? (
            <ZaloContactEditor
              customerId={ctx.customer.id}
              kind={kind}
              pagePid={channel.pagePid}
              defaultPhone={ctx.customer.phone}
              onDone={() => setAdding(false)}
            />
          ) : (
            <div className="text-center text-gray-500 py-6">
              <p className="mb-2">
                {kind === "user"
                  ? "Khách chưa có ID Zalo cá nhân."
                  : "Khách chưa có nhóm Zalo."}
              </p>
              {canManage ? (
                <button
                  onClick={() => setAdding(true)}
                  className="px-3 py-1.5 rounded bg-brand text-white"
                >
                  {kind === "user" ? "Thêm ID Zalo" : "Thêm nhóm Zalo"}
                </button>
              ) : (
                <p>Liên hệ người có quyền quản lý ID Zalo để thêm.</p>
              )}
              {kind === "group" && (
                <div className="mt-4">
                  <SharedGroupsScanner
                    customerId={ctx.customer.id}
                    pagePid={channel.pagePid}
                    hasUserContact={!!user}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}
