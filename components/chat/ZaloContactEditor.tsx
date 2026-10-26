"use client";

import { useState } from "react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useSaveZaloContact } from "@/lib/hooks/useSmaxChat";
import type { ZaloContactKind } from "@/lib/types/smaxChat";

interface Props {
  customerId: number;
  kind: ZaloContactKind;
  // Kênh của tôi để tra ID theo SĐT (chỉ ID cá nhân)
  pagePid?: string;
  defaultPhone?: string | null;
  onDone?: () => void;
}

/** Nhập ID Zalo cá nhân (có tra theo SĐT) hoặc ID nhóm Zalo của khách. */
export function ZaloContactEditor({ customerId, kind, pagePid, defaultPhone, onDone }: Props) {
  const [zaloId, setZaloId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [looking, setLooking] = useState(false);
  const save = useSaveZaloContact(customerId);

  const lookup = async () => {
    if (!pagePid) return;
    setLooking(true);
    try {
      const { friend } = await smaxChatApi.lookupByPhone(pagePid, phone);
      if (!friend) {
        toast.error("Không tìm thấy Zalo theo SĐT này qua kênh của bạn");
        return;
      }
      setZaloId(friend.uid);
      setName(friend.name);
    } catch (e) {
      toast.error((e as Error).message || "Tra cứu thất bại");
    } finally {
      setLooking(false);
    }
  };

  const submit = async () => {
    try {
      await save.mutateAsync({ kind, zaloId: zaloId.trim(), name: name.trim() || undefined });
      onDone?.();
    } catch {
      // lỗi đã toast ở onError của hook
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-brand-border bg-cyan-bg p-3 text-sm">
      <p className="font-medium">
        {kind === "user" ? "Thêm ID Zalo cá nhân của khách" : "Thêm nhóm Zalo của khách"}
      </p>
      {kind === "user" && pagePid && (
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="SĐT Zalo của khách"
            className="flex-1 min-w-0 border rounded px-2 py-1.5 bg-white"
          />
          <button
            onClick={lookup}
            disabled={looking || phone.replace(/\D/g, "").length < 9}
            className="px-3 py-1.5 rounded border border-brand text-brand bg-white disabled:opacity-50">
            {looking ? "Đang tìm…" : "Tìm theo SĐT"}
          </button>
        </div>
      )}
      <input
        value={zaloId}
        onChange={(e) => setZaloId(e.target.value.replace(/\D/g, ""))}
        placeholder={kind === "user" ? "ID Zalo (chỉ chữ số)" : "ID nhóm Zalo (chỉ chữ số)"}
        className="border rounded px-2 py-1.5 bg-white"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={kind === "user" ? "Tên Zalo (không bắt buộc)" : "Tên gợi nhớ của nhóm"}
        className="border rounded px-2 py-1.5 bg-white"
      />
      <div className="flex justify-end gap-2">
        {onDone && (
          <button onClick={onDone} className="px-3 py-1.5 rounded hover:bg-white">
            Hủy
          </button>
        )}
        <button
          onClick={submit}
          disabled={save.isPending || zaloId.length < 5}
          className="px-3 py-1.5 rounded bg-brand text-white disabled:opacity-50">
          {save.isPending ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </div>
  );
}
