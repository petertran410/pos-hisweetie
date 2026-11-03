"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Send, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { leadsApi } from "@/lib/api/leads";
import { FilterSearchableSelect } from "@/components/ui/filters";
import { confirmAction } from "@/lib/chat/confirm";
import type { HandoverStepKey, Lead, LeadHandover } from "@/lib/types/lead";

export const HANDOVER_STEP_LABEL: Record<HandoverStepKey, string> = {
  lark: "Tin Lark cho Sale",
  friend: "Lời mời kết bạn Zalo",
  greeting: "Tin chào Zalo",
};

/** Ghi chú khi bước bị "bỏ qua" (lỗi Zalo chấp nhận được) */
export const HANDOVER_SKIP_NOTE: Partial<Record<HandoverStepKey, string>> = {
  friend: "bỏ qua — khách đã là bạn bè",
  greeting: "bỏ qua — Sale nhắn sau khi khách đồng ý kết bạn",
};

/**
 * Chuyển lead cho Sale PIC: chọn Sale + kênh Zalo cá nhân của Sale, xem trước / sửa tin Lark,
 * lời mời kết bạn, tin chào (từ mẫu), xác nhận rồi gửi. Lỗi giữa chừng → gửi lại bước lỗi
 * ở tab "Lịch sử chuyển giao".
 */
