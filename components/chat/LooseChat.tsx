"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { apiClient } from "@/lib/config/api";
import type { CustomerSearchResult } from "@/lib/types/customer";
import { useCan } from "@/lib/hooks/useCan";
import { useAuthStore } from "@/lib/store/auth";
import { useChatSidebarStore, type ChatCustomerRef } from "@/lib/store/chatSidebar";
import { useCustomersInViewStore } from "@/lib/store/customersInView";
import { useActiveChannel } from "@/lib/chat/channels";
import { looseSource } from "@/lib/chat/threadSource";
import { platformLabel } from "@/lib/chat/platforms";
import type { LinkedCustomer, LooseThread } from "@/lib/types/smaxChat";
import { ChatThread } from "./ChatThread";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { LEAD_FIRST_PLATFORMS, PLATFORM_TO_SOURCE } from "@/lib/leads/constants";
import Link from "next/link";
import { CustomerSearchSelect, linkGroupCustomers } from "./GroupCustomersBar";

// Hội thoại đã ẩn thanh "Gắn khách POS / Tạo lead" (không cần gắn) — theo trình duyệt
const HIDDEN_BAR_KEY = "chat-link-bar-hidden";

function readHiddenBars(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(HIDDEN_BAR_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeHiddenBars(keys: string[]) {
  try {
    localStorage.setItem(HIDDEN_BAR_KEY, JSON.stringify(keys));
  } catch {
    // localStorage bị chặn — chỉ ẩn trong phiên này
  }
}

/**
 * Hội thoại Zalo chưa gắn khách POS: vẫn xem/gửi tin được, thanh "Gắn khách POS"
 * ở trên cùng (gợi ý theo mã khách trong tên nhóm, khách đang xem, tìm khách).
 * Hội thoại không cần gắn: bấm ✕ để ẩn thanh, nút trên header để hiện lại.
 */
export function LooseChat({ thread }: { thread: LooseThread }) {
  const source = useMemo(() => looseSource(thread), [thread]);
  const { channel } = useActiveChannel();
  const canSend = useCan("smax_chat", "send");
  // Cùng key với ChatThreadHeader → dùng chung cache
  const { data: profile } = useQuery({
    queryKey: ["smaxZaloProfile", source.key],
    queryFn: () => source.fetchProfile(),
    staleTime: 60_000,
    retry: false,
  });
  const name = profile?.name || thread.name || thread.zaloId;
  const [hiddenBars, setHiddenBars] = useState(readHiddenBars);
  const barHidden = hiddenBars.includes(source.key);
  const setBarHidden = (hide: boolean) => {
    const next = hiddenBars.filter((k) => k !== source.key);
    if (hide) next.push(source.key);
    setHiddenBars(next);
    writeHiddenBars(next);
  };

  const sendDisabledReason = !canSend
    ? "Bạn không có quyền gửi tin Zalo"
    : channel?.connectionError
      ? "Kênh đang mất kết nối — không gửi được"
      : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {!barHidden && <LinkCustomerBar thread={thread} zaloName={name} onHide={() => setBarHidden(true)} />}
      <ChatThread
        key={source.key}
        source={source}
        channelName={channel?.name ?? ""}
        recipientLabel={`${
          (thread.platform ?? "zaloweb") === "zaloweb" ? "" : `${platformLabel(thread.platform)} · `
        }${thread.isGroup ? "Nhóm " : ""}${name} (ID ${thread.zaloId}) — chưa gắn khách POS`}
        confirmBeforeSend={profile?.confirmBeforeSend ?? true}
        sendDisabledReason={sendDisabledReason}
        ctx={null}
        headerActions={
          barHidden && (
            <button
              onClick={() => setBarHidden(false)}
              title="Hiện thanh gắn khách POS / tạo lead"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-brand">
              <UserPlus className="h-4 w-4" />
            </button>
          )
        }
      />
    </div>
  );
}

const nameTokens = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/**
 * Khách POS khớp tên Zalo / tên nhóm nhất. Tìm theo cả tên, không có thì bỏ đoạn đầu trước " - "
 * ("Diệp Trà - <tên khách>"), rồi bỏ đoạn cuối sau " - " ("<tên khách> - Diệp Trà").
 * Tìm khách bắt buộc khớp mọi từ, nên chọn khách
 * có ít từ thừa nhất; bỏ qua khi tên khách dài gấp đôi trở lên (khớp quá lỏng).
 */
async function guessCustomerByName(zaloName: string): Promise<ChatCustomerRef | null> {
  const name = zaloName.trim();
  const first = name.indexOf(" - ");
  const last = name.lastIndexOf(" - ");
  const queries = first > 0 ? [name, name.slice(first + 3), name.slice(0, last)] : [name];
  for (const q of new Set(queries)) {
    const qn = nameTokens(q).length;
    if (qn === 0) continue;
    const res = await apiClient.get<{ data: CustomerSearchResult[] }>("/customers/search", { search: q });
    let best: CustomerSearchResult | null = null;
    let bestScore = 0;
    for (const c of res.data ?? []) {
      const score = qn / Math.max(qn, nameTokens(c.name).length);
      if (score > bestScore) [best, bestScore] = [c, score];
    }
    if (best && bestScore > 0.5) return { id: best.id, code: best.code, name: best.name };
  }
  return null;
}

function LinkCustomerBar({
  thread,
  zaloName,
  onHide,
}: {
  thread: LooseThread;
  zaloName: string;
  onHide: () => void;
}) {
  const canManage = useCan("smax_chat", "manage_contacts");
  const canCreateLead = useCan("leads", "update");
  const { channels } = useActiveChannel();
  const [creatingLead, setCreatingLead] = useState(false);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const inView = useCustomersInViewStore((s) => s.entries);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  // Facebook / Tiktok: ưu tiên tạo lead; phần gắn khách POS chỉ hiện khi SĐT trùng khách (gợi ý) hoặc bấm mở
  const leadFirst = LEAD_FIRST_PLATFORMS.has(thread.platform ?? "") && !thread.isGroup;
  const [showLink, setShowLink] = useState(false);
  const linkMode = !leadFirst || !!thread.suggestion || showLink;
  const { data: byName } = useQuery({
    queryKey: ["chatLinkByName", zaloName],
    queryFn: () => guessCustomerByName(zaloName),
    enabled: canManage && linkMode && !thread.suggestion && zaloName.trim().length >= 2,
    staleTime: 5 * 60_000,
  });

  // Gợi ý: khớp mã trong tên nhóm, khớp tên Zalo / tên nhóm, rồi khách đang mở trên màn hình bên trái
  const primary = thread.suggestion ?? byName ?? null;
  const suggestions = useMemo(() => {
    const out: ChatCustomerRef[] = [];
    if (primary) out.push(primary);
    for (const e of Object.values(inView).reverse())
      if (!out.some((c) => c.id === e.id)) out.push({ id: e.id, code: e.code, name: e.name });
    return out.slice(0, 4);
  }, [primary, inView]);

  // Nhóm: gắn được nhiều khách (vd nhóm chung các chi nhánh); chat cá nhân: 1 khách
  const link = async (picked: ChatCustomerRef[]) => {
    if (!picked.length) return;
    setBusy(true);
    try {
      let linked: LinkedCustomer[];
      if (thread.isGroup) {
        linked = await linkGroupCustomers(picked, { zaloId: thread.zaloId, name: zaloName || undefined });
      } else {
        // Kênh khác Zalo cá nhân: lưu tid hội thoại kèm kênh (ID khách riêng theo từng trang)
        const zaloweb = (thread.platform ?? "zaloweb") === "zaloweb";
        const contact = await smaxChatApi.createContact(picked[0].id, {
          kind: "user",
          zaloId: zaloweb ? thread.zaloId : thread.tid,
          name: zaloName || undefined,
          ...(zaloweb ? {} : { pagePid: thread.pagePid }),
        });
        linked = [{ ...picked[0], contactId: contact.id }];
      }
      if (!linked.length) return;
      toast.success(
        `Đã gắn ${thread.isGroup ? "nhóm" : "Zalo"} "${zaloName}" cho ${
          linked.length > 1 ? `${linked.length} khách` : (linked[0].code ?? linked[0].name)
        }`,
      );
      queryClient.invalidateQueries({ queryKey: ["smaxRecentChats"] });
      // Chuyển sang chat theo khách đầu tiên (selectCustomer xoá trạng thái chưa gắn)
      const first = linked[0];
      const st = useChatSidebarStore.getState();
      st.selectCustomer({ id: first.id, code: first.code, name: first.name }, userId);
      st.setPagePid(thread.pagePid);
      st.setKind(thread.isGroup ? "group" : "user");
      st.setGroupId(thread.isGroup ? first.contactId : null);
    } catch (e) {
      toast.error((e as Error).message || "Không gắn được khách POS");
    } finally {
      setBusy(false);
    }
  };

  const hideButton = (
    <button
      onClick={onHide}
      title="Ẩn thanh này — hội thoại không cần gắn khách / tạo lead"
      aria-label="Ẩn thanh gắn khách POS"
      className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-black/5 hover:text-gray-600">
      <X className="h-3.5 w-3.5" />
    </button>
  );

  const leadForm = creatingLead && (
    <LeadFormModal
      initial={{
        name: zaloName,
        phone: thread.phones?.[0]?.replace(/^\+?84(?=\d{9}$)/, "0"),
        source: PLATFORM_TO_SOURCE[thread.platform ?? "zaloweb"],
        channelPid: thread.pagePid,
        channelName: channels.find((c) => c.pagePid === thread.pagePid)?.name,
        conversation: {
          pagePid: thread.pagePid,
          tid: thread.tid,
          platform: thread.platform ?? "zaloweb",
          isGroup: thread.isGroup,
          name: zaloName,
        },
      }}
      onClose={() => setCreatingLead(false)}
      onSaved={(lead) => {
        // Hội thoại đang mở mang nhãn lead ngay (không chờ tải lại danh sách)
        const st = useChatSidebarStore.getState();
        if (st.loose?.tid === thread.tid) st.openLoose({ ...thread, lead: { id: lead.id, name: lead.name, status: lead.status } }, userId);
      }}
    />
  );

  if (!linkMode) {
    return (
      <div className="flex items-center gap-2 border-b bg-violet-50 px-3 py-2 text-sm">
        <UserPlus className="h-4 w-4 shrink-0 text-violet-700" />
        <span className="flex-1 font-medium text-violet-900">
          {thread.lead
            ? "Khách tiềm năng đã có lead — CSKH chăm sóc rồi chuyển cho Sale"
            : "Khách tiềm năng — tạo lead để CSKH chăm sóc và chuyển cho Sale"}
        </span>
        {thread.lead ? (
          <Link
            href={`/khach-hang/lead?id=${thread.lead.id}`}
            className="shrink-0 rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700 hover:underline">
            Lead · {thread.lead.name}
          </Link>
        ) : (
          canCreateLead && (
            <button
              onClick={() => setCreatingLead(true)}
              className="shrink-0 rounded-md bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700">
              + Tạo lead
            </button>
          )
        )}
        {canManage && (
          <button
            onClick={() => setShowLink(true)}
            title="Khách đã mua hàng — gắn hội thoại vào khách POS"
            className="shrink-0 text-xs text-gray-500 hover:text-brand hover:underline">
            Gắn khách POS
          </button>
        )}
        {hideButton}
        {leadForm}
      </div>
    );
  }

  return (
    <div className="border-b bg-amber-50 px-3 py-2 text-sm">
      <p className="mb-1.5 flex items-center gap-1.5 font-medium text-amber-900">
        <UserPlus className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {leadFirst && thread.suggestion
            ? "SĐT trùng khách POS — gắn để xem công nợ, đơn hàng và gửi nhanh thông tin"
            : "Hội thoại chưa gắn khách POS — gắn để xem công nợ, đơn hàng và gửi nhanh thông tin"}
        </span>
        {thread.lead ? (
          <Link
            href={`/khach-hang/lead?id=${thread.lead.id}`}
            className="shrink-0 rounded-md bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 hover:underline">
            Lead · {thread.lead.name}
          </Link>
        ) : (
          canCreateLead &&
          !thread.isGroup && (
            <button
              onClick={() => setCreatingLead(true)}
              title="Khách tiềm năng chưa có đơn — tạo lead mang sẵn hội thoại này"
              className="shrink-0 rounded-md border border-violet-300 bg-white px-2 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-50">
              + Tạo lead
            </button>
          )
        )}
        {hideButton}
      </p>
      {leadForm}
      {!canManage ? (
        <p className="text-xs text-amber-800">Bạn chưa có quyền quản lý ID Zalo của khách để gắn.</p>
      ) : (
        <>
          {thread.isGroup && (
            <p className="mb-1 text-xs text-amber-800">Nhóm dùng chung nhiều khách: tick chọn đủ các khách rồi bấm Gắn.</p>
          )}
          <CustomerSearchSelect suggestions={suggestions} multi={thread.isGroup} busy={busy} onConfirm={link} />
        </>
      )}
    </div>
  );
}
