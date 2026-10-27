"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  FileText,
  Loader2,
  Paperclip,
  Play,
  QrCode,
  Reply,
  Send,
  Smile,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { smaxChatApi } from "@/lib/api/smaxChat";
import { useCan } from "@/lib/hooks/useCan";
import { useBranchStore } from "@/lib/store/branch";
import {
  COMPOSER_DEFAULT_HEIGHT,
  useChatSidebarStore,
} from "@/lib/store/chatSidebar";
import {
  buildQuickMessage,
  QUICK_ITEM_MIME,
  samePick,
  type ProductImagePick,
  type QuickItem,
} from "@/lib/chat/quickInsert";
import type {
  ChatContext,
  ChatDraft,
  ChatMessage,
  OutgoingAttachment,
} from "@/lib/types/smaxChat";
import { messagePreview, messageThumb } from "@/lib/chat/messageActions";
import { QuickInsertMenu, useQuickOptions } from "./QuickInsertMenu";
import { EmojiStickerPicker } from "./EmojiStickerPicker";
import { addRecentEmoji, addRecentSticker } from "@/lib/chat/stickers";

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT =
  "image/*,video/mp4,video/quicktime,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";

interface Props {
  // Lý do khóa ô soạn (mất kết nối, không có quyền…); null = được gửi
  disabledReason: string | null;
  // Ngữ cảnh khách đang chat — cho menu "/" và kéo thả từ bảng Thông tin POS
  // null: hội thoại chưa gắn khách POS → tắt menu "/" và kéo thả thông tin POS
  ctx: ChatContext | null;
  onSend: (draft: ChatDraft) => void;
  // Nội dung trả lại ô soạn (vd bấm Hủy ở hộp xác nhận); đổi `nonce` để áp lại
  restore?: { draft: ChatDraft; nonce: number } | null;
  // Sticker đã xuất hiện trong hội thoại — nhóm "Trong hội thoại" của bảng sticker
  threadStickerIds?: string[];
  // Khóa bản nháp theo hội thoại (đổi Trực tiếp/Nhóm/khách không mất chữ đang soạn)
  draftKey: string;
  // Đang trả lời tin này (hiện khung trích dẫn, bấm ✕ để bỏ)
  replyTo?: ChatMessage | null;
  onCancelReply?: () => void;
}

// Bản nháp chữ theo hội thoại, giữ trong phiên (không lưu xuống máy)
const drafts = new Map<string, string>();

interface Item {
  key: string;
  file: File;
  // Ảnh/video xem trước ngay từ máy, trước khi tải lên xong
  localUrl: string | null;
  status: "uploading" | "done" | "error";
  result?: OutgoingAttachment;
  error?: string;
}

// Mở menu: "/" ở đầu ô hoặc sau khoảng trắng, ngay trước con trỏ — vd "báo giá /hd12".
// Khi đã mở, chuỗi tìm nhận cả khoảng trắng ("/Lermao Xoài") tới khi Esc / chọn / xuống dòng.
const SLASH = /(^|\s)\/([^\s/]*)$/;

/**
 * Ô soạn tin: chữ + ảnh/video/tệp (📎, dán ảnh, kéo thả), gõ "/" để chèn nhanh
 * thông tin POS. Enter gửi, Shift+Enter xuống dòng.
 */
