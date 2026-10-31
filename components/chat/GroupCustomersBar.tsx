"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Link2, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import type { ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { LinkedCustomer } from "@/lib/types/smaxChat";

/**
 * Gắn 1 nhóm Zalo cho nhiều khách POS (mỗi khách 1 dòng ID Zalo). Khách đã gắn sẵn
 * (trùng) bỏ qua; trả về các khách gắn được kèm contactId.
 */
export async function linkGroupCustomers(
  customers: ChatCustomerRef[],
  group: { zaloId: string; name?: string },
): Promise<LinkedCustomer[]> {
  const linked: LinkedCustomer[] = [];
  for (const c of customers) {
    try {
      const contact = await smaxChatApi.createContact(c.id, { kind: "group", zaloId: group.zaloId, name: group.name });
      linked.push({ ...c, contactId: contact.id });
    } catch (e) {
      toast.error(`${c.code ?? c.name}: ${(e as Error).message || "không gắn được"}`);
    }
  }
  return linked;
}

/**
 * Nhãn ngắn cho các khách cùng nhóm: bỏ phần đầu/cuối tên trùng nhau
 * ("Little Cam (NTMK) - Quận 1, HCM (Sale 4)" → "NTMK - Quận 1").
 */
export function shortCustomerLabels(names: string[]): string[] {
  if (names.length < 2) return names;
  const words = names.map((n) => n.trim().split(/\s+/));
  const shortest = Math.min(...words.map((w) => w.length));
  let head = 0;
  while (head < shortest - 1 && words.every((w) => w[head] === words[0][head])) head++;
  let tail = 0;
  while (
    tail < shortest - head - 1 &&
    words.every((w) => w[w.length - 1 - tail] === words[0][words[0].length - 1 - tail])
  )
    tail++;
  return words.map((w, i) => {
    const label = w
      .slice(head, w.length - tail)
      .join(" ")
      .replace(/[()]/g, "")
      .replace(/^[\s,–-]+|[\s,–-]+$/g, "");
    return label || names[i];
  });
}

/**
 * Chọn khách POS: gợi ý + tìm theo mã/tên/SĐT. multi = bấm để tick nhiều khách rồi
 * bấm "Gắn N khách"; không multi = bấm là gắn luôn.
 */
export function CustomerSearchSelect({
  suggestions = [],
  exclude = [],
  multi,
  busy,
  onConfirm,
}: {
  suggestions?: ChatCustomerRef[];
  exclude?: number[];
  multi: boolean;
  busy: boolean;
  onConfirm: (customers: ChatCustomerRef[]) => void;
}) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<ChatCustomerRef[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const { data, isFetching } = useSearchCustomers(search, { enabled: search.length >= 2 });

  const isPicked = (id: number) => picked.some((c) => c.id === id);
  const toggle = (c: ChatCustomerRef) => {
    if (!multi) return onConfirm([c]);
    setPicked((p) => (isPicked(c.id) ? p.filter((x) => x.id !== c.id) : [...p, c]));
  };
  const visible = (list: ChatCustomerRef[]) => list.filter((c) => !exclude.includes(c.id));

  const row = (c: ChatCustomerRef, primary = false) => {
    const on = isPicked(c.id);
    return (
      <button
        key={c.id}
        onClick={() => toggle(c)}
        disabled={busy}
        className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-50 ${
          on || (primary && !multi)
            ? "bg-brand text-white"
            : "border border-brand-border bg-white text-brand hover:bg-cyan-bg"
        }`}>
        {multi ? (
          <Check className={`h-3 w-3 shrink-0 ${on ? "" : "opacity-30"}`} />
        ) : busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Link2 className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate">
          {multi ? "" : "Gắn "}
          {c.code ? `${c.code} · ` : ""}
          {c.name}
        </span>
      </button>
    );
  };

  const results = visible((data?.data ?? []).slice(0, 8).map((c) => ({ id: c.id, code: c.code, name: c.name })));
  // Khách đã tick mà không còn trong gợi ý / kết quả tìm vẫn hiện để bỏ tick được
  const shownIds = new Set([...visible(suggestions), ...results].map((c) => c.id));
  const pickedHidden = picked.filter((c) => !shownIds.has(c.id));

  return (
    <div>
      {(visible(suggestions).length > 0 || pickedHidden.length > 0) && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {visible(suggestions).map((c, i) => row(c, i === 0))}
          {pickedHidden.map((c) => row(c))}
        </div>
      )}
      <div className="flex gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={multi ? "Tìm khách POS theo mã, tên, SĐT — chọn nhiều khách" : "Tìm khách POS theo mã, tên, SĐT để gắn"}
            className="w-full rounded-md border bg-white py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand"
          />
        </div>
        {multi && (
          <button
            onClick={() => onConfirm(picked)}
            disabled={busy || picked.length === 0}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand px-2.5 text-xs font-medium text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
            Gắn {picked.length || ""} khách
          </button>
        )}
      </div>
      {search.length >= 2 && (
        <div className="mt-1 flex max-h-28 flex-col items-start gap-1 overflow-y-auto">
          {isFetching && !data && <span className="text-xs text-gray-500">Đang tìm…</span>}
          {data && results.length === 0 && <span className="text-xs text-gray-500">Không tìm thấy khách</span>}
          {results.map((c) => row(c))}
        </div>
      )}
    </div>
  );
}

/**
 * Nhóm Zalo gắn nhiều khách: chip chọn khách đang xem (thông tin POS, gửi nhanh công nợ/QR/đơn
 * theo khách này) và gắn thêm khách.
 */
export function GroupCustomersBar({
  group,
  customers,
  currentId,
  onSelect,
}: {
  group: { zaloId: string; name: string | null };
  // Mọi khách gắn nhóm, gồm khách đang chọn
  customers: LinkedCustomer[];
  currentId: number;
  onSelect: (c: LinkedCustomer) => void;
}) {
  const canManage = useCan("smax_chat", "manage_contacts");
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const labels = shortCustomerLabels(customers.map((c) => c.name));

  const add = async (picked: ChatCustomerRef[]) => {
    setBusy(true);
    const added = await linkGroupCustomers(picked, { zaloId: group.zaloId, name: group.name ?? undefined });
    setBusy(false);
    if (!added.length) return;
    toast.success(`Đã gắn nhóm cho ${added.length} khách`);
    queryClient.invalidateQueries({ queryKey: ["smaxChatContext"] });
    queryClient.invalidateQueries({ queryKey: ["smaxRecentChats"] });
    setAdding(false);
  };

  const chip = (active: boolean) =>
    `shrink-0 max-w-[11rem] truncate rounded-full px-2 py-0.5 text-xs ${
      active ? "bg-brand text-white" : "border bg-white text-gray-700 hover:bg-cyan-bg"
    }`;

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
        {customers.length > 1 &&
          customers.map((c, i) => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              title={`${c.code ? `${c.code} · ` : ""}${c.name}`}
              className={chip(c.id === currentId)}>
              {labels[i]}
            </button>
          ))}
        {canManage && (
          <button
            onClick={() => setAdding(!adding)}
            title={adding ? "Đóng" : "Gắn nhóm này cho thêm khách POS (vd các chi nhánh dùng chung nhóm)"}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-xs text-brand hover:bg-cyan-bg">
            {adding ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {adding ? "Đóng" : customers.length > 1 ? "Gắn thêm" : "Gắn thêm khách"}
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-1 rounded-md border bg-gray-50 p-2">
          <CustomerSearchSelect multi busy={busy} exclude={customers.map((c) => c.id)} onConfirm={add} />
        </div>
      )}
    </div>
  );
}