export function LeadHandoverModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: sales } = useQuery({
    queryKey: ["leadSaleCandidates"],
    queryFn: () => leadsApi.saleCandidates(),
    staleTime: 5 * 60_000,
  });
  const [salePicId, setSalePicId] = useState<number | null>(lead.salePicId);
  const [pagePid, setPagePid] = useState("");
  const [note, setNote] = useState(lead.cskhNote ?? "");
  const [debouncedNote, setDebouncedNote] = useState(note);
  const [larkText, setLarkText] = useState("");
  const [friendMessage, setFriendMessage] = useState("");
  const [greeting, setGreeting] = useState("");
  const [result, setResult] = useState<LeadHandover | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedNote(note), 500);
    return () => clearTimeout(t);
  }, [note]);

  // Lý do khoá theo lead + Sale và các kênh Zalo của Sale (backend kiểm tra lại khi gửi)
  const check = useQuery({
    queryKey: ["leadHandoverCheck", lead.id, salePicId, ""],
    queryFn: () => leadsApi.handoverCheck(lead.id, salePicId ?? undefined),
    enabled: !!salePicId,
  });
  const channels = check.data?.channels ?? [];
  // Kênh đang chọn không thuộc Sale (đổi Sale) → kênh đầu tiên của Sale
  const channelPid = channels.some((c) => c.pagePid === pagePid) ? pagePid : (channels[0]?.pagePid ?? "");
  const channel = channels.find((c) => c.pagePid === channelPid);

  // Nội dung theo mẫu (sửa được); đổi Sale / ghi chú → tạo lại
  const preview = useQuery({
    queryKey: ["leadHandoverPreview", lead.id, salePicId, debouncedNote],
    queryFn: () => leadsApi.handoverPreview(lead.id, salePicId!, debouncedNote),
    enabled: !!salePicId,
  });
  const [appliedPreview, setAppliedPreview] = useState<typeof preview.data>(undefined);
  if (preview.data && preview.data !== appliedPreview) {
    setAppliedPreview(preview.data);
    setLarkText(preview.data.larkText);
    setFriendMessage(preview.data.friendMessage);
    setGreeting(preview.data.greeting);
  }

  const send = useMutation({
    mutationFn: () =>
      leadsApi.handover(lead.id, {
        salePicId: salePicId!,
        pagePid: channelPid,
        note: note.trim() || undefined,
        larkText: larkText.trim(),
        friendMessage: friendMessage.trim(),
        greeting: greeting.trim(),
        confirmed: true,
      }),
    onSuccess: ({ handover, done }) => {
      setResult(handover);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead.id] });
      if (done) toast.success(`Đã chuyển lead "${lead.name}" cho Sale`);
      else toast.warning("Chuyển giao chưa xong — có bước lỗi, gửi lại ở Lịch sử chuyển giao");
    },
    onError: (e: Error) => toast.error(e.message || "Không chuyển giao được"),
  });

  const sale = sales?.users.find((u) => u.id === salePicId);
  const reasons = salePicId
    ? [
        ...(check.data?.reasons ?? []),
        ...(channel?.connectionError ? [`Kênh "${channel.name}" đang mất kết nối`] : []),
      ]
    : ["Chọn Sale PIC"];
  const blocked =
    reasons[0] ??
    (!channelPid
      ? "Chọn kênh Zalo của Sale"
      : !larkText.trim() || !friendMessage.trim() || !greeting.trim()
        ? "Nội dung tin trống"
        : null);

  const submit = async () => {
    const ok = await confirmAction(
      `Gửi tin Lark cho ${sale?.name ?? "Sale"}, gửi lời mời kết bạn và tin chào từ Zalo "${
        channel?.name ?? ""
      }" tới khách "${lead.name}"?`,
      { title: "Chuyển giao lead", confirmText: "Gửi" }
    );
    if (ok) send.mutate();
  };

  const input = "w-full border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}>
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-brand" />
            Chuyển giao lead — {lead.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="flex-1 overflow-auto p-5 space-y-2 text-sm">
            {(Object.keys(HANDOVER_STEP_LABEL) as HandoverStepKey[]).map((k) => {
              const s = result.steps[k];
              return (
                <div key={k} className="flex items-start gap-2">
                  {s.status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                  ) : s.status === "skipped" ? (
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  )}
                  <span>
                    {HANDOVER_STEP_LABEL[k]}
                    {s.status === "skipped" && <span className="text-xs text-amber-600"> · {HANDOVER_SKIP_NOTE[k] ?? "bỏ qua"}</span>}
                    {s.error && (
                      <span className={`block whitespace-pre-wrap text-xs ${s.status === "skipped" ? "text-gray-500" : "text-red-600"}`}>
                        {s.error}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
            {result.status !== "done" && (
              <p className="pt-2 text-xs text-gray-500">Gửi lại bước lỗi trong tab “Lịch sử chuyển giao” của lead.</p>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Sale PIC *</label>
                <FilterSearchableSelect
                  size="form"
                  options={(sales?.users ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
                  value={salePicId ? String(salePicId) : ""}
                  onChange={(v) => setSalePicId(v ? Number(v) : null)}
                  placeholder="— Chọn Sale —"
                  searchPlaceholder="Tìm Sale theo tên…"
                />
                {sales && (
                  <p className={`mt-1 text-[11px] ${sales.filtered ? "text-gray-400" : "text-amber-700"}`}>
                    {sales.filtered
                      ? `Nhân sự phòng ban Lark "${sales.department}"`
                      : `Không đọc được phòng ban Lark "${sales.department}" — đang hiện mọi nhân sự`}
                  </p>
                )}
              </div>
              <div>
                <label className={label}>Kênh Zalo của Sale *</label>
                <select
                  value={channelPid}
                  onChange={(e) => setPagePid(e.target.value)}
                  disabled={channels.length < 2}
                  className={input}>
                  {channels.length === 0 && <option value="">— Chưa có kênh —</option>}
                  {channels.map((c) => (
                    <option key={c.pagePid} value={c.pagePid}>
                      {c.name}
                      {c.connectionError ? " (mất kết nối)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Ghi chú cho Sale</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input} />
            </div>

            {salePicId && reasons.length > 0 && (
              <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <ul className="list-disc pl-4">
                  {reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className={label}>Tin Lark gửi Sale</label>
              <textarea value={larkText} onChange={(e) => setLarkText(e.target.value)} rows={6} className={input} />
            </div>
            <div>
              <label className={label}>Lời mời kết bạn Zalo ({friendMessage.length}/150)</label>
              <input
                value={friendMessage}
                onChange={(e) => setFriendMessage(e.target.value.slice(0, 150))}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Tin chào khách (Zalo của Sale)</label>
              <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} className={input} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t">
          {!result && blocked && <span className="mr-auto text-xs text-red-600">{blocked}</span>}
          <button onClick={onClose} className="px-4 py-1.5 rounded-full border text-sm hover:bg-gray-50">
            Đóng
          </button>
          {!result && (
            <button
              onClick={submit}
              disabled={!!blocked || send.isPending || preview.isFetching}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium disabled:opacity-50">
              {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Chuyển giao
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
