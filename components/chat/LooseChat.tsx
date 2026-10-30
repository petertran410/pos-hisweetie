"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { apiClient } from "@/lib/config/api";
import type { CustomerSearchResult } from "@/lib/types/customer";
import { useCan } from "@/lib/hooks/useCan";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useAuthStore } from "@/lib/store/auth";
import { useChatSidebarStore, type ChatCustomerRef } from "@/lib/store/chatSidebar";
import { useCustomersInViewStore } from "@/lib/store/customersInView";
import { useActiveChannel } from "@/lib/chat/channels";
import { looseSource } from "@/lib/chat/threadSource";
import type { LooseThread } from "@/lib/types/smaxChat";
import { ChatThread } from "./ChatThread";

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
 * (tên nhóm thường là "Diệp Trà - <tên khách>"). Tìm khách bắt buộc khớp mọi từ, nên chọn khách
 * có ít từ thừa nhất; bỏ qua khi tên khách dài gấp đôi trở lên (khớp quá lỏng).
 */
async function guessCustomerByName(zaloName: string): Promise<ChatCustomerRef | null> {
  const name = zaloName.trim();
  const dash = name.indexOf(" - ");
  for (const q of dash > 0 ? [name, name.slice(dash + 3)] : [name]) {
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
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const { data, isFetching } = useSearchCustomers(search, { enabled: search.length >= 2 });
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

  const link = async (c: ChatCustomerRef) => {
    setLinking(c.id);
    try {
      const contact = await smaxChatApi.createContact(c.id, {
        kind: thread.isGroup ? "group" : "user",
        zaloId: thread.zaloId,
        name: zaloName || undefined,
      });
      toast.success(`Đã gắn ${thread.isGroup ? "nhóm" : "Zalo"} "${zaloName}" cho ${c.code ?? c.name}`);
      queryClient.invalidateQueries({ queryKey: ["smaxRecentChats"] });
      // Chuyển sang chat theo khách (selectCustomer xoá trạng thái chưa gắn)
      const st = useChatSidebarStore.getState();
      st.selectCustomer(c, userId);
      st.setPagePid(thread.pagePid);
      st.setKind(thread.isGroup ? "group" : "user");
      st.setGroupId(thread.isGroup ? contact.id : null);
    } catch (e) {
      toast.error((e as Error).message || "Không gắn được khách POS");
    } finally {
      setLinking(null);
    }
  };

  const row = (c: ChatCustomerRef, primary = false) => (
    <button
      key={c.id}
      onClick={() => link(c)}
      disabled={!canManage || linking !== null}
      className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-50 ${
        primary ? "bg-brand text-white" : "border border-brand-border bg-white text-brand hover:bg-cyan-bg"
      }`}>
      {linking === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3 shrink-0" />}
      <span className="truncate">
        Gắn {c.code ? `${c.code} · ` : ""}
        {c.name}
      </span>
    </button>
  );

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
          {suggestions.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1">
              {suggestions.map((c, i) => row(c, i === 0 && !!primary))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tìm khách POS theo mã, tên, SĐT để gắn"
              className="w-full rounded-md border bg-white py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand"
            />
          </div>
          {search.length >= 2 && (
            <div className="mt-1 flex max-h-28 flex-col gap-1 overflow-y-auto">
              {isFetching && !data && <span className="text-xs text-gray-500">Đang tìm…</span>}
              {data?.data?.length === 0 && <span className="text-xs text-gray-500">Không tìm thấy khách</span>}
              {data?.data?.slice(0, 8).map((c) => row({ id: c.id, code: c.code, name: c.name }))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
