"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { confirmAction } from "@/lib/chat/confirm";
import type { LibraryFile } from "@/lib/types/smaxChat";

/**
 * Chọn ảnh/tệp từ Thư viện Smax (cùng thư viện https://smax.ai/bizs/<biz>/storages) để gửi kèm tin.
 * Lọc theo album + tên tệp; chọn tối đa `max` tệp. Quyền smax_chat:manage_library: tải tệp lên
 * album đang xem, xoá tệp (xoá hẳn trên Smax).
 */
// Tối đa tệp mỗi lần tải lên / chọn để xoá (khớp backend)
const UPLOAD_MAX = 10;
const DELETE_MAX = 50;
const ACCEPT = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";

export function LibraryPickerModal({
  max,
  onPick,
  onClose,
}: {
  max: number;
  onPick: (files: LibraryFile[]) => void;
  onClose: () => void;
}) {
  const [albumId, setAlbumId] = useState("");
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<LibraryFile[]>([]);
  const canManage = useCan("smax_chat", "manage_library");
  // Người quản lý chọn được nhiều hơn để xoá; chèn vào tin vẫn tối đa `max`
  const limit = canManage ? Math.max(max, DELETE_MAX) : max;
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["smaxLibraryFiles"] });
    queryClient.invalidateQueries({ queryKey: ["smaxLibraryAlbums"] });
  };
  const upload = useMutation({
    mutationFn: (files: File[]) => smaxChatApi.uploadLibraryFiles(files, albumId || undefined),
    onSuccess: ({ uploaded }) => {
      toast.success(`Đã tải ${uploaded} tệp lên Thư viện Smax`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Không tải lên được"),
  });
  const remove = useMutation({
    mutationFn: (files: LibraryFile[]) => smaxChatApi.deleteLibraryFiles(files),
    onSuccess: ({ deleted }) => {
      toast.success(`Đã xoá ${deleted} tệp khỏi Thư viện Smax`);
      setSelected([]);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message || "Không xoá được"),
  });
  const pickUpload = (list: File[]) => {
    if (!list.length) return;
    if (list.length > UPLOAD_MAX) toast.warning(`Tối đa ${UPLOAD_MAX} tệp mỗi lần tải lên — đã bỏ ${list.length - UPLOAD_MAX} tệp`);
    upload.mutate(list.slice(0, UPLOAD_MAX));
  };
  const askDelete = async () => {
    const ok = await confirmAction(
      `Xoá ${selected.length} tệp khỏi Thư viện Smax? Tệp bị xoá hẳn trên Smax cho cả doanh nghiệp, không khôi phục được.`,
      { title: "Xoá tệp Thư viện", confirmText: "Xoá", danger: true },
    );
    if (ok) remove.mutate(selected);
  };

  useEffect(() => {
    const t = setTimeout(() => setKeyword(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const albums = useQuery({
    queryKey: ["smaxLibraryAlbums"],
    queryFn: () => smaxChatApi.libraryAlbums(),
    staleTime: 5 * 60_000,
  });
  const files = useInfiniteQuery({
    queryKey: ["smaxLibraryFiles", albumId, keyword],
    queryFn: ({ pageParam }) => smaxChatApi.libraryFiles({ albumId, keyword, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 60_000,
  });
  const list = files.data?.pages.flatMap((p) => p.files) ?? [];

  const toggle = (f: LibraryFile) =>
    setSelected((cur) =>
      cur.some((s) => s.id === f.id)
        ? cur.filter((s) => s.id !== f.id)
        : cur.length >= limit
          ? cur
          : [...cur, f],
    );

  const tab = (id: string, label: string, count?: number | null) => (
    <button
      key={id || "all"}
      onClick={() => setAlbumId(id)}
      title={label}
      className={`w-full truncate rounded px-2 py-1.5 text-left text-sm ${
        albumId === id ? "bg-cyan-bg font-medium text-brand" : "text-gray-700 hover:bg-gray-100"
      }`}>
      {label}
      {count != null && <span className="ml-1 text-xs text-gray-400">({count})</span>}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-base font-semibold">Thư viện Smax</h2>
          {canManage && (
            <>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  pickUpload([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={upload.isPending}
                title={`Tải tệp lên ${albumId ? "album đang xem" : "Thư viện"} (tối đa ${UPLOAD_MAX} tệp, 25MB/tệp)`}
                className="ml-auto mr-2 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-brand hover:bg-cyan-bg disabled:opacity-50">
                {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Tải lên
              </button>
            </>
          )}
          <button onClick={onClose} aria-label="Đóng" className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="w-48 shrink-0 space-y-0.5 overflow-auto border-r p-2">
            {tab("", "Tất cả")}
            {albums.isLoading && <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-gray-400" />}
            {albums.data?.map((a) => tab(a.id, a.name, a.count))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b p-3">
              <div className="flex items-center gap-2 rounded-md border px-2.5 focus-within:border-brand">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên tệp…"
                  className="h-9 flex-1 text-sm outline-none"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {files.isLoading ? (
                <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-gray-400" />
              ) : files.isError ? (
                <p className="mt-10 text-center text-sm text-red-600">
                  {(files.error as Error).message || "Không tải được Thư viện Smax"}
                </p>
              ) : !list.length ? (
                <p className="mt-10 text-center text-sm text-gray-500">Không có tệp nào.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {list.map((f) => {
                    const on = selected.some((s) => s.id === f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggle(f)}
                        title={f.name}
                        disabled={!on && selected.length >= limit}
                        className={`group relative aspect-square overflow-hidden rounded-md border-2 bg-gray-50 disabled:opacity-50 ${
                          on ? "border-brand" : "border-transparent hover:border-gray-300"
                        }`}>
                        {f.mime.startsWith("image/") ? (
                          <img src={f.url} alt={f.name} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-xs text-gray-600">
                            <FileText className="h-6 w-6" />
                            <span className="line-clamp-2 break-all">{f.name}</span>
                          </span>
                        )}
                        <span
                          className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                            on ? "border-brand bg-brand text-white" : "border-white bg-black/20"
                          }`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {files.hasNextPage && (
                <button
                  onClick={() => files.fetchNextPage()}
                  disabled={files.isFetchingNextPage}
                  className="mx-auto mt-3 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-brand hover:bg-cyan-bg disabled:opacity-50">
                  {files.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tải thêm
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3 text-sm">
          <span className={selected.length > max ? "text-amber-700" : "text-gray-500"}>
            Đã chọn {selected.length}
            {selected.length > max ? ` — chèn vào tin tối đa ${max} tệp` : `/${max}`}
          </span>
          <div className="flex gap-2">
            {canManage && selected.length > 0 && (
              <button
                onClick={askDelete}
                disabled={remove.isPending}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50">
                {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Xoá ({selected.length})
              </button>
            )}
            <button onClick={onClose} className="rounded-md bg-gray-100 px-4 py-2 hover:bg-gray-200">
              Hủy
            </button>
            <button
              onClick={() => {
                onPick(selected);
                onClose();
              }}
              disabled={!selected.length || selected.length > max}
              className="rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-50">
              Chèn vào tin
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
