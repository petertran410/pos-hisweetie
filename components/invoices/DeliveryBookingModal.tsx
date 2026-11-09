"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowUp, Loader2, Send, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { useUsers } from "@/lib/hooks/useUsers";
import { useBranches } from "@/lib/hooks/useBranches";
import { useAuthStore } from "@/lib/store/auth";
import type { Invoice } from "@/lib/types/invoice";
import { buildDefaults, formatPhone } from "./ShippingLabelA6Modal";

/**
 * Đặt xe giao hàng: soạn tin từ hóa đơn (sửa được), gửi vào nhóm Zalo đặt xe qua kênh
 * cố định của công ty (backend cấu hình). Người gửi mặc định là nhân viên đang thao tác.
 * Nhiều hóa đơn: 1 tin với Người nhận 1, 2… theo thứ tự sắp xếp được (thứ tự giao).
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
const block = (...lines: string[]) => lines.map((l) => l.trim()).filter(Boolean).join("\n");

// Giới hạn độ dài tin (backend MaxLength 2000)
const MAX_TEXT = 2000;

interface Receiver {
  invoiceId: number;
  code: string;
  name: string;
  phone: string;
  address: string;
  note: string;
}

const toReceiver = (invoice: Invoice): Receiver => {
  const d = buildDefaults(invoice, null);
  return {
    invoiceId: invoice.id,
    code: invoice.code || "",
    name: cleanName(d.receiverName),
    phone: cleanPhone(d.receiverPhone),
    address: d.address,
    note: invoice.code || "",
  };
};

export function DeliveryBookingModal({ invoices, onClose }: { invoices: Invoice[]; onClose: () => void }) {
  // Người gửi / chi nhánh theo hóa đơn đầu tiên
  const invoice = invoices[0];
  const multi = invoices.length > 1;
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { data: users } = useUsers();
  const { data: branches } = useBranches();
  const target = useQuery({
    queryKey: ["deliveryBookingTarget"],
    queryFn: () => smaxChatApi.deliveryBookingTarget(),
    staleTime: 60_000,
    retry: false,
  });

  const [senderId, setSenderId] = useState<number | null>(userId);
  const [senderName, setSenderName] = useState("Diệp Trà");
  const [senderPhone, setSenderPhone] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [receivers, setReceivers] = useState<Receiver[]>(() => invoices.map(toReceiver));
  const [payer, setPayer] = useState<Payer | null>(null);

  const updateReceiver = (i: number, patch: Partial<Receiver>) =>
    setReceivers((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const moveReceiver = (i: number, to: number) =>
    setReceivers((rs) => {
      const next = [...rs];
      const [r] = next.splice(i, 1);
      next.splice(to, 0, r);
      return next;
    });
  const removeReceiver = (i: number) => setReceivers((rs) => rs.filter((_, j) => j !== i));

  const branchId = invoice.branch?.id ?? invoice.branchId;
  const branchIdOf = (inv: Invoice) => inv.branch?.id ?? inv.branchId;
  const mixedBranches = invoices.some((inv) => branchIdOf(inv) !== branchId);
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

  // Các khối cách nhau 1 dòng trống; tiêu đề người nhận đứng riêng 1 khối
  const text = [
    block("THÔNG TIN NGƯỜI GỬI:", line(senderName, senderPhone), branchAddress),
    ...receivers.flatMap((r, i) => [
      `* THÔNG TIN NGƯỜI NHẬN${receivers.length > 1 ? ` ${i + 1}` : ""}:`,
      block(line(r.name, r.phone), r.address, `Ghi chú: ${r.note.trim()}`),
    ]),
    payer ? PAYER_LABEL[payer] : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const send = useMutation({
    mutationFn: () =>
      smaxChatApi.bookDelivery({
        ...(receivers.length > 1
          ? { invoiceIds: receivers.map((r) => r.invoiceId) }
          : { invoiceId: receivers[0].invoiceId }),
        text,
        confirmed: true,
      }),
    onSuccess: () => {
      toast.success(`Đã gửi tin đặt xe vào nhóm ${target.data?.groupName ?? "đặt xe"}`);
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Không gửi được tin đặt xe"),
  });

  const receiverNo = (i: number) => (receivers.length > 1 ? ` ${i + 1}` : "");
  const noName = receivers.findIndex((r) => !r.name.trim());
  const noAddress = receivers.findIndex((r) => !r.address.trim());
  const missing = !sender
    ? "Chọn người gửi"
    : !senderName.trim()
      ? "Nhập tên người gửi"
      : !receivers.length
        ? "Chưa có người nhận"
        : noName >= 0
          ? `Nhập tên người nhận${receiverNo(noName)}`
          : noAddress >= 0
            ? `Nhập địa chỉ người nhận${receiverNo(noAddress)}`
            : !payer
              ? "Chọn bên thanh toán"
              : text.length > MAX_TEXT
                ? `Tin quá dài (${text.length}/${MAX_TEXT} ký tự) — bớt người nhận hoặc rút gọn`
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
              Đặt xe giao hàng — {multi ? `${invoices.length} hóa đơn` : invoice.code}
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
                  <FilterSearchableSelect
                    size="form"
                    options={(senderOptions ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
                    value={senderId ? String(senderId) : ""}
                    onChange={(v) => setSenderId(v ? Number(v) : null)}
                    placeholder="— Chọn nhân viên —"
                    searchPlaceholder="Tìm nhân viên…"
                  />
                </div>
                <div>
                  <label className={label}>SĐT người gửi</label>
                  <input value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} className={input} />
                </div>
              </div>
              <div>
                <label className={label}>Tên người gửi</label>
                <input value={senderName} onChange={(e) => setSenderName(e.target.value)} className={input} />
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

            {mixedBranches && (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Các hóa đơn thuộc nhiều chi nhánh — người gửi và địa chỉ lấy theo chi nhánh của {invoice.code}.
              </p>
            )}
            {receivers.map((r, i) => (
              <fieldset
                key={r.invoiceId}
                className={`space-y-2 ${receivers.length > 1 ? "rounded-lg border p-3" : ""}`}>
                <legend className="text-sm font-semibold mb-1 flex items-center gap-1.5 px-1">
                  Người nhận{receiverNo(i)}
                  {receivers.length > 1 && (
                    <>
                      <span className="font-normal text-gray-500">· {r.code}</span>
                      <span className="ml-2 inline-flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveReceiver(i, i - 1)}
                          disabled={i === 0}
                          title="Đưa lên trước"
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveReceiver(i, i + 1)}
                          disabled={i === receivers.length - 1}
                          title="Đưa xuống sau"
                          className="rounded p-0.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeReceiver(i)}
                          title="Bỏ hóa đơn này khỏi chuyến"
                          className="rounded p-0.5 text-gray-500 hover:bg-red-50 hover:text-red-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </>
                  )}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label}>Tên khách hàng</label>
                    <input value={r.name} onChange={(e) => updateReceiver(i, { name: e.target.value })} className={input} />
                  </div>
                  <div>
                    <label className={label}>SĐT</label>
                    <input value={r.phone} onChange={(e) => updateReceiver(i, { phone: e.target.value })} className={input} />
                  </div>
                </div>
                <div>
                  <label className={label}>Địa chỉ khách hàng</label>
                  <textarea
                    value={r.address}
                    onChange={(e) => updateReceiver(i, { address: e.target.value })}
                    rows={2}
                    className={input}
                  />
                </div>
                <div>
                  <label className={label}>Ghi chú</label>
                  <input value={r.note} onChange={(e) => updateReceiver(i, { note: e.target.value })} className={input} />
                </div>
              </fieldset>
            ))}

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
