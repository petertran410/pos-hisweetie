"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useCan } from "@/lib/hooks/useCan";
import { useChatContext, useDeleteZaloContact, useZaloProfile } from "@/lib/hooks/useSmaxChat";
import type { ZaloContact, ZaloContactKind } from "@/lib/types/smaxChat";
import { ZaloContactEditor } from "./ZaloContactEditor";
import { ZaloAvatar } from "./ZaloAvatar";
import { confirmAction } from "@/lib/chat/confirm";
import { SharedGroupsScanner } from "./SharedGroupsScanner";

/** Danh sách ID Zalo cá nhân + nhóm của khách (thêm/xóa). Dùng ở sidebar và chi tiết khách. */
export function ZaloContactsManager({ customerId }: { customerId: number }) {
  const canView = useCan("smax_chat", "view");
  const canManage = useCan("smax_chat", "manage_contacts");
  const { data: ctx, isLoading, error } = useChatContext(customerId, canView);
  const remove = useDeleteZaloContact(customerId);
  const [adding, setAdding] = useState<ZaloContactKind | null>(null);

  if (!canView) return null;
  if (isLoading) return <p className="text-sm text-gray-500">Đang tải…</p>;
  if (error || !ctx) {
    return <p className="text-sm text-red-600">{(error as Error | null)?.message || "Không tải được"}</p>;
  }

  const pagePid = ctx.myChannels.find((c) => c.platform === "zaloweb" && !c.missing)?.pagePid;
  const { user, groups } = ctx.contacts;

  const row = (c: ZaloContact, label: string) => (
    <ContactRow
      key={c.id}
      customerId={customerId}
      pagePid={pagePid}
      contact={c}
      label={label}
      onRemove={
        canManage
          ? () => {
              confirmAction(`Xóa ${label.toLowerCase()} ${c.zaloId} khỏi khách?`, {
                title: "Xóa ID Zalo",
                confirmText: "Xóa",
                danger: true,
              }).then((ok) => ok && remove.mutate(c.id));
            }
          : undefined
      }
    />
  );

  return (
    <div className="flex flex-col gap-4 text-sm">
      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Zalo cá nhân</h4>
        {user ? (
          <ul>{row(user, "Zalo cá nhân")}</ul>
        ) : adding === "user" ? (
          <ZaloContactEditor
            customerId={customerId}
            kind="user"
            pagePid={pagePid}
            defaultPhone={ctx.customer.phone}
            onDone={() => setAdding(null)}
          />
        ) : (
          <p className="text-gray-500">
            Chưa có.{" "}
            {canManage && (
              <button onClick={() => setAdding("user")} className="text-brand hover:underline">
                Thêm ID Zalo
              </button>
            )}
          </p>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Nhóm Zalo</h4>
        {groups.length > 0 && (
          <ul className="flex flex-col gap-1 mb-2">{groups.map((g) => row(g, "Nhóm Zalo"))}</ul>
        )}
        {adding === "group" ? (
          <ZaloContactEditor customerId={customerId} kind="group" onDone={() => setAdding(null)} />
        ) : (
          <p className="text-gray-500">
            {groups.length === 0 && "Chưa có. "}
            {canManage && (
              <button onClick={() => setAdding("group")} className="text-brand hover:underline">
                Thêm nhóm Zalo
              </button>
            )}
          </p>
        )}
        <div className="mt-3">
          <SharedGroupsScanner customerId={customerId} pagePid={pagePid} hasUserContact={!!user} />
        </div>
      </section>
    </div>
  );
}

/** Một ID Zalo của khách: avatar + tên Zalo thật (lấy từ hội thoại trên Smax). */
function ContactRow({
  customerId,
  pagePid,
  contact: c,
  label,
  onRemove,
}: {
  customerId: number;
  pagePid: string | undefined;
  contact: ZaloContact;
  label: string;
  onRemove?: () => void;
}) {
  const { data: p } = useZaloProfile(customerId, pagePid, c.id);
  return (
    <li className="flex items-center justify-between gap-2 rounded border px-3 py-2">
      <ZaloAvatar
        avatar={p?.avatar ?? null}
        isGroup={c.kind === "group"}
        members={p?.memberPreview}
        memberCount={p?.memberCount}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{p?.name || c.name || label}</span>
        <span className="block text-xs text-gray-500 break-all">
          ID: {c.zaloId}
          {c.kind === "group" && p?.memberCount ? ` · ${p.memberCount} thành viên` : ""}
        </span>
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Xóa"
          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
