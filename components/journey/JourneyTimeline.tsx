"use client";

import Link from "next/link";
import {
  BadgeCheck,
  ClipboardList,
  Link2,
  Pencil,
  Receipt,
  Send,
  ShoppingCart,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { CodeLink } from "@/components/shared/CodeLink";
import { leadHref } from "@/lib/leads/constants";
import type { JourneyEvent } from "@/lib/types/lead";

const ICON: Record<JourneyEvent["type"], [LucideIcon, string]> = {
  lead: [UserPlus, "bg-sky-100 text-sky-700"],
  form: [ClipboardList, "bg-sky-100 text-sky-700"],
  update: [Pencil, "bg-gray-100 text-gray-500"],
  handover: [Send, "bg-violet-100 text-violet-700"],
  link: [Link2, "bg-cyan-100 text-cyan-700"],
  convert: [BadgeCheck, "bg-green-100 text-green-700"],
  customer: [UserCheck, "bg-cyan-100 text-cyan-700"],
  order: [ShoppingCart, "bg-amber-100 text-amber-700"],
  invoice: [Receipt, "bg-green-100 text-green-700"],
};

// Kết quả bước chuyển giao / đơn huỷ
const STATUS: Record<string, [string, string]> = {
  failed: ["Lỗi", "text-red-600"],
  skipped: ["Bỏ qua", "text-amber-600"],
  cancelled: ["Đã huỷ", "text-gray-400"],
};

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

/** Dòng thời gian hành trình khách, nhóm theo ngày (cũ → mới). */
export function JourneyTimeline({ events }: { events: JourneyEvent[] }) {
  if (!events.length) return <p className="text-sm text-gray-500">Chưa có sự kiện nào.</p>;
  const days: { day: string; items: JourneyEvent[] }[] = [];
  for (const e of events) {
    const day = dayOf(e.at);
    if (days.at(-1)?.day !== day) days.push({ day, items: [] });
    days.at(-1)!.items.push(e);
  }
  return (
    <div className="space-y-4">
      {days.map((d) => (
        <section key={d.day}>
          <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">{d.day}</h4>
          <ol className="relative ml-3 space-y-3 border-l border-gray-200">
            {d.items.map((e, i) => {
              const [Icon, color] = ICON[e.type] ?? ICON.update;
              const status = e.status ? STATUS[e.status] : undefined;
              return (
                <li key={i} className="relative pl-6">
                  <span
                    className={`absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className={`text-sm ${e.status === "cancelled" ? "text-gray-400 line-through" : ""}`}>
                    {e.title}
                    {status && <span className={`ml-2 text-xs font-medium no-underline ${status[1]}`}>{status[0]}</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(e.at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    {e.by && ` · ${e.by}`}
                    {e.ref && (
                      <>
                        {" · "}
                        <EventRef ref_={e.ref} />
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

function EventRef({ ref_ }: { ref_: NonNullable<JourneyEvent["ref"]> }) {
  if (ref_.kind === "lead") {
    const id = Number(/^LEAD0*(\d+)$/i.exec(ref_.code)?.[1]);
    return id ? (
      <Link href={leadHref(id)} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
        {ref_.code}
      </Link>
    ) : (
      <>{ref_.code}</>
    );
  }
  return <CodeLink entity={ref_.kind} code={ref_.code} className="text-brand hover:underline" />;
}
