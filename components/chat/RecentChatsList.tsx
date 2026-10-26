"use client";

import { useState } from "react";
import { Loader2, RotateCw, User, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useRecentChats } from "@/lib/hooks/useSmaxChat";
import type { ChatCustomerRef } from "@/lib/store/chatSidebar";
import type { RecentChat, ZaloContactKind } from "@/lib/types/smaxChat";

const COLLAPSED = 8;

export interface RecentChatTarget {
  pagePid: string;
  kind: ZaloContactKind;
  // Nhóm cần mở (contact id) khi kind = group
  groupId: number | null;
}

interface Props {
  onOpen: (customer: ChatCustomerRef, target: RecentChatTarget | null) => void;
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

/** Hội thoại mới nhất trên kênh Zalo của tôi, khớp với khách POS để mở nhanh. */
export function RecentChatsList({ onOpen }: Props) {
  const { data, isLoading, isFetching, error, refetch } = useRecentChats(true);
  const canManage = useCan("smax_chat", "manage_contacts");
  const [linking, setLinking] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const items = data?.items ?? [];
  const matched = items.filter((i) => i.match);
  const unmatched = items.length - matched.length;

  const open = async (c: RecentChat) => {
    if (!c.match) return;
    const kind: ZaloContactKind = c.isGroup ? "group" : "user";
    if (c.match.type === "linked") {
      onOpen(c.match.customer, {
        pagePid: c.pagePid,
        kind: c.match.kind,
        groupId: c.match.kind === "group" ? c.match.contactId : null,
      });
      return;
    }
    // Khớp theo mã khách trong tên nhóm: lưu ID Zalo cho khách rồi mở (cần quyền quản lý ID Zalo)
    if (!canManage) {
      onOpen(c.match.customer, null);
      return;
    }
    setLinking(c.tid);
    try {
      const contact = await smaxChatApi.createContact(c.match.customer.id, {
        kind,
        zaloId: c.zaloId,
        name: c.name || undefined,
      });
      toast.success(`Đã gắn ${c.isGroup ? "nhóm" : "Zalo"} "${c.name}" cho ${c.match.customer.code ?? c.match.customer.name}`);
      refetch();
      onOpen(c.match.customer, {
        pagePid: c.pagePid,
        kind,
        groupId: kind === "group" ? contact.id : null,
      });
    } catch (e) {
      toast.error((e as Error).message || "Không gắn được hội thoại cho khách");
    } finally {
      setLinking(null);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-gray-500">Đang chat gần đây</h3>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          title="Tải lại"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50">
          <RotateCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-500">Đang tải hội thoại…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{(error as Error).message || "Không tải được hội thoại"}</p>
      ) : matched.length === 0 ? (
        <p className="text-sm text-gray-500">Chưa có hội thoại gần đây gắn với khách POS.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {(showAll ? matched : matched.slice(0, COLLAPSED)).map((c) => {
            const m = c.match!;
            const Icon = c.isGroup ? UsersRound : User;
            return (
              <li key={c.tid}>
                <button
                  onClick={() => open(c)}
                  disabled={linking === c.tid}
                  className="w-full flex items-start gap-2 rounded-md px-3 py-2 text-left hover:bg-cyan-bg border border-transparent hover:border-brand-border disabled:opacity-60">
                  <Icon className="w-4 h-4 mt-0.5 text-brand shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`truncate text-sm ${c.unread ? "font-semibold" : "font-medium"}`}>
                        {m.customer.code ? `${m.customer.code} · ` : ""}
                        {m.customer.name}
                      </span>
                      <span className="ml-auto shrink-0 text-[11px] text-gray-400">{ago(c.lastMessageAt)}</span>
                      {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" title="Chưa đọc" />}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {c.isGroup ? `${c.name}: ` : ""}
                      {c.lastMessage || "…"}
                    </span>
                    {m.type === "byCode" && (
                      <span className="block text-[11px] text-amber-700">
                        {linking === c.tid ? (
                          <>
                            <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                            Đang gắn nhóm cho khách…
                          </>
                        ) : canManage ? (
                          "Khớp theo mã khách trong tên nhóm — bấm để gắn nhóm và mở"
                        ) : (
                          "Khớp theo mã khách trong tên nhóm (chưa gắn nhóm)"
                        )}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {matched.length > COLLAPSED && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-1 px-1 text-xs text-brand hover:underline">
          {showAll ? "Thu gọn" : `Xem thêm ${matched.length - COLLAPSED} hội thoại`}
        </button>
      )}
      {!isLoading && unmatched > 0 && (
        <p className="mt-1 px-1 text-[11px] text-gray-400">
          {unmatched} hội thoại gần đây chưa gắn với khách POS (thêm ID Zalo/nhóm cho khách để hiện ở đây).
        </p>
      )}
    </section>
  );
}
