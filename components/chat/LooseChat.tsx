"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
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
import type { LinkedCustomer, LooseThread } from "@/lib/types/smaxChat";
import { ChatThread } from "./ChatThread";
import { CustomerSearchSelect, linkGroupCustomers } from "./GroupCustomersBar";

/**
 * Hội thoại Zalo chưa gắn khách POS: vẫn xem/gửi tin được, thanh "Gắn khách POS"
 * luôn ở trên cùng (gợi ý theo mã khách trong tên nhóm, khách đang xem, tìm khách).
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

  const sendDisabledReason = !canSend
    ? "Bạn không có quyền gửi tin Zalo"
    : channel?.connectionError
      ? "Kênh đang mất kết nối — không gửi được"
      : null;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <LinkCustomerBar thread={thread} zaloName={name} />
      <ChatThread
        key={source.key}
        source={source}
        channelName={channel?.name ?? ""}
        recipientLabel={`${thread.isGroup ? "Nhóm " : ""}${name} (ID ${thread.zaloId}) — chưa gắn khách POS`}
        confirmBeforeSend={profile?.confirmBeforeSend ?? true}
        sendDisabledReason={sendDisabledReason}
        ctx={null}
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

function LinkCustomerBar({ thread, zaloName }: { thread: LooseThread; zaloName: string }) {
  const canManage = useCan("smax_chat", "manage_contacts");
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const inView = useCustomersInViewStore((s) => s.entries);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const { data: byName } = useQuery({
    queryKey: ["chatLinkByName", zaloName],
    queryFn: () => guessCustomerByName(zaloName),
    enabled: canManage && !thread.suggestion && zaloName.trim().length >= 2,
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
        const contact = await smaxChatApi.createContact(picked[0].id, {
          kind: "user",
          zaloId: thread.zaloId,
          name: zaloName || undefined,
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

  return (
    <div className="border-b bg-amber-50 px-3 py-2 text-sm">
      <p className="mb-1.5 flex items-center gap-1.5 font-medium text-amber-900">
        <UserPlus className="h-4 w-4 shrink-0" />
        Hội thoại chưa gắn khách POS — gắn để xem công nợ, đơn hàng và gửi nhanh thông tin
      </p>
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
