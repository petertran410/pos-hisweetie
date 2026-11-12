"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { useCan } from "@/lib/hooks/useCan";
import { useChatContext, useDeleteZaloContact, useZaloProfile } from "@/lib/hooks/useSmaxChat";
import type { ZaloContact, ZaloContactKind } from "@/lib/types/smaxChat";
import { ZaloContactEditor } from "./ZaloContactEditor";
import { ZaloAvatar } from "./ZaloAvatar";
import { confirmAction } from "@/lib/chat/confirm";
import { SharedGroupsScanner } from "./SharedGroupsScanner";
import { platformLabel } from "@/lib/chat/platforms";

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

  const myZalo = ctx.myChannels.filter((c) => c.platform === "zaloweb" && !c.missing).map((c) => c.pagePid);
  const pagePid = myZalo[0];
  const { user, groups, others } = ctx.contacts;

  const askRemove = (c: ZaloContact, label: string) =>
    canManage
      ? () => {
          confirmAction(`Xóa ${label.toLowerCase()} ${c.zaloId} khỏi khách?`, {
            title: "Xóa ID Zalo",
            confirmText: "Xóa",
            danger: true,
          }).then((ok) => ok && remove.mutate(c.id));
        }
      : undefined;

  const row = (c: ZaloContact, label: string, rowPagePid = pagePid) => (
    <ContactRow
      key={c.id}
      customerId={customerId}
      pagePid={rowPagePid}
      contact={c}
      label={label}
      onRemove={askRemove(c, label)}
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
          <ul className="flex flex-col gap-1 mb-2">
            {bundleGroups(groups).map((set) => (
              <GroupRow
                key={set[0].id}
                customerId={customerId}
                contacts={set}
                myPagePids={myZalo}
                askRemove={(c) => askRemove(c, "Nhóm Zalo")}
              />
            ))}
          </ul>
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

      {others.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Kênh khác</h4>
          <ul className="flex flex-col gap-1">
            {others.map((c) => {
              // Hội thoại kênh khác gắn 1 kênh; chỉ đọc được tên/ảnh khi kênh đó liên kết với mình
              const ch = ctx.myChannels.find((m) => m.pagePid === c.pagePid && !m.missing);
              return row(c, `${platformLabel(ch?.platform)} · ${ch?.name ?? c.pagePid}`, ch?.pagePid);
            })}
          </ul>
          <p className="mt-1 text-xs text-gray-500">Gắn thêm: mở hội thoại của khách trong danh sách gần đây của kênh đó.</p>
        </section>
      )}
    </div>
  );
}

type GroupContact = ZaloContact & { pageName?: string | null };

/** "Diệp Trà - Ms Mai Phương" → "Ms Mai Phương" (giữ nguyên nếu bỏ đi còn quá ngắn). */
const shortPageName = (name: string) => {
  const s = name.replace(/^diệp trà\s*[-–]?\s*/i, "").trim();
  return s.length >= 3 ? s : name;
};

/**
 * Cùng 1 nhóm Zalo, mỗi tài khoản Zalo thấy 1 ID khác → gộp các ID cùng tên nhóm, khác tài
 * khoản thành 1 dòng. Hai ID cùng 1 tài khoản là 2 nhóm khác nhau (dù trùng tên) → không gộp.
 */
function bundleGroups<T extends GroupContact>(groups: T[]): T[][] {
  const key = (g: T) => g.name?.trim().toLowerCase() || null;
  const out: T[][] = [];
  for (const g of groups) {
    const set = key(g)
      ? out.find((s) => key(s[0]) === key(g) && !s.some((x) => x.pagePid && x.pagePid === g.pagePid))
      : undefined;
    if (set) set.push(g);
    else out.push([g]);
  }
  return out;
}

/** 1 nhóm Zalo của khách; gắn qua nhiều tài khoản thì liệt kê tài khoản, bấm xem từng ID. */
function GroupRow({
  customerId,
  contacts,
  myPagePids,
  askRemove,
}: {
  customerId: number;
  contacts: GroupContact[];
  myPagePids: string[];
  askRemove: (c: ZaloContact) => (() => void) | undefined;
}) {
  const [open, setOpen] = useState(false);
  // Tên/ảnh nhóm đọc qua tài khoản Zalo của mình nếu mình có ID nhóm đó
  const own = contacts.find((c) => c.pagePid && myPagePids.includes(c.pagePid));
  const main = own ?? contacts[0];
  const rowPagePid = own?.pagePid ?? myPagePids[0];
  const account = (c: GroupContact) => (c.pageName ? shortPageName(c.pageName) : "chưa rõ tài khoản");
  const unknown = contacts.filter((c) => !c.pageName).length;

  if (contacts.length === 1) {
    return (
      <ContactRow
        customerId={customerId}
        pagePid={rowPagePid}
        contact={main}
        label="Nhóm Zalo"
        accountName={main.pageName ? account(main) : undefined}
        onRemove={askRemove(main)}
      />
    );
  }
  return (
    <ContactRow
      customerId={customerId}
      pagePid={rowPagePid}
      contact={main}
      label="Nhóm Zalo"
      sub={`Qua ${contacts.length} tài khoản Zalo: ${[
        ...contacts.filter((c) => c.pageName).map(account),
        unknown ? `${unknown} chưa rõ tài khoản` : null,
      ]
        .filter(Boolean)
        .join(", ")}`}
      action={
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
          {open ? "Ẩn ID" : "Xem ID"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      }>
      {open && (
        <ul className="mt-2 flex flex-col divide-y border-t">
          {contacts.map((c) => {
            const onRemove = askRemove(c);
            return (
              <li key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                <span className="min-w-0">
                  <span className="block font-medium text-gray-700">{c.pageName ?? "Chưa rõ tài khoản"}</span>
                  <span className="block break-all text-gray-500">ID: {c.zaloId}</span>
                </span>
                {onRemove && (
                  <button
                    onClick={onRemove}
                    aria-label={`Xóa ID ${c.zaloId}`}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ContactRow>
  );
}

/** Một ID Zalo của khách: avatar + tên Zalo thật (lấy từ hội thoại trên Smax). */
function ContactRow({
  customerId,
  pagePid,
  contact: c,
  label,
  accountName,
  sub,
  action,
  onRemove,
  children,
}: {
  customerId: number;
  pagePid: string | undefined;
  contact: ZaloContact;
  label: string;
  // Tài khoản Zalo thấy ID nhóm này
  accountName?: string;
  // Thay dòng "ID: …" (vd nhóm gắn qua nhiều tài khoản)
  sub?: ReactNode;
  action?: ReactNode;
  onRemove?: () => void;
  children?: ReactNode;
}) {
  const { data: p } = useZaloProfile(customerId, pagePid, c.id);
  return (
    <li className="rounded border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <ZaloAvatar
          avatar={p?.avatar ?? null}
          isGroup={c.kind === "group"}
          members={p?.memberPreview}
          memberCount={p?.memberCount}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium truncate">{p?.name || c.name || label}</span>
          <span className="block text-xs text-gray-500 break-all">
            {sub ?? (
              <>
                ID: {c.zaloId}
                {accountName ? ` · TK ${accountName}` : ""}
              </>
            )}
            {c.kind === "group" && p?.memberCount ? ` · ${p.memberCount} thành viên` : ""}
          </span>
        </span>
        {action}
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label="Xóa"
            className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </li>
  );
}
