"use client";

import { useState } from "react";
import { User, UsersRound } from "lucide-react";

type Member = { name: string | null; avatar: string | null };

const initials = (name: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Face({ m, className }: { m: Member; className: string }) {
  const [broken, setBroken] = useState(false);
  if (m.avatar && !broken)
    return (
      <img
        src={m.avatar}
        alt={m.name ?? ""}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`${className} object-cover`}
      />
    );
  const text = initials(m.name);
  return (
    <span className={`${className} flex items-center justify-center bg-cyan-bg text-[8px] font-semibold text-brand`}>
      {text || <User className="h-2.5 w-2.5" />}
    </span>
  );
}

/**
 * Avatar Zalo: ảnh của người/nhóm; nhóm không có ảnh riêng thì ghép tối đa 4
 * thành viên thành lưới 2×2 như app Zalo (nhóm > 4 người: ô cuối "+N").
 */
export function ZaloAvatar({
  avatar,
  isGroup,
  members = [],
  memberCount,
  size = 32,
}: {
  avatar: string | null;
  isGroup: boolean;
  members?: Member[];
  memberCount?: number | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const box = { width: size, height: size };

  if (avatar && !broken)
    return (
      <img
        src={avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={box}
        className="shrink-0 rounded-full object-cover"
      />
    );

  if (isGroup && members.length >= 2) {
    const total = memberCount ?? members.length;
    const extra = total > 4 ? total - 3 : 0;
    const faces = members.slice(0, extra ? 3 : 4);
    const cell = "h-full w-full rounded-full ring-1 ring-white";
    return (
      <span style={box} className="grid shrink-0 grid-cols-2 grid-rows-2 gap-px">
        {faces.map((m, i) => (
          <span
            key={i}
            // 3 thành viên: ô thứ 3 nằm giữa hàng dưới như Zalo
            className={faces.length === 3 && !extra && i === 2 ? "col-span-2 mx-auto aspect-square h-full" : ""}>
            <Face m={m} className={cell} />
          </span>
        ))}
        {extra > 0 && (
          <span className={`${cell} flex items-center justify-center bg-gray-200 text-[8px] font-semibold text-gray-600`}>
            +{extra}
          </span>
        )}
      </span>
    );
  }

  const text = !isGroup ? initials(members[0]?.name ?? null) : "";
  if (text)
    return (
      <span
        style={box}
        className="flex shrink-0 items-center justify-center rounded-full bg-cyan-bg text-[10px] font-semibold text-brand">
        {text}
      </span>
    );
  const Icon = isGroup ? UsersRound : User;
  return (
    <span style={box} className="flex shrink-0 items-center justify-center rounded-full bg-cyan-bg text-brand">
      <Icon className="h-4 w-4" />
    </span>
  );
}
