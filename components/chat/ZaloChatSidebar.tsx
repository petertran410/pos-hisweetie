"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  MessageCircle,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useChatSidebarStore, type ChatCustomerRef } from "@/lib/store/chatSidebar";
import { useCan } from "@/lib/hooks/useCan";
import { useIsClient, useIsMobile } from "@/lib/hooks/useIsMobile";
import { useChatContext } from "@/lib/hooks/useSmaxChat";
import type { ChatChannel, ChatContext } from "@/lib/types/smaxChat";
import { ChatCustomerPicker } from "./ChatCustomerPicker";
import { ChatCustomerCard } from "./ChatCustomerCard";
import { ChatThread } from "./ChatThread";
import { ZaloContactEditor } from "./ZaloContactEditor";
import { ZaloContactsManager } from "./ZaloContactsManager";
import { SharedGroupsScanner } from "./SharedGroupsScanner";

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

  if (!canView || !isClient) return null;

  if (isMobile) {
    if (!open) return null;
    return (
      <div
        className="fixed top-0 left-0 z-50 flex flex-col bg-white"
        // html { zoom: 0.85 } → bù kích thước viewport
        style={{ width: "calc(100vw / 0.85)", height: "calc(100dvh / 0.85)" }}>
        <ChatPanel onClose={() => setOpen(false)} mobile />
      </div>
    );
  }

  if (!open) {
    return (
      <aside className="w-11 shrink-0 border-l bg-white flex flex-col items-center gap-3 py-3">
        <button
          onClick={() => setOpen(true)}
          title="Mở chat Zalo"
          className="h-8 w-8 flex items-center justify-center rounded-md text-brand hover:bg-cyan-bg">
          <MessageCircle className="w-5 h-5" />
        </button>
        {customer && (
          <button
            onClick={() => setOpen(true)}
            title={`Chat với ${customer.code ?? ""} ${customer.name}`}
            className="h-8 w-8 rounded-full bg-brand text-white text-xs font-semibold">
            {initials(customer.name)}
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside className="w-[420px] min-[1440px]:w-[720px] shrink-0 border-l bg-white flex min-h-0">
      <ChatPanel onClose={() => setOpen(false)} />
    </aside>
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
      aria-label="Chat Zalo">
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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function ChatPanel({ onClose, mobile }: { onClose: () => void; mobile?: boolean }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const customer = useCurrentChatCustomer();
  const selectCustomer = useChatSidebarStore((s) => s.selectCustomer);
  const [picking, setPicking] = useState(false);
  const showPicker = picking || !customer;

  return (
    <div className="flex flex-1 min-w-0 min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <MessageCircle className="w-5 h-5 text-brand shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Chat Zalo</p>
          {customer && !showPicker && (
            <p className="text-xs text-gray-500 truncate">
              {customer.code ? `${customer.code} · ` : ""}
              {customer.name}
            </p>
          )}
        </div>
        {customer && (
          <button
            onClick={() => setPicking(!picking)}
            title={showPicker ? "Quay lại hội thoại" : "Đổi khách"}
            className="p-1.5 rounded hover:bg-gray-100">
            <Users className="w-4 h-4" />
          </button>
        )}
        <button onClick={onClose} title="Thu gọn" className="p-1.5 rounded hover:bg-gray-100">
          {mobile ? <X className="w-5 h-5" /> : <ChevronRight className="w-4 h-4" />}
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
        />
      ) : (
        <CustomerChat key={customer.id} customerId={customer.id} />
      )}
    </div>
  );
}

function CustomerChat({ customerId }: { customerId: number }) {
  const { data: ctx, isLoading, error, refetch } = useChatContext(customerId, true);

  if (isLoading) {
    return (
      <div className="p-4 flex flex-col gap-3">
        {[80, 50, 65].map((w, i) => (
          <div key={i} className="h-6 rounded bg-gray-200 animate-pulse" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  if (error || !ctx) {
    return (
      <div className="p-4 text-sm">
        <p className="text-red-600 mb-2">{(error as Error | null)?.message || "Không tải được dữ liệu chat"}</p>
        <button onClick={() => refetch()} className="text-brand hover:underline">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-1 min-w-0 min-h-0 flex-col">
        <details className="border-b min-[1440px]:hidden">
          <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase text-gray-500">
            Thông tin POS
          </summary>
          <div className="px-3 pb-3 max-h-64 overflow-y-auto">
            <ChatCustomerCard context={ctx} />
          </div>
        </details>
        <ChannelChat ctx={ctx} />
      </div>
      <div className="hidden min-[1440px]:block w-[300px] shrink-0 border-l overflow-y-auto p-3">
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Thông tin POS</h3>
        <ChatCustomerCard context={ctx} />
      </div>
    </div>
  );
}

function ChannelChat({ ctx }: { ctx: ChatContext }) {
  const userName = useAuthStore((s) => s.user?.name ?? "");
  const canSettings = useCan("settings", "update");
  const canSend = useCan("smax_chat", "send");
  const canManage = useCan("smax_chat", "manage_contacts");
  const { kind, groupId, pagePid, setKind, setGroupId, setPagePid } = useChatSidebarStore();
  const [managing, setManaging] = useState(false);
  const [adding, setAdding] = useState(false);

  const channels = ctx.myChannels;
  const usable = channels.filter((c) => !c.missing && c.platform === "zaloweb");
  const channel: ChatChannel | undefined =
    channels.find((c) => c.pagePid === pagePid && !c.missing) ??
    usable[0] ??
    channels.find((c) => !c.missing) ??
    channels[0];

  const settingsLink = canSettings ? (
    <Link href="/cai-dat/smax" className="text-brand font-medium hover:underline">
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
        Chưa hỗ trợ chat qua Zalo OA (<b>{channel.name}</b>) trong POS. Hãy liên kết thêm một kênh
        Zalo cá nhân. {settingsLink}
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

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        {usable.length >= 2 ? (
          <select
            value={channel.pagePid}
            onChange={(e) => setPagePid(e.target.value)}
            className="border rounded px-2 py-1 text-sm max-w-[180px]">
            {usable.map((c) => (
              <option key={c.pagePid} value={c.pagePid}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm">
            <span className="text-gray-500">Kênh: </span>
            <b>{channel.name}</b>
          </span>
        )}
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            channel.connectionError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}>
          {channel.connectionError ? "Mất kết nối" : "Hoạt động"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <div className="inline-flex rounded-md border overflow-hidden text-sm">
            <button
              onClick={() => {
                setKind("user");
                setAdding(false);
              }}
              title={user ? "" : "Khách chưa có ID Zalo"}
              className={`px-3 py-1 ${kind === "user" ? "bg-brand text-white" : "hover:bg-gray-50"} ${
                user ? "" : "text-gray-400"
              }`}>
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
              }`}>
              Nhóm
            </button>
          </div>
          <button
            onClick={() => setManaging(!managing)}
            title="ID Zalo của khách"
            className={`p-1.5 rounded ${managing ? "bg-cyan-bg text-brand" : "hover:bg-gray-100"}`}>
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
        {kind === "group" && groups.length >= 2 && (
          <select
            value={group?.id}
            onChange={(e) => setGroupId(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 text-sm">
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || "Nhóm"} · …{g.zaloId.slice(-6)}
              </option>
            ))}
          </select>
        )}
      </div>

      {channel.connectionError && (
        <div className="flex gap-2 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Kênh <b>{channel.name}</b> mất kết nối
            {channel.connectionError.note ? ` (${channel.connectionError.note})` : ""}
            {channel.connectionError.at
              ? ` từ ${new Date(channel.connectionError.at).toLocaleString("vi-VN")}`
              : ""}{" "}
            — làm mới kết nối trên Smax.
          </span>
        </div>
      )}
      {missingOthers.length > 0 && (
        <div className="bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          Kênh không còn trên Smax: {missingOthers.map((c) => c.name).join(", ")}
        </div>
      )}

      {managing ? (
        <div className="flex-1 overflow-y-auto p-3">
          <ZaloContactsManager customerId={ctx.customer.id} />
        </div>
      ) : contact ? (
        <ChatThread
          key={`${channel.pagePid}-${contact.id}`}
          customerId={ctx.customer.id}
          pagePid={channel.pagePid}
          channelName={channel.name}
          contact={contact}
          recipientLabel={recipientLabel}
          confirmBeforeSend={ctx.confirmBeforeSend}
          sendDisabledReason={sendDisabledReason}
          ctx={ctx}
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
                  className="px-3 py-1.5 rounded bg-brand text-white">
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
