"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, User } from "lucide-react";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useCustomersInViewStore } from "@/lib/store/customersInView";
import type { ChatCustomerRef } from "@/lib/store/chatSidebar";
import { RecentChatsList, type RecentChatTarget } from "./RecentChatsList";
import { useActiveChannel } from "@/lib/chat/channels";

interface Props {
  // target: mở đúng kênh / trực tiếp / nhóm (từ "Đang chat gần đây")
  onSelect: (customer: ChatCustomerRef, target?: RecentChatTarget | null) => void;
}

/** Chọn khách: khách đang hiển thị trên màn hình, đang chat gần đây, hoặc tìm khách khác. */
export function ChatCustomerPicker({ onSelect }: Props) {
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

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Đang xem trên màn hình
        </h3>
        {suggestions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Chưa có khách nào trên màn hình — tìm khách để bắt đầu.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {suggestions.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect({ id: c.id, code: c.code, name: c.name })}
                  className="w-full flex items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-cyan-bg border border-transparent hover:border-brand-border">
                  <User className="w-4 h-4 mt-0.5 text-brand shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {c.code ? `${c.code} · ` : ""}
                      {c.name}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {c.sources.join(", ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">
          Tìm khách khác
        </h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mã, tên hoặc SĐT khách"
            className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        {search.length >= 2 && (
          <ul className="mt-2 flex flex-col gap-1">
            {isFetching && !data && (
              <li className="text-sm text-gray-500 px-3 py-2">Đang tìm…</li>
            )}
            {data?.data?.length === 0 && (
              <li className="text-sm text-gray-500 px-3 py-2">Không tìm thấy khách</li>
            )}
            {data?.data?.slice(0, 20).map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect({ id: c.id, code: c.code, name: c.name })}
                  className="w-full rounded-md px-3 py-2 text-left hover:bg-cyan-bg">
                  <span className="block text-sm font-medium truncate">
                    {c.code} · {c.name}
                  </span>
                  {(c.contactNumber || c.phone) && (
                    <span className="block text-xs text-gray-500">
                      {c.contactNumber || c.phone}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RecentChatsList pagePid={channel?.pagePid} onOpen={(c, target) => onSelect(c, target)} />
    </div>
  );
}
