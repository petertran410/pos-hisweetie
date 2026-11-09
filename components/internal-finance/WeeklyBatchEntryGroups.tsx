"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Car,
  ChevronRight,
  ExternalLink,
  ReceiptText,
  Truck,
} from "lucide-react";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import { formatCurrency } from "@/lib/utils";
import { vnDateKey } from "@/lib/internal-finance/dates";
import {
  entryTitleInSection,
  groupExpenseEntries,
  type ExpenseGroupKey,
} from "@/lib/internal-finance/expense-groups";

const GROUP_STYLES: Record<
  ExpenseGroupKey,
  { icon: typeof Truck; tone: string }
> = {
  DELIVERY: { icon: Truck, tone: "bg-sky-50 text-sky-700" },
  VEHICLE: { icon: Car, tone: "bg-amber-50 text-amber-700" },
  OTHER: { icon: ReceiptText, tone: "bg-gray-100 text-gray-600" },
};

// Batch ít phiếu thì mở sẵn, nhiều phiếu thì chỉ hiện tổng từng nhóm.
const OPEN_ALL_UNDER = 15;

const dayMonth = (iso: string) =>
  vnDateKey(iso).slice(5).split("-").reverse().join("/");

// Trang Phiếu chi kho mở thẳng phiếu theo mã (cùng link trong tin Lark).
const expensePageHref = (code: string) =>
  `/tai-chinh/phieu-chi-kho?Code=${encodeURIComponent(code)}`;

/** Phiếu chi của batch tuần, nhóm theo loại, mỗi nhóm thu gọn/mở được. */
export function WeeklyBatchEntryGroups({
  entries,
  weekStart,
  renderAction,
}: {
  entries: InternalFinanceEntry[];
  weekStart: string;
  renderAction?: (entry: InternalFinanceEntry) => ReactNode;
}) {
  const groups = useMemo(() => groupExpenseEntries(entries), [entries]);
  const [open, setOpen] = useState<Set<ExpenseGroupKey>>(
    () =>
      new Set(
        entries.length <= OPEN_ALL_UNDER
          ? groups.map((group) => group.key)
          : [],
      ),
  );
  const allOpen = groups.every((group) => open.has(group.key));
  const weekStartKey = vnDateKey(weekStart);

  const toggle = (key: ExpenseGroupKey) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!groups.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-400">
        Batch chưa có phiếu chi
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Phiếu chi theo nhóm
        </div>
        <button
          type="button"
          onClick={() =>
            setOpen(new Set(allOpen ? [] : groups.map((group) => group.key)))
          }
          className="text-xs font-medium text-brand hover:underline">
          {allOpen ? "Thu gọn tất cả" : "Mở tất cả"}
        </button>
      </div>
      <div className="space-y-2">
        {groups.map((group) => {
          const isOpen = open.has(group.key);
          const { icon: Icon, tone } = GROUP_STYLES[group.key];
          return (
            <section
              key={group.key}
              className="overflow-hidden rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => toggle(group.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100">
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-gray-900">
                    {group.label}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {group.sections
                      .map((section) => `${section.label} ${section.count}`)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-red-600">
                    -{formatCurrency(group.total)}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {group.count} phiếu
                  </span>
                </span>
              </button>
              {isOpen &&
                group.sections.map((section) => (
                  <div key={section.key} className="border-t border-gray-200">
                    {group.sections.length > 1 && (
                      <div className="flex items-center justify-between gap-3 bg-white px-3 pb-1 pt-2.5 text-xs font-medium text-gray-500">
                        <span className="truncate" title={section.label}>
                          {section.label} · {section.count} phiếu
                        </span>
                        <span className="shrink-0 tabular-nums">
                          -{formatCurrency(section.total)}
                        </span>
                      </div>
                    )}
                    <ul className="divide-y divide-gray-100">
                      {section.entries.map((entry) => {
                        const title = entryTitleInSection(
                          entry.description,
                          section.label,
                        );
                        return (
                          <li
                            key={entry.id}
                            className="group relative flex items-start justify-between gap-3 px-3 py-2 hover:bg-gray-50">
                            {/* Cả dòng là link (lớp phủ ::after); nút bên phải nằm trên lớp phủ. */}
                            <a
                              href={expensePageHref(entry.code)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`${title}\nMở phiếu ${entry.code} ở tab mới`}
                              className="block min-w-0 after:absolute after:inset-0">
                              <span className="line-clamp-2 text-sm text-gray-900 group-hover:text-brand">
                                {title}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-500">
                                <span className="inline-flex items-center gap-1 font-mono">
                                  {entry.code}
                                  <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                </span>
                                <span>· {dayMonth(entry.occurredAt)}</span>
                                {entry.payer?.name && (
                                  <span>· {entry.payer.name}</span>
                                )}
                                {/* Phiếu ngày trước tuần: được gộp từ phiếu sót. */}
                                {vnDateKey(entry.occurredAt) < weekStartKey && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                    Sót tuần trước
                                  </span>
                                )}
                              </span>
                            </a>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-sm font-medium tabular-nums text-gray-900">
                                -{formatCurrency(entry.amount)}
                              </span>
                              {renderAction && (
                                <span className="relative z-10">
                                  {renderAction(entry)}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
