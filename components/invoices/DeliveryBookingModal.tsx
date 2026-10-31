"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Send, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useUsers } from "@/lib/hooks/useUsers";
import { useBranches } from "@/lib/hooks/useBranches";
import { useAuthStore } from "@/lib/store/auth";
import type { Invoice } from "@/lib/types/invoice";
import { buildDefaults, formatPhone } from "./ShippingLabelA6Modal";

/**
 * Đặt xe giao hàng: soạn tin từ hóa đơn (sửa được), gửi vào nhóm Zalo đặt xe qua kênh
 * cố định của công ty (backend cấu hình). Người gửi mặc định là nhân viên đang thao tác.
 */

type Payer = "sender" | "receiver";
const PAYER_LABEL: Record<Payer, string> = {
  sender: "Người gửi thanh toán",
  receiver: "Người nhận thanh toán",
};

// SĐT khách trùng được hệ thống thêm hậu tố ".1", ".2"… → bỏ khi gửi đặt xe
const cleanPhone = (phone: string) => phone.trim().replace(/\.\d+$/, "");

// Tên khách gửi nhà xe: bỏ loại khách đầu tên ("Khách buôn", "Khách lẻ") và mã sale cuối tên "(Sale 1 - A1)"
const cleanName = (name: string) =>
  name
    .trim()
    .replace(/^khách\s+(buôn|lẻ)\s+/i, "")
    .replace(/\s*\(\s*sale\b[^()]*\)\s*$/i, "")
    .trim();

const line = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(" - ");

export function DeliveryBookingModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { data: users } = useUsers();
  const { data: branches } = useBranches();
  const target = useQuery({
    queryKey: ["deliveryBookingTarget"],
    queryFn: () => smaxChatApi.deliveryBookingTarget(),
    staleTime: 60_000,
    retry: false,
  });

  const receiver = useMemo(() => buildDefaults(invoice, null), [invoice]);
  const [senderId, setSenderId] = useState<number | null>(userId);
  const [senderPhone, setSenderPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [receiverName, setReceiverName] = useState(cleanName(receiver.receiverName));
  const [receiverPhone, setReceiverPhone] = useState(cleanPhone(receiver.receiverPhone));
  const [receiverAddress, setReceiverAddress] = useState(receiver.address);
  const [note, setNote] = useState(invoice.code || "");
  const [payer, setPayer] = useState<Payer | null>(null);

  const branchId = invoice.branch?.id ?? invoice.branchId;
  // Kho Hà Nội / Kho Sài Gòn: chỉ nhân sự phòng ban Lark tương ứng; chi nhánh khác: mọi nhân sự
  const senders = useQuery({
    queryKey: ["deliveryBookingSenders", branchId],
    queryFn: () => smaxChatApi.deliveryBookingSenders(branchId!),
    enabled: !!branchId,
    staleTime: 5 * 60_000,
  });
  const allowedIds = senders.data?.userIds ? new Set(senders.data.userIds) : null;
  // Người đang thao tác luôn có trong danh sách (mặc định chọn sẵn)
  const senderOptions = allowedIds ? users?.filter((u) => allowedIds.has(u.id) || u.id === userId) : users;

  const sender = users?.find((u) => u.id === senderId);
  // SĐT theo nhân viên được chọn (sửa được sau đó)
  useEffect(() => {
    setSenderPhone(formatPhone(sender?.phone));
  }, [sender?.id, sender?.phone]);
  // Địa chỉ chi nhánh của hóa đơn (Cài đặt → Chi nhánh)
  const branchSaved = branches?.find((b) => b.id === branchId)?.address ?? "";
  useEffect(() => {
    setBranchAddress(branchSaved);
  }, [branchSaved]);

  const text = [
    "Thông tin người gửi:",
    line(sender?.name ?? "", senderPhone),
    branchAddress.trim(),
    "Thông tin người nhận:",
    line(receiverName, receiverPhone),
    receiverAddress.trim(),
    `Ghi chú: ${note.trim()}`,
    payer ? PAYER_LABEL[payer] : "",
  ]
    .filter(Boolean)
    .join("\n");

  const send = useMutation({
    mutationFn: () => smaxChatApi.bookDelivery({ invoiceId: invoice.id, text, confirmed: true }),
    onSuccess: () => {
      toast.success(`Đã gửi tin đặt xe vào nhóm ${target.data?.groupName ?? "đặt xe"}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Không gửi được tin đặt xe"),
  });

  const missing = !sender
    ? "Chọn người gửi"
    : !receiverName.trim()
      ? "Nhập tên người nhận"
      : !receiverAddress.trim()
        ? "Nhập địa chỉ người nhận"
        : !payer
          ? "Chọn bên thanh toán"
          : null;
  const blocked = target.error
    ? (target.error as Error).message || "Không tải được kênh Zalo đặt xe"
    : target.data?.connectionError
      ? `Kênh "${target.data.channelName}" đang mất kết nối — không gửi được`
      : null;

  const input =
    "w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  // Portal ra body: mở từ trong 1 dòng bảng hóa đơn; chặn click lan lên dòng
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}>
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand" />
              Đặt xe giao hàng — {invoice.code}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {target.data
                ? `Gửi qua kênh Zalo "${target.data.channelName}" vào nhóm "${target.data.groupName ?? "đặt xe"}"`
                : target.isLoading
                  ? "Đang tải kênh Zalo đặt xe…"
                  : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 flex flex-col md:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold mb-1">Người gửi</legend>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Nhân viên</label>
                  <select
                    value={senderId ?? ""}
                    onChange={(e) => setSenderId(e.target.value ? Number(e.target.value) : null)}
                    className={input}>
                    <option value="">— Chọn nhân viên —</option>
                    {senderOptions?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>SĐT người gửi</label>
                  <input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className={input} />
                </div>
              </div>
              <div>
                <label className={label}>
                  Địa chỉ chi nhánh{invoice.branch?.name ? ` (${invoice.branch.name})` : ""}
                </label>
                <textarea
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  rows={2}
                  className={input}
                />
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold mb-1">Người nhận</legend>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={label}>Tên khách hàng</label>
                  <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className={input} />
                </div>
                <div>
                  <label className={label}>SĐT</label>
                  <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} className={input} />
                </div>
              </div>
              <div>
                <label className={label}>Địa chỉ khách hàng</label>
                <textarea
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  rows={2}
                  className={input}
                />
              </div>
            </fieldset>

            <div>
              <label className={label}>Ghi chú</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              {(Object.keys(PAYER_LABEL) as Payer[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery-payer"
                    checked={payer === k}
                    onChange={() => setPayer(k)}
                    className="accent-brand"
                  />
                  {PAYER_LABEL[k]}
                </label>
              ))}
            </div>
          </div>

          <div className="md:w-80 flex-shrink-0 flex flex-col gap-2">
            <span className="text-xs text-gray-500">Xem trước tin nhắn</span>
            <div className="rounded-lg bg-cyan-bg border border-brand-border p-3 text-sm whitespace-pre-wrap break-words">
              {text}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t">
          <p className="text-xs text-red-600 flex items-center gap-1 min-w-0">
            {(blocked || missing) && (
              <>
                {blocked && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{blocked || missing}</span>
              </>
            )}
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50">
              Đóng
            </button>
            <button
              onClick={() => send.mutate()}
              disabled={!!missing || !!blocked || !target.data || send.isPending}
              className="px-4 py-1.5 text-sm text-white bg-brand rounded-full hover:opacity-90 flex items-center gap-1.5 disabled:opacity-50">
              {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Gửi tin đặt xe
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
