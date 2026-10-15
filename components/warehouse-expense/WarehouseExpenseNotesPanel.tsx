"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import type { InternalFinanceEntry } from "@/lib/api/internal-finance";
import {
  useCreateWarehouseExpenseNote,
  useWarehouseExpenseMentionCandidates,
  useWarehouseExpenseNotes,
} from "@/lib/hooks/useInternalFinance";
import {
  displayOccurredAt,
  displaySource,
  displayDescription,
} from "@/lib/internal-finance/display";
import {
  expenseLockReason,
  expenseSourceAction,
} from "@/lib/internal-finance/expense-source";
import { formatCurrency } from "@/lib/utils";

const LARK_STATUS: Record<string, { label: string; className: string }> = {
  SENT: { label: "Đã gửi Lark", className: "bg-green-50 text-green-700" },
  NO_LARK: {
    label: "Chưa gắn Lark",
    className: "bg-amber-50 text-amber-700",
  },
  ERROR: { label: "Gửi lỗi", className: "bg-red-50 text-red-700" },
  PENDING: { label: "Đang gửi", className: "bg-gray-100 text-gray-600" },
};

const timeLabel = (value: string) =>
  new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

/** Ghi chú & tag người xem lại phiếu chi kho (người được tag nhận tin Lark). */
export function WarehouseExpenseNotesPanel({
  entry,
  canWrite,
  canEdit,
  onEdit,
  onClose,
}: {
  entry: InternalFinanceEntry;
  canWrite: boolean;
  /** Phiếu tay: còn sửa được và có quyền sửa. */
  canEdit: boolean;
  onEdit: (entry: InternalFinanceEntry) => void;
  onClose: () => void;
}) {
  const source = expenseSourceAction(entry);
  const lockReason = expenseLockReason(entry);
  const notes = useWarehouseExpenseNotes(entry.id);
  const candidates = useWarehouseExpenseMentionCandidates(entry.id, canWrite);
  const createNote = useCreateWarehouseExpenseNote();
  const [content, setContent] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const options = useMemo(
    () =>
      (candidates.data || []).map((user) => ({
        value: String(user.id),
        label: user.name,
      })),
    [candidates.data],
  );
  const selectedNames = options
    .filter((option) => mentionIds.includes(option.value))
    .map((option) => option.label);

  const submit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    createNote.mutate(
      {
        id: entry.id,
        content: trimmed,
        mentionUserIds: mentionIds.map(Number),
      },
      {
        onSuccess: () => {
          setContent("");
          setMentionIds([]);
        },
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/25"
      // Chỉ đóng khi bấm đúng vào nền mờ, không phải bên trong bảng.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}>
      <div className="flex h-full w-full max-w-xl flex-col border-l bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <MessageSquareText className="h-5 w-5 text-brand" />
              Ghi chú & yêu cầu xem lại
            </h2>
            <p className="mt-1 font-mono text-xs text-gray-500">{entry.code}</p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b px-5 py-4 text-sm">
          {[
            ["Chi nhánh", entry.branch?.name || "-"],
            [
              "Ngày chi",
              displayOccurredAt({
                occurredAt: entry.occurredAt,
                sourceType: entry.sourceType,
                sourceSnapshot: entry.sourceSnapshot,
              }),
            ],
            ["Nguồn", displaySource(entry.sourceType, entry.category)],
            ["Số tiền", formatCurrency(entry.amount)],
            ["Hạng mục", entry.expenseItem || "-"],
            ["Người chi", entry.payer?.name || "-"],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <div className="text-xs text-gray-500">{label}</div>
              <div className="truncate text-gray-900" title={value}>
                {value}
              </div>
            </div>
          ))}
          <div className="col-span-2 min-w-0">
            <div className="text-xs text-gray-500">Nội dung</div>
            <div className="break-words text-gray-900">
              {displayDescription(entry.description) || "-"}
            </div>
          </div>
          <div className="col-span-2 space-y-2 pt-1">
            {lockReason && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {lockReason}
              </div>
            )}
            {source.kind === "link" ? (
              <Link
                href={source.href}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft">
                <ExternalLink className="h-3.5 w-3.5" />
                {source.label}
              </Link>
            ) : source.kind === "edit" ? (
              canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft">
                  <FileText className="h-3.5 w-3.5" />
                  {source.label}
                </button>
              )
            ) : (
              <span className="text-xs text-gray-400">{source.label}</span>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Lịch sử ghi chú
          </div>
          {notes.isLoading ? (
            <div className="flex justify-center py-10 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notes.data?.length ? (
            <div className="space-y-3">
              {notes.data.map((note) => (
                <div key={note.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-800">
                      {note.creator.name}
                    </span>
                    <span>{timeLabel(note.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-gray-900">
                    {note.content}
                  </p>
                  {note.mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {note.mentions.map((mention) => {
                        const status =
                          LARK_STATUS[mention.larkStatus] ||
                          LARK_STATUS.PENDING;
                        return (
                          <span
                            key={mention.id}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.className}`}
                            title={status.label}>
                            @{mention.user.name}
                            <span className="opacity-70">· {status.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
              Chưa có ghi chú cho phiếu này
            </div>
          )}
        </div>

        {canWrite && (
          <div className="space-y-3 border-t px-5 py-4">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Ghi chú cần xem lại..."
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <div>
              <div className="mb-1 text-xs text-gray-500">
                Tag người xem lại (nhận tin nhắn Lark, tối đa 10 người)
              </div>
              <FilterMultiSelect
                options={options}
                values={mentionIds}
                onChange={(values) => setMentionIds(values.slice(0, 10))}
                placeholder={
                  candidates.isLoading ? "Đang tải..." : "Chọn người xem lại"
                }
                searchPlaceholder="Tìm người..."
                multiLabel={(count) => `Đã chọn ${count} người`}
              />
              {selectedNames.length > 0 && (
                <div className="mt-1.5 text-xs text-gray-600">
                  {selectedNames.map((name) => `@${name}`).join(", ")}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submit}
                disabled={!content.trim() || createNote.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50">
                {createNote.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {mentionIds.length ? "Lưu & gửi Lark" : "Lưu ghi chú"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
