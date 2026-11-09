"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link2, Search, X } from "lucide-react";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";

/** Tìm khách POS bất kỳ (mã, tên, SĐT) để gắn lead — khi SĐT / ID Zalo không khớp. */
export function LinkCustomerModal({
  leadName,
  onPick,
  onClose,
}: {
  leadName: string;
  onPick: (customer: { id: number; code: string | null; name: string }) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const { data, isFetching } = useSearchCustomers(search, { enabled: search.length >= 2 });

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand" />
            Gắn lead &quot;{leadName}&quot; với khách
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mã, tên hoặc SĐT khách"
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          {search.length >= 2 && (
            <ul className="flex flex-col gap-1">
              {isFetching && !data && <li className="text-sm text-gray-500 px-3 py-2">Đang tìm…</li>}
              {data?.data?.length === 0 && <li className="text-sm text-gray-500 px-3 py-2">Không tìm thấy khách</li>}
              {data?.data?.slice(0, 20).map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onPick({ id: c.id, code: c.code, name: c.name })}
                    className="w-full rounded-md px-3 py-2 text-left hover:bg-cyan-bg">
                    <span className="block text-sm font-medium truncate">
                      {c.code} · {c.name}
                    </span>
                    {(c.contactNumber || c.phone) && (
                      <span className="block text-xs text-gray-500">{c.contactNumber || c.phone}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