export function ChatComposer({
  disabledReason,
  ctx,
  onSend,
  restore,
  threadStickerIds = [],
  draftKey,
  replyTo,
  onCancelReply,
}: Props) {
  const [text, setText] = useState(() => drafts.get(draftKey) ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  // Ảnh sản phẩm đã chèn: hiện để tick chọn ảnh gửi kèm (mặc định chưa chọn)
  const [productPicks, setProductPicks] = useState<
    (ProductImagePick & { selected: number[] })[]
  >([]);
  const [dragging, setDragging] = useState(false);
  // Menu "/": vị trí dấu "/" trong text + chuỗi lọc
  const [slash, setSlash] = useState<{ start: number; query: string } | null>(
    null,
  );
  const [active, setActive] = useState(0);
  const [inserting, setInserting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const disabled = !!disabledReason;
  const uploading = items.some((i) => i.status === "uploading");
  const ready = items.filter((i) => i.status === "done");
  const selectedProductImages = productPicks.flatMap((p) =>
    p.images
      .filter((i) => p.selected.includes(i.id))
      .map((i) => ({ ...i, productId: p.productId, productName: p.name, kind: p.kind })),
  );
  const canSend =
    !disabled &&
    !uploading &&
    !inserting &&
    (!!text.trim() ||
      ready.length > 0 ||
      !!qrImageUrl ||
      selectedProductImages.length > 0);

  const toggleProductImage = (pick: ProductImagePick, imageId: number) =>
    setProductPicks((cur) =>
      cur.map((p) => {
        if (!samePick(p, pick)) return p;
        if (p.selected.includes(imageId))
          return { ...p, selected: p.selected.filter((x) => x !== imageId) };
        if (items.length + selectedProductImages.length >= MAX_FILES) {
          toast.warning(`Tối đa ${MAX_FILES} tệp/ảnh mỗi lần gửi`);
          return p;
        }
        return { ...p, selected: [...p.selected, imageId] };
      }),
    );

  useEffect(() => {
    if (!restore) return;
    const { draft } = restore;
    setText(draft.text);
    setQrImageUrl(draft.qrImageUrl ?? null);
    setItems((cur) => [
      ...draft.attachments.map((a) => ({
        key: `r-${a.path}`,
        file: new File([], a.name),
        localUrl: a.kind === "file" ? null : a.url,
        status: "done" as const,
        result: a,
      })),
      ...cur.filter((i) => i.status !== "done"),
    ]);
    // Gom lại theo sản phẩm, giữ tên để hiển thị
    const groups = new Map<string, ProductImagePick & { selected: number[] }>();
    for (const img of draft.productImages ?? []) {
      const gk = `${img.kind ?? "product"}-${img.productId}`;
      const g = groups.get(gk) ?? {
        productId: img.productId,
        kind: img.kind,
        name: img.productName,
        images: [],
        selected: [],
      };
      g.images.push({ id: img.id, url: img.url });
      g.selected.push(img.id);
      groups.set(gk, g);
    }
    setProductPicks([...groups.values()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore?.nonce]);

  const composerHeight = useChatSidebarStore((s) => s.composerHeight);
  const setComposerHeight = useChatSidebarStore((s) => s.setComposerHeight);
  const rootRef = useRef<HTMLDivElement>(null);

  /** Kéo thanh phân cách lên/xuống để đổi chiều cao ô soạn (khung tin co giãn theo). */
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const startH = composerHeight;
    // Chừa ít nhất ~120px cho khung tin nhắn phía trên
    const thread = rootRef.current?.parentElement;
    const maxH = Math.max(
      COMPOSER_DEFAULT_HEIGHT,
      (thread?.clientHeight ?? 600) -
        120 -
        ((rootRef.current?.offsetHeight ?? 0) - startH),
    );
    const onMove = (ev: PointerEvent) =>
      setComposerHeight(
        Math.round(
          Math.min(
            maxH,
            Math.max(COMPOSER_DEFAULT_HEIGHT, startH + startY - ev.clientY),
          ),
        ),
      );
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  useEffect(() => {
    if (text) drafts.set(draftKey, text);
    else drafts.delete(draftKey);
  }, [draftKey, text]);

  const branchId = useBranchStore((s) => s.selectedBranch?.id);
  const perms = {
    canViewDebt: ctx?.debt != null,
    canViewDebtTracking: useCan("debt_tracking", "view"),
    canViewSalePrice: useCan("products", "view_sale_price"),
    canViewPriceBooks: useCan("price_books", "view"),
    canViewStock: useCan("pos_inventory", "view"),
  };
  const { options, loading } = useQuickOptions(
    slash?.query ?? "",
    ctx,
    !!slash,
  );

  const detectSlash = (value: string, caret: number) => {
    if (!ctx) return setSlash(null);
    // Đang mở: giữ nguyên vị trí "/", chuỗi tìm là đoạn tới con trỏ (cho phép khoảng trắng)
    if (slash && value[slash.start] === "/" && caret > slash.start) {
      const query = value.slice(slash.start + 1, caret);
      if (!query.includes("\n")) {
        if (query !== slash.query) {
          setSlash({ start: slash.start, query });
          setActive(0);
        }
        return;
      }
    }
    const m = SLASH.exec(value.slice(0, caret));
    if (!m) return setSlash(null);
    setSlash({ start: caret - m[2].length - 1, query: m[2] });
    setActive(0);
  };

  /** Dựng tin cho mục và chèn vào ô soạn (thay "/query" nếu chọn từ menu). */
  const insertQuick = async (
    item: QuickItem,
    replace?: { start: number; end: number },
  ) => {
    setSlash(null);
    if (!ctx) {
      toast.info("Gắn khách POS cho hội thoại này để gửi nhanh thông tin POS");
      return;
    }
    setInserting(true);
    try {
      const result = await buildQuickMessage(item, ctx, perms, branchId);
      setText((cur) => {
        const start = replace?.start ?? cur.length;
        const end = replace?.end ?? cur.length;
        const before = cur.slice(0, start).replace(/\s+$/, "");
        const after = cur.slice(end).replace(/^\s+/, "");
        return [before, result.text, after].filter(Boolean).join("\n");
      });
      if (result.qrImageUrl) setQrImageUrl(result.qrImageUrl);
      const pick = result.productImages;
      if (pick) {
        // Mặc định chọn hết ảnh, trong giới hạn MAX_FILES tệp/ảnh mỗi lượt
        const others = productPicks.filter(
          (p) => !samePick(p, pick),
        );
        const used =
          items.length + others.reduce((n, p) => n + p.selected.length, 0);
        const room = Math.max(0, MAX_FILES - used);
        if (pick.images.length > room) {
          toast.warning(
            `Tối đa ${MAX_FILES} tệp/ảnh mỗi lần gửi — chỉ chọn sẵn ${room} ảnh`,
          );
        }
        setProductPicks([
          ...others,
          { ...pick, selected: pick.images.slice(0, room).map((i) => i.id) },
        ]);
      }
      requestAnimationFrame(() => textRef.current?.focus());
    } catch (e) {
      toast.error((e as Error).message || "Không lấy được thông tin");
    } finally {
      setInserting(false);
    }
  };

  /** Chèn emoji tại con trỏ. */
  const insertEmoji = (emoji: string) => {
    addRecentEmoji(emoji);
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText((cur) => cur.slice(0, start) + emoji + cur.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  /** Sticker gửi ngay thành 1 tin riêng, không đụng nội dung đang soạn. */
  const sendSticker = (id: string) => {
    if (disabled) return;
    addRecentSticker(id);
    setPickerOpen(false);
    onSend({ text: "", attachments: [], stickerId: id });
  };

  const pickOption = (i: number) => {
    const o = options[i];
    if (!o || !slash) return;
    const caret = textRef.current?.selectionStart ?? text.length;
    insertQuick(o.item, {
      start: slash.start,
      end: Math.max(caret, slash.start + 1 + slash.query.length),
    });
  };

  useEffect(
    () => () =>
      items.forEach((i) => i.localUrl && URL.revokeObjectURL(i.localUrl)),
    // chỉ dọn khi unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addFiles = (files: File[]) => {
    if (disabled || !files.length) return;
    const room = MAX_FILES - items.length;
    const accepted = files.slice(0, Math.max(room, 0));
    const next: Item[] = accepted.map((file, n) => ({
      key: `${Date.now()}-${n}-${file.name}`,
      file,
      localUrl: /^(image|video)\//.test(file.type)
        ? URL.createObjectURL(file)
        : null,
      status: file.size > MAX_BYTES ? "error" : "uploading",
      error: file.size > MAX_BYTES ? "Vượt quá 25MB" : undefined,
    }));
    if (files.length > accepted.length) {
      toast.warning(
        `Tối đa ${MAX_FILES} tệp mỗi lần gửi — đã bỏ ${files.length - accepted.length} tệp`,
      );
    }
    setItems((cur) => [...cur, ...next]);
    next
      .filter((i) => i.status === "uploading")
      .forEach(async (item) => {
        try {
          const [result] = await smaxChatApi.uploadAttachment(item.file);
          setItems((cur) =>
            cur.map((i) =>
              i.key === item.key ? { ...i, status: "done", result } : i,
            ),
          );
        } catch (e) {
          setItems((cur) =>
            cur.map((i) =>
              i.key === item.key
                ? {
                    ...i,
                    status: "error",
                    error: (e as Error).message || "Tải lên thất bại",
                  }
                : i,
            ),
          );
        }
      });
  };

  const remove = (key: string) =>
    setItems((cur) => {
      const item = cur.find((i) => i.key === key);
      if (item?.localUrl) URL.revokeObjectURL(item.localUrl);
      return cur.filter((i) => i.key !== key);
    });

  const submit = () => {
    if (!canSend) return;
    if (replyTo && !text.trim()) {
      toast.info("Trả lời tin cần có nội dung chữ");
      return;
    }
    onSend({
      text: text.trim(),
      attachments: ready.map((i) => i.result!),
      qrImageUrl: qrImageUrl ?? undefined,
      productImages: selectedProductImages.length
        ? selectedProductImages
        : undefined,
    });
    setText("");
    setQrImageUrl(null);
    setProductPicks([]);
    setSlash(null);
    // Giữ lại tệp lỗi để người dùng thấy và tự xóa
    setItems((cur) => {
      cur.forEach(
        (i) =>
          i.status === "done" && i.localUrl && URL.revokeObjectURL(i.localUrl),
      );
      return cur.filter((i) => i.status !== "done");
    });
  };

  return (
    <div
      ref={rootRef}
      className={`relative border-t bg-white p-2 ${dragging ? "ring-2 ring-inset ring-brand" : ""}`}
      onDragOver={(e) => {
        const types = e.dataTransfer.types;
        if (
          disabled ||
          !(types.includes("Files") || types.includes(QUICK_ITEM_MIME))
        )
          return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(false);
        // Kéo từ bảng Thông tin POS (đặt hàng / hóa đơn / công nợ)
        const quick = e.dataTransfer.getData(QUICK_ITEM_MIME);
        if (quick) {
          try {
            insertQuick(JSON.parse(quick) as QuickItem);
          } catch {
            // dữ liệu kéo không hợp lệ — bỏ qua
          }
          return;
        }
        addFiles([...e.dataTransfer.files]);
      }}
    >
      {/* Thanh phân cách: kéo để đổi cao ô soạn, bấm đúp để về mặc định */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Kéo để đổi chiều cao ô soạn tin"
        title="Kéo để mở rộng ô soạn · bấm đúp để về mặc định"
        onPointerDown={startResize}
        onDoubleClick={() => setComposerHeight(COMPOSER_DEFAULT_HEIGHT)}
        className="group absolute inset-x-0 -top-1.5 z-10 flex h-3 cursor-row-resize touch-none items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-gray-300 transition-colors group-hover:bg-brand" />
      </div>
      {disabledReason && (
        <p className="text-xs text-red-600 px-1 pb-1">{disabledReason}</p>
      )}

      {replyTo && (
        <div className="mb-2 flex items-start gap-2 rounded-md border-l-4 border-brand bg-cyan-bg px-2 py-1.5 text-xs">
          <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
          {messageThumb(replyTo) && (
            <img src={messageThumb(replyTo)!} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-gray-700">
              Trả lời {replyTo.fromMe ? "tin của bạn" : replyTo.senderName || "khách"}
            </span>
            <span className="block truncate text-gray-500">{messagePreview(replyTo)}</span>
          </span>
          <button onClick={onCancelReply} aria-label="Bỏ trả lời" className="rounded p-0.5 text-gray-500 hover:bg-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {pickerOpen && !disabled && (
        <EmojiStickerPicker
          threadStickerIds={threadStickerIds}
          onEmoji={insertEmoji}
          onSticker={sendSticker}
          onClose={() => setPickerOpen(false)}
        />
      )}
      {slash && !disabled && (
        <QuickInsertMenu
          options={options}
          loading={loading}
          activeIndex={active}
          onHover={setActive}
          onPick={(o) => pickOption(options.indexOf(o))}
        />
      )}
      {inserting && (
        <p className="flex items-center gap-1 px-1 pb-1 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang lấy thông tin POS…
        </p>
      )}
      {productPicks.map((p) => {
        const all = p.selected.length === p.images.length;
        return (
          <div
            key={`${p.kind ?? "product"}-${p.productId}`}
            className="mb-2 rounded-md border bg-gray-50 p-1.5 text-xs"
          >
            <div className="mb-1 flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center gap-1.5 min-w-0">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={() =>
                    setProductPicks((cur) =>
                      cur.map((x) =>
                        !samePick(x, p)
                          ? x
                          : {
                              ...x,
                              selected: all
                                ? []
                                : x.images
                                    .slice(
                                      0,
                                      Math.max(
                                        0,
                                        MAX_FILES -
                                          items.length -
                                          (selectedProductImages.length -
                                            x.selected.length),
                                      ),
                                    )
                                    .map((i) => i.id),
                            },
                      ),
                    )
                  }
                />
                <span className="truncate">
                  Gửi kèm ảnh <b>{p.name}</b> ({p.selected.length}/
                  {p.images.length})
                </span>
              </label>
              <button
                onClick={() =>
                  setProductPicks((cur) =>
                    cur.filter((x) => !samePick(x, p)),
                  )
                }
                aria-label="Bỏ ảnh sản phẩm"
                className="rounded p-1 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {p.images.map((img) => {
                const on = p.selected.includes(img.id);
                return (
                  <button
                    key={img.id}
                    onClick={() => toggleProductImage(p, img.id)}
                    aria-pressed={on}
                    title={on ? "Bỏ chọn ảnh này" : "Chọn gửi kèm ảnh này"}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 ${
                      on
                        ? "border-brand"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span
                      className={`absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-sm border ${
                        on
                          ? "border-brand bg-brand text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {qrImageUrl && (
        <div className="mb-2 flex items-center gap-2 rounded-md border bg-gray-50 p-1.5 text-xs">
          <img
            src={qrImageUrl}
            alt="QR chuyển khoản"
            className="h-14 w-14 rounded bg-white object-contain"
          />
          <span className="flex-1">
            <QrCode className="mr-1 inline h-3.5 w-3.5 text-brand" />
            Ảnh QR chuyển khoản sẽ gửi kèm
          </span>
          <button
            onClick={() => setQrImageUrl(null)}
            aria-label="Bỏ QR"
            className="rounded p-1 text-gray-500 hover:bg-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((i) => (
            <div
              key={i.key}
              title={i.error || i.file.name}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-gray-50 ${
                i.status === "error" ? "border-red-400" : ""
              }`}
            >
              {i.localUrl &&
              (i.file.type.startsWith("image/") ||
                i.result?.kind === "image") ? (
                <img
                  src={i.localUrl}
                  alt={i.file.name}
                  className="h-full w-full object-cover"
                />
              ) : i.localUrl ? (
                <>
                  <video
                    src={i.localUrl}
                    muted
                    className="h-full w-full object-cover"
                  />
                  <Play className="absolute inset-0 m-auto h-5 w-5 fill-white text-white drop-shadow" />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-0.5 p-1">
                  <FileText className="h-5 w-5 text-brand" />
                  <span className="w-full truncate text-center text-[10px] leading-tight">
                    {i.file.name}
                  </span>
                </div>
              )}
              {i.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Loader2 className="h-5 w-5 animate-spin text-brand" />
                </div>
              )}
              {i.status === "error" && (
                <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-0.5 text-center text-[9px] leading-tight text-white">
                  Lỗi
                </div>
              )}
              <button
                onClick={() => remove(i.key)}
                aria-label="Bỏ tệp"
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* stretch: ô soạn cao bằng cột nút bên phải, không chừa khoảng trống */}
      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            detectSlash(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) => detectSlash(text, e.currentTarget.selectionStart)}
          onBlur={() => setSlash(null)}
          onKeyDown={(e) => {
            if (slash && !e.nativeEvent.isComposing) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const n = options.length || 1;
                setActive((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
                return;
              }
              // Menu đang mở: Enter chỉ để chọn (không gửi "/từ khóa" đi), Shift+Enter vẫn xuống dòng
              if ((e.key === "Enter" && !e.shiftKey) || (e.key === "Tab" && options.length)) {
                e.preventDefault();
                if (options.length) pickOption(active);
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setSlash(null);
                return;
              }
            }
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.length) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          disabled={disabled}
          rows={2}
          style={{ minHeight: composerHeight }}
          maxLength={2000}
          placeholder={
            disabled
              ? ""
              : ctx
                ? "Nhập tin… gõ / để chèn sản phẩm, hóa đơn, công nợ (Enter gửi, Shift+Enter xuống dòng)"
                : "Nhập tin… (Enter gửi, Shift+Enter xuống dòng)"
          }
          className="flex-1 resize-none border rounded-md px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-gray-100"
        />
        {/* Cột phải: đính kèm, emoji/sticker xếp dọc trên nút Gửi */}
        <div className="flex shrink-0 flex-col items-center justify-end gap-1">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={disabled || items.length >= MAX_FILES}
              title={`Đính kèm ảnh, video, tệp (tối đa ${MAX_FILES} tệp, 25MB/tệp)`}
              aria-label="Đính kèm"
              className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              // mousedown: không làm mất con trỏ trong ô soạn
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setPickerOpen((o) => !o)}
              disabled={disabled}
              title="Emoji & sticker"
              aria-label="Emoji và sticker"
              className={`h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-40 ${
                pickerOpen ? "text-brand" : "text-gray-500"
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={submit}
            disabled={!canSend}
            aria-label="Gửi"
            title={uploading ? "Đang tải tệp lên…" : ""}
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-brand text-white disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
