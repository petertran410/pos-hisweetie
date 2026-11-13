"use client";

import { useEffect, useRef } from "react";
import type { ChatMention, MentionMember } from "@/lib/types/smaxChat";
import { ZaloAvatar } from "./ZaloAvatar";
import { norm } from "./QuickInsertMenu";

/** Thành viên khớp chuỗi gõ sau "@" (không dấu, chứa chuỗi; tên bắt đầu bằng chuỗi lên trước). */
export function filterMembers(members: MentionMember[], query: string, limit = 20) {
  const q = norm(query.trim());
  return members
    .filter((m) => !q || norm(m.name).includes(q))
    .sort((a, b) => Number(!norm(a.name).startsWith(q)) - Number(!norm(b.name).startsWith(q)))
    .slice(0, limit);
}

/** Vị trí các "@Tên" của thành viên đã chọn trong text (bỏ tag chồng nhau, ưu tiên tên dài hơn). */
export function findMentions(text: string, picked: MentionMember[]): ChatMention[] {
  const all: ChatMention[] = [];
  for (const p of picked) {
    const tag = `@${p.name}`;
    for (let i = text.indexOf(tag); i >= 0; i = text.indexOf(tag, i + tag.length)) {
      all.push({ uid: p.uid, pos: i, len: tag.length });
    }
  }
  all.sort((a, b) => a.pos - b.pos || b.len - a.len);
  const out: ChatMention[] = [];
  for (const m of all) {
    const last = out[out.length - 1];
    if (!last || m.pos >= last.pos + last.len) out.push(m);
  }
  return out;
}

/** Menu chọn thành viên nhóm khi gõ "@" — cùng kiểu menu "/" và "#". */
export function MentionMenu({
  members,
  activeIndex,
  onHover,
  onPick,
}: {
  members: MentionMember[];
  activeIndex: number;
  onHover: (i: number) => void;
  onPick: (m: MentionMember) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-2 right-2 z-30 mb-1 max-h-72 overflow-y-auto rounded-lg border bg-white py-1 text-sm shadow-xl">
      <div className="px-3 py-1 text-xs text-gray-500">Tag thành viên nhóm — ↑↓ chọn · Enter chèn · Esc đóng</div>
      {members.length === 0 && (
        <p className="px-3 py-2 text-gray-500">Không có thành viên phù hợp (chỉ hiện người đã nhắn trong nhóm).</p>
      )}
      {members.map((m, i) => (
        <button
          key={m.uid}
          data-index={i}
          onMouseEnter={() => onHover(i)}
          // mousedown: giữ focus ở ô soạn
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(m);
          }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${i === activeIndex ? "bg-cyan-bg" : ""}`}>
          <ZaloAvatar avatar={m.avatar} isGroup={false} size={24} />
          <span className="min-w-0 flex-1 truncate">{m.name}</span>
        </button>
      ))}
    </div>
  );
}
