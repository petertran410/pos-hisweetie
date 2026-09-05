"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useUpdateDebtNote } from "@/lib/hooks/useDebtTracking";

/**
 * Ô ghi chú dùng chung sửa tại chỗ; mọi bộ phận cùng đọc và ghi một nguồn.
 */
export function DebtNoteCell({
  customerId,
  value,
  canEdit,
  placeholder = "Thêm ghi chú…",
}: {
  customerId: number;
  value: string | null;
  canEdit: boolean;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [syncedValue, setSyncedValue] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);
  const update = useUpdateDebtNote();

  // Đồng bộ draft khi giá trị từ server đổi, theo pattern "điều chỉnh state
  // khi render" của React (không dùng effect → không gây render thừa).
  // CHỈ đồng bộ khi KHÔNG đang sửa: nếu không, một lần refetch danh sách giữa
  // chừng sẽ xóa mất nội dung người dùng đang gõ.
  if (!editing && (value ?? "") !== syncedValue) {
    setSyncedValue(value ?? "");
    setDraft(value ?? "");
  }

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const save = () => {
    const next = draft.trim();
    if (next === (value ?? "")) {
      setEditing(false);
      return;
    }
    update.mutate(
      {
        customerId,
        note: next || null,
      },
      { onSuccess: () => setEditing(false) }
    );
  };

  if (!canEdit) {
    return (
      <div className="text-xs text-gray-600 whitespace-pre-wrap break-words max-w-[200px]">
        {value || <span className="text-gray-300">—</span>}
      </div>
    );
  }

  if (editing) {
    return (
      <div className="min-w-[180px]">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            // Enter lưu, Shift+Enter xuống dòng, Esc hủy.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") {
              setDraft(value ?? "");
              setEditing(false);
            }
          }}
          rows={2}
          className="w-full border rounded px-2 py-1 text-xs resize-y"
          placeholder={placeholder}
        />
        {update.isPending && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Đang lưu…
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group text-left text-xs w-full max-w-[200px] hover:bg-gray-50 rounded px-1 py-0.5 min-h-[24px]"
      title="Bấm để sửa"
    >
      {value ? (
        <span className="whitespace-pre-wrap break-words text-gray-700">
          {value}
        </span>
      ) : (
        <span className="text-gray-300 inline-flex items-center gap-1">
          <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" />
          {placeholder}
        </span>
      )}
    </button>
  );
}
