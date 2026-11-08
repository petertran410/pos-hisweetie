"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, User, X } from "lucide-react";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useCustomersInViewStore } from "@/lib/store/customersInView";
import type { ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { LooseThread } from "@/lib/types/smaxChat";
import { RecentChatsList, type RecentChatTarget } from "./RecentChatsList";
import { useActiveChannel } from "@/lib/chat/channels";

interface Props {
  // target: mở đúng kênh / trực tiếp / nhóm (từ "Đang chat gần đây")
  onSelect: (customer: ChatCustomerRef, target?: RecentChatTarget | null) => void;
  // Mở hội thoại chưa gắn khách POS
  onOpenThread: (thread: LooseThread) => void;
}

/** Chọn khách: một ô tìm chung (khách POS + hội thoại), khách đang hiện trên màn hình, đang chat gần đây. */
export function ChatCustomerPicker({ onSelect, onOpenThread }: Props) {
  const entries = useCustomersInViewStore((s) => s.entries);
  const { channel } = useActiveChannel();
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching } = useSearchCustomers(search, {
    enabled: search.length >= 2,
  });

  // Mới đăng ký (màn vừa mở) lên đầu; gộp cùng khách, nối nguồn
  const suggestions = useMemo(() => {
    const byId = new Map<number, ChatCustomerRef & { sources: string[] }>();
    for (const e of Object.values(entries).reverse()) {
      const cur = byId.get(e.id);
      if (cur) {
        if (!cur.sources.includes(e.source)) cur.sources.push(e.source);
      } else {
        byId.set(e.id, { id: e.id, code: e.code, name: e.name, sources: [e.source] });
      }
    }
    return [...byId.values()];
  }, [entries]);

  const term = input.trim();
  const searching = term.length >= 2;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Một ô tìm chung: khách POS (mã, tên, SĐT) + hội thoại / nhóm theo tên */}
      <div className="sticky top-0 z-10 border-b bg-white px-3 py-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && input && (e.preventDefault(), setInput(""))}
            placeholder="Tìm khách POS (mã, tên, SĐT) hoặc hội thoại"
            aria-label="Tìm khách POS hoặc hội thoại"
            className="w-full border rounded-md pl-9 pr-8 py-2 text-sm outline-none focus:border-brand max-lg:text-base"
          />
          {input && (
            <button
              onClick={() => setInput("")}
              aria-label="Xoá tìm kiếm"
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-gray-500 hover:bg-gray-100">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-3">
        {searching ? (
          <section aria-label="Khách POS khớp tìm kiếm">
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Khách POS</h3>
            {search !== term || (isFetching && !data) ? (
              <p className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tìm khách…
              </p>
            ) : !data?.data?.length ? (
              <p className="px-2 py-1.5 text-sm text-gray-500">Không tìm thấy khách POS khớp “{term}”.</p>
            ) : (
              <ul className="flex flex-col">
                {data.data.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelect({ id: c.id, code: c.code, name: c.name })}
                      className="w-full flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cyan-bg">
                      <User className="w-4 h-4 mt-0.5 text-brand shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {c.code} · {c.name}
                        </span>
                        {(c.contactNumber || c.phone) && (
                          <span className="block text-xs text-gray-500">{c.contactNumber || c.phone}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          suggestions.length > 0 && (
            <section aria-label="Khách đang xem trên màn hình">
              <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Đang xem trên màn hình</h3>
              <ul className="flex flex-col">
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelect({ id: c.id, code: c.code, name: c.name })}
                      className="w-full flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-cyan-bg">
                      <User className="w-4 h-4 mt-0.5 text-brand shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {c.code ? `${c.code} · ` : ""}
                          {c.name}
                        </span>
                        <span className="block text-xs text-gray-500 truncate">{c.sources.join(", ")}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}

        <RecentChatsList
          pagePid={channel?.pagePid}
          query={input}
          onOpen={(c, target) => onSelect(c, target)}
          onOpenThread={onOpenThread}
        />
      </div>
    </div>
  );
}
