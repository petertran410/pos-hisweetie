"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { ZaloProfile } from "@/lib/types/smaxChat";
import { ZaloAvatar } from "./ZaloAvatar";
import { useEscapeClose } from "@/lib/hooks/useEscapeClose";

const MAX = 100;

/**
 * Đổi tên hội thoại Zalo cá nhân (1-1 / nhóm) trên Smax — tên hiện trên Smax & POS,
 * Smax lưu luôn làm tên gợi nhớ của kênh. Tên nhóm thật trên Zalo không đổi.
 */
export function RenameThreadModal({
  profile,
  isGroup,
  onSave,
  onClose,
}: {
  profile: ZaloProfile;
  isGroup: boolean;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  useEscapeClose(onClose);
  // Tên đang hiện: tên gợi nhớ (nếu có) hoặc tên trên Smax
  const current = profile.name || profile.smaxName || "";
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const name = value.replace(/\s+/g, " ").trim();
  const canSave = !!name && name !== current && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(name);
      onClose();
    } catch (e) {
      toast.error((e as Error).message || "Không đổi được tên");
      setSaving(false);
    }
  };

  return createPortal(
    <div className="chat-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={isGroup ? "Đổi tên nhóm" : "Đổi tên hội thoại"} className="w-full max-w-md rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold">{isGroup ? "Đổi tên nhóm" : "Đổi tên hội thoại"}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          className="space-y-3 px-5 py-4 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}>
          <div className="flex justify-center">
            <ZaloAvatar
              avatar={profile.avatar}
              isGroup={isGroup}
              members={profile.memberPreview}
              memberCount={profile.memberCount}
            />
          </div>
          <p className="text-center text-gray-600">
            Đặt tên mới cho <b>{current}</b>.
            <br />
            {isGroup
              ? "Tên mới hiện trên Smax và POS — tên nhóm thật trên Zalo giữ nguyên."
              : "Tên mới hiện trên Smax và POS (Smax lưu làm tên gợi nhớ của kênh)."}
          </p>
          <input
            autoFocus
            value={value}
            maxLength={MAX}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-md border px-3 py-2 outline-none focus:border-brand"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-md bg-gray-100 px-4 py-2 hover:bg-gray-200">
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
