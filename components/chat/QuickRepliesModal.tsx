"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Images, Loader2, Paperclip, Pencil, Play, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { confirmAction } from "@/lib/chat/confirm";
import type { LibraryFile, OutgoingAttachment, QuickReply } from "@/lib/types/smaxChat";
import { norm } from "./QuickInsertMenu";
import { LibraryPickerModal } from "./LibraryPickerModal";
import { useEscapeClose } from "@/lib/hooks/useEscapeClose";

// Khớp giới hạn tệp mỗi lượt gửi của ô soạn
const MEDIA_MAX = 10;
const ACCEPT = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";

/** Ảnh nhỏ / biểu tượng của 1 media tin nhắn nhanh. */
function MediaThumb({ m, size = "h-12 w-12" }: { m: OutgoingAttachment; size?: string }) {
  if (m.kind === "image") return <img src={m.url} alt={m.name} className={`${size} rounded object-cover`} />;
  return (
    <span title={m.name} className={`${size} flex flex-col items-center justify-center gap-0.5 rounded bg-gray-100 p-1 text-[10px] text-gray-600`}>
      {m.kind === "video" ? <Play className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      <span className="w-full truncate text-center">{m.name}</span>
    </span>
  );
}

export const QUICK_REPLIES_KEY = ["smaxQuickReplies"];

/** Danh sách tin nhắn nhanh (chung + riêng của mình), dùng chung cho modal và menu "#". */
export function useQuickReplies(enabled = true) {
  return useQuery({
    queryKey: QUICK_REPLIES_KEY,
    queryFn: () => smaxChatApi.quickReplies(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

type Tab = "shared" | "mine";
type Draft = { id: number | null; shortcut: string; content: string; media: OutgoingAttachment[] };

/**
 * Bảng tin nhắn nhanh: chèn vào ô soạn, thêm / sửa / xoá. Tin riêng: mỗi tài khoản tự quản lý;
 * tin chung: hiện cho mọi tài khoản, chỉ người có quyền smax_chat:manage_quick_replies được sửa.
 */
export function QuickRepliesModal({ onInsert, onClose }: { onInsert: (r: QuickReply) => void; onClose: () => void }) {
  useEscapeClose(onClose);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuickReplies();
  const [tab, setTab] = useState<Tab>("shared");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  // Số media đang tải lên / lấy từ Thư viện
  const [adding, setAdding] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = tab === "mine" || !!data?.canManageShared;

  const rows = (tab === "shared" ? data?.shared : data?.mine) ?? [];
  const q = norm(search.trim());
  const shown = q ? rows.filter((r) => norm(r.shortcut).includes(q) || norm(r.content).includes(q)) : rows;

  const done = (msg: string) => {
    toast.success(msg);
    setDraft(null);
    queryClient.invalidateQueries({ queryKey: QUICK_REPLIES_KEY });
  };
  /** Tải lên / lấy từ Thư viện (song song), thêm tệp thành công vào bản nháp. */
  const addMedia = async <T,>(sources: T[], load: (s: T) => Promise<OutgoingAttachment[]>) => {
    const room = MEDIA_MAX - (draft?.media.length ?? 0);
    if (sources.length > room) toast.warning(`Tối đa ${MEDIA_MAX} ảnh/tệp mỗi tin nhắn nhanh — đã bỏ ${sources.length - room} tệp`);
    const list = sources.slice(0, Math.max(room, 0));
    if (!list.length) return;
    setAdding((n) => n + list.length);
    const res = await Promise.allSettled(list.map(load));
    setAdding((n) => n - list.length);
    const ok = res.flatMap((r) => (r.status === "fulfilled" ? r.value.slice(0, 1) : []));
    const failed = res.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed) toast.error((failed.reason as Error)?.message || "Có tệp không thêm được");
    setDraft((cur) => (cur ? { ...cur, media: [...cur.media, ...ok].slice(0, MEDIA_MAX) } : cur));
  };
  const media = (d: Draft) => d.media.map(({ path, kind, name, size }) => ({ path, kind, name, size }));
  const save = useMutation({
    mutationFn: (d: Draft) =>
      d.id
        ? smaxChatApi.updateQuickReply(d.id, { shortcut: d.shortcut, content: d.content, media: media(d) })
        : smaxChatApi.createQuickReply({ shared: tab === "shared", shortcut: d.shortcut, content: d.content, media: media(d) }),
    onSuccess: (_r, d) => done(d.id ? "Đã lưu tin nhắn nhanh" : "Đã thêm tin nhắn nhanh"),
    onError: (e: Error) => toast.error(e.message || "Không lưu được"),
  });
  const remove = useMutation({
    mutationFn: (id: number) => smaxChatApi.deleteQuickReply(id),
    onSuccess: () => done("Đã xoá tin nhắn nhanh"),
    onError: (e: Error) => toast.error(e.message || "Không xoá được"),
  });

  const askDelete = async (r: QuickReply) => {
    const ok = await confirmAction(
      `Xoá tin nhắn nhanh "#${r.shortcut}"${r.ownerId === null ? " — tin chung, mọi tài khoản sẽ không còn thấy" : ""}?`,
      { title: "Xoá tin nhắn nhanh", confirmText: "Xoá", danger: true }
    );
    if (ok) remove.mutate(r.id);
  };

  const form = (d: Draft) => (
    <form
      className="space-y-2 rounded-md border border-brand/40 bg-cyan-bg/40 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (d.shortcut.trim() && (d.content.trim() || d.media.length) && !adding) save.mutate(d);
      }}>
      <div className="flex items-center gap-1 rounded-md border bg-white px-2 focus-within:border-brand">
        <span className="text-gray-400">#</span>
        <input
          autoFocus
          value={d.shortcut}
          maxLength={50}
          onChange={(e) => setDraft({ ...d, shortcut: e.target.value.replace(/[\s#]/g, "") })}
          placeholder="ma-go-tat (gõ #ma-go-tat trong ô chat để chèn)"
          className="h-9 flex-1 text-sm outline-none"
        />
      </div>
      <textarea
        value={d.content}
        maxLength={2000}
        rows={4}
        onChange={(e) => setDraft({ ...d, content: e.target.value })}
        placeholder="Nội dung tin nhắn (có thể để trống nếu chỉ gửi ảnh/tệp)"
        className="w-full resize-y rounded-md border bg-white px-2.5 py-2 text-sm outline-none focus:border-brand"
      />
      {(d.media.length > 0 || adding > 0) && (
        <div className="flex flex-wrap gap-2">
          {d.media.map((m, i) => (
            <span key={`${m.path}-${i}`} className="relative">
              <MediaThumb m={m} size="h-16 w-16" />
              <button
                type="button"
                onClick={() => setDraft((cur) => (cur ? { ...cur, media: cur.media.filter((_, j) => j !== i) } : cur))}
                aria-label={`Bỏ ${m.name}`}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-700 p-0.5 text-white hover:bg-red-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {Array.from({ length: adding }, (_, i) => (
            <span key={`adding-${i}`} className="flex h-16 w-16 items-center justify-center rounded bg-gray-100">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            addMedia([...(e.target.files ?? [])], (f) => smaxChatApi.uploadAttachment(f));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={d.media.length + adding >= MEDIA_MAX}
          title={`Tải ảnh/video/tệp từ máy (tối đa ${MEDIA_MAX} tệp, 25MB/tệp)`}
          className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <Paperclip className="h-4 w-4" />
          Tải lên
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          disabled={d.media.length + adding >= MEDIA_MAX}
          title="Lấy ảnh/tệp từ Thư viện Smax"
          className="mr-auto inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <Images className="h-4 w-4" />
          Thư viện
        </button>
        <button type="button" onClick={() => setDraft(null)} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">
          Hủy
        </button>
        <button
          type="submit"
          disabled={!d.shortcut.trim() || (!d.content.trim() && !d.media.length) || adding > 0 || save.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu
        </button>
      </div>
    </form>
  );

  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      onClick={() => {
        setTab(t);
        setDraft(null);
      }}
      className={`border-b-2 px-3 py-2 text-sm ${tab === t ? "border-brand font-medium text-brand" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
      {label}
      {count != null && <span className="ml-1 text-xs text-gray-400">({count})</span>}
    </button>
  );

  return createPortal(
    <div className="chat-ui fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Tin nhắn nhanh" className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold">Tin nhắn nhanh</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 border-b px-3">
          {tabBtn("shared", "Chung", data?.shared.length)}
          {tabBtn("mine", "Của tôi", data?.mine.length)}
          {canEdit && !draft && (
            <button
              onClick={() => setDraft({ id: null, shortcut: "", content: "", media: [] })}
              className="ml-auto inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm text-brand hover:bg-cyan-bg">
              <Plus className="h-4 w-4" />
              Thêm
            </button>
          )}
        </div>
        <div className="border-b p-3">
          <div className="flex items-center gap-2 rounded-md border px-2.5 focus-within:border-brand">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã gõ tắt hoặc nội dung…"
              className="h-9 flex-1 text-sm outline-none"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {tab === "shared"
              ? data?.canManageShared
                ? "Tin chung hiện cho mọi tài khoản."
                : "Tin chung hiện cho mọi tài khoản — chỉ người được phân quyền mới sửa được."
              : "Tin riêng chỉ mình bạn thấy và sửa."}{" "}
            Trong ô chat gõ <b>#</b> + mã gõ tắt để chèn nhanh.
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
          {draft && draft.id === null && form(draft)}
          {isLoading ? (
            <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-gray-400" />
          ) : isError ? (
            <p className="mt-10 text-center text-sm text-red-600">{(error as Error).message || "Không tải được tin nhắn nhanh"}</p>
          ) : !shown.length ? (
            <p className="mt-10 text-center text-sm text-gray-500">
              {q ? "Không có tin phù hợp." : canEdit ? "Chưa có tin nhắn nhanh — bấm “Thêm” để tạo." : "Chưa có tin nhắn nhanh."}
            </p>
          ) : (
            shown.map((r) =>
              draft?.id === r.id ? (
                <div key={r.id}>{form(draft)}</div>
              ) : (
                <div key={r.id} className="group flex items-start gap-3 rounded-md border p-3 hover:border-brand/40">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-brand">#{r.shortcut}</div>
                    {r.content && (
                      <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-700">{r.content}</p>
                    )}
                    {r.media.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {r.media.map((m, i) => (
                          <MediaThumb key={`${m.path}-${i}`} m={m} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setDraft({ id: r.id, shortcut: r.shortcut, content: r.content, media: r.media })}
                          aria-label="Sửa"
                          title="Sửa"
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => askDelete(r)}
                          disabled={remove.isPending}
                          aria-label="Xoá"
                          title="Xoá"
                          className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        onInsert(r);
                        onClose();
                      }}
                      className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
                      Chèn
                    </button>
                  </div>
                </div>
              )
            )
          )}
        </div>
        {/* Trong khung đã chặn click → bấm nền Thư viện không đóng luôn hộp này (portal vẫn nổi sự kiện theo cây React) */}
        {libraryOpen && draft && (
          <LibraryPickerModal
            max={Math.max(MEDIA_MAX - draft.media.length - adding, 0)}
            onPick={(files: LibraryFile[]) => addMedia(files, (f) => smaxChatApi.importLibraryFile(f))}
            onClose={() => setLibraryOpen(false)}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
