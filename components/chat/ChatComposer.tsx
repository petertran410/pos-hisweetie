"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertCircle,
  FileText,
  Images,
  Loader2,
  MessageSquareText,
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
  COMPOSER_AUTO_MAX,
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
  LibraryFile,
  OutgoingAttachment,
} from "@/lib/types/smaxChat";
import { messagePreview, messageThumb } from "@/lib/chat/messageActions";
import { renderPrintImage } from "@/lib/utils/print";
import { QuickInsertMenu, useQuickOptions } from "./QuickInsertMenu";
import { EmojiStickerPicker } from "./EmojiStickerPicker";
import { ImageGalleryModal } from "./ImageGalleryModal";
import { LibraryPickerModal } from "./LibraryPickerModal";
import { QuickRepliesModal, useQuickReplies } from "./QuickRepliesModal";
import { norm, type QuickOption } from "./QuickInsertMenu";
import { addRecentEmoji, addRecentSticker } from "@/lib/chat/stickers";

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT =
  "image/*,video/mp4,video/quicktime,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";

interface Props {
  // Lý do khóa ô soạn (mất kết nối, không có quyền…); null = được gửi
  disabledReason: string | null;
  // Ngữ cảnh khách đang chat — cho menu "/" và kéo thả từ bảng Thông tin POS
  // null: hội thoại chưa gắn khách POS → menu "/" và kéo thả chỉ nhận sản phẩm
  ctx: ChatContext | null;
  onSend: (draft: ChatDraft) => void;
  // Nội dung trả lại ô soạn (vd bấm Hủy ở hộp xác nhận); đổi `nonce` để áp lại
  restore?: { draft: ChatDraft; nonce: number } | null;
  // Sticker đã xuất hiện trong hội thoại — nhóm "Trong hội thoại" của bảng sticker
  threadStickerIds?: string[];
  // Kênh gửi được sticker Zalo (chỉ Zalo cá nhân) — tắt thì bảng chỉ còn emoji
  allowSticker?: boolean;
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
// "/" chèn thông tin POS, "#" chèn tin nhắn nhanh
const SLASH = /(^|\s)([/#])([^\s/#]*)$/;

const productImageKey = (img: { productId: number; kind?: "packingSlip"; id: number }) =>
  `p-${img.kind ?? "product"}-${img.productId}-${img.id}`;

const isImageItem = (i: Item) =>
  i.file.type.startsWith("image/") || i.result?.kind === "image";

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
  allowSticker = true,
  draftKey,
  replyTo,
  onCancelReply,
}: Props) {
  const [text, setText] = useState(() => drafts.get(draftKey) ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  // Ảnh sản phẩm đã chèn: hiện để tick chọn ảnh gửi kèm (mặc định chưa chọn)
  const [productPicks, setProductPicks] = useState<
    (ProductImagePick & { selected: number[] })[]
  >([]);
  const [dragging, setDragging] = useState(false);
  // Menu "/" (thông tin POS) hoặc "#" (tin nhắn nhanh): vị trí ký tự kích hoạt + chuỗi lọc
  const [slash, setSlash] = useState<{ start: number; query: string; char: "/" | "#" } | null>(
    null,
  );
  const [quickOpen, setQuickOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [inserting, setInserting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const disabled = !!disabledReason;
  const uploading = items.some((i) => i.status === "uploading");
  const ready = items.filter((i) => i.status === "done");
  // Ảnh đính kèm: bấm để xem lớn, chuyển qua lại giữa các ảnh
  const [preview, setPreview] = useState<number | null>(null);
  const selectedProductImages = productPicks.flatMap((p) =>
    p.images
      .filter((i) => p.selected.includes(i.id))
      .map((i) => ({ ...i, productId: p.productId, productName: p.name, kind: p.kind })),
  );
  // Ảnh trong dải đính kèm (tệp tải lên + ảnh sản phẩm/báo đơn đã chèn) — bấm để xem lớn
  const gallery = [
    ...items
      .filter((i) => i.localUrl && isImageItem(i))
      .map((i) => ({ key: i.key, url: i.localUrl!, name: i.file.name })),
    ...selectedProductImages.map((img) => ({
      key: productImageKey(img),
      url: img.url,
      name: img.productName,
    })),
  ];
  const openPreview = (key: string) =>
    setPreview(gallery.findIndex((g) => g.key === key));

  const canSend =
    !disabled &&
    !uploading &&
    !inserting &&
    (!!text.trim() ||
      ready.length > 0 ||
      !!qrImageUrl ||
      selectedProductImages.length > 0);

  // Bỏ 1 ảnh sản phẩm / báo đơn khỏi dải đính kèm (không gửi kèm nữa)
  const removeProductImage = (img: { productId: number; kind?: "packingSlip"; id: number }) =>
    setProductPicks((cur) =>
      cur
        .map((p) =>
          samePick(p, img)
            ? { ...p, selected: p.selected.filter((x) => x !== img.id) }
            : p,
        )
        .filter((p) => p.selected.length > 0),
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
  const [focused, setFocused] = useState(false);

  // Ô soạn tự giãn theo nội dung: thấp nhất = chiều cao đã kéo (mặc định 1 dòng),
  // cao nhất ~6 dòng (hoặc chiều cao đã kéo nếu lớn hơn) rồi cuộn trong ô
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.max(COMPOSER_AUTO_MAX, composerHeight);
    const h = Math.min(Math.max(el.scrollHeight, composerHeight), max);
    el.style.height = `${h}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, [text, composerHeight]);

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
  const pos = useQuickOptions(
    slash?.query ?? "",
    ctx,
    slash?.char === "/",
  );
  const hash = slash?.char === "#";
  const quickReplies = useQuickReplies(hash);
  // Menu "#": tin riêng trước, rồi tin chung; lọc theo mã gõ tắt / nội dung
  const replyOptions: QuickOption[] = (() => {
    if (!hash || !quickReplies.data) return [];
    const q = norm(slash.query);
    const pick = (list: typeof quickReplies.data.mine, group: string) =>
      list
        .filter((r) => !q || norm(r.shortcut).includes(q) || norm(r.content).includes(q))
        .sort((a, b) => Number(!norm(a.shortcut).startsWith(q)) - Number(!norm(b.shortcut).startsWith(q)))
        .map((r) => ({
          key: `qr-${r.id}`,
          group,
          label: `#${r.shortcut}`,
          preview: r.content.trim(),
          media: r.media,
          icon: "quick" as const,
          item: { type: "text" as const, text: r.content, media: r.media },
        }));
    return [...pick(quickReplies.data.mine, "Của tôi"), ...pick(quickReplies.data.shared, "Chung")];
  })();
  const options = hash ? replyOptions : pos.options;
  const loading = hash ? quickReplies.isFetching : pos.loading;

  const detectSlash = (value: string, caret: number) => {
    // Đang mở: giữ nguyên vị trí "/", chuỗi tìm là đoạn tới con trỏ (cho phép khoảng trắng)
    if (slash && value[slash.start] === slash.char && caret > slash.start) {
      const query = value.slice(slash.start + 1, caret);
      if (!query.includes("\n")) {
        if (query !== slash.query) {
          setSlash({ ...slash, query });
          setActive(0);
        }
        return;
      }
    }
    const m = SLASH.exec(value.slice(0, caret));
    if (!m) return setSlash(null);
    setSlash({ start: caret - m[3].length - 1, query: m[3], char: m[2] as "/" | "#" });
    setActive(0);
  };

  /** Dựng tin cho mục và chèn vào ô soạn (thay "/query" nếu chọn từ menu). */
  const insertQuick = async (
    item: QuickItem,
    replace?: { start: number; end: number },
  ) => {
    setSlash(null);
    if (!ctx && item.type !== "product" && item.type !== "text") {
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
      if (result.attachments?.length) addReadyAttachments(result.attachments);
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
      // Ảnh bản in: chụp xong mới cho gửi (vẫn đang "inserting") rồi tải lên như tệp đính kèm
      const print = result.printImage;
      if (print) {
        try {
          addFiles([await renderPrintImage(print.templateFor, print.id, print.name)]);
        } catch (e) {
          toast.warning(`Không chụp được bản in ${print.name}: ${(e as Error).message}`);
        }
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

  /** Tệp đã có trên POS (media tin nhắn nhanh) → thêm thẳng vào danh sách đính kèm. */
  const addReadyAttachments = (list: OutgoingAttachment[]) => {
    const room = Math.max(MAX_FILES - items.length, 0);
    if (list.length > room) {
      toast.warning(`Tối đa ${MAX_FILES} tệp mỗi lần gửi — đã bỏ ${list.length - room} tệp của tin nhắn nhanh`);
    }
    const stamp = Date.now();
    setItems((cur) => [
      ...cur,
      ...list.slice(0, room).map((a, n) => ({
        key: `qr-${stamp}-${n}-${a.path}`,
        file: new File([], a.name),
        localUrl: a.kind === "file" ? null : a.url,
        status: "done" as const,
        result: a,
      })),
    ]);
  };

  /** Tệp chọn từ Thư viện Smax: backend tải về như tệp tải lên → gửi chung luồng đính kèm. */
  const addLibraryFiles = (files: LibraryFile[]) => {
    if (disabled || !files.length) return;
    const accepted = files.slice(0, Math.max(MAX_FILES - items.length, 0));
    const next: Item[] = accepted.map((f, n) => ({
      key: `lib-${Date.now()}-${n}-${f.id}`,
      file: new File([], f.name, { type: f.mime }),
      localUrl: f.mime.startsWith("image/") ? f.url : null,
      status: "uploading",
    }));
    setItems((cur) => [...cur, ...next]);
    next.forEach(async (item, n) => {
      try {
        const [result] = await smaxChatApi.importLibraryFile(accepted[n]);
        setItems((cur) => cur.map((i) => (i.key === item.key ? { ...i, status: "done", result } : i)));
      } catch (e) {
        setItems((cur) =>
          cur.map((i) =>
            i.key === item.key
              ? { ...i, status: "error", error: (e as Error).message || "Không lấy được tệp từ Thư viện" }
              : i,
          ),
        );
      }
    });
  };

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
      className={`relative border-t bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${dragging ? "ring-2 ring-inset ring-brand" : ""}`}
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
          <button onClick={onCancelReply} aria-label="Bỏ trả lời" className="rounded p-1 text-gray-500 hover:bg-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {pickerOpen && !disabled && (
        <EmojiStickerPicker
          threadStickerIds={threadStickerIds}
          onEmoji={insertEmoji}
          onSticker={allowSticker ? sendSticker : undefined}
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
          title={hash ? "Tin nhắn nhanh" : undefined}
          emptyText={
            hash
              ? quickReplies.data && !quickReplies.data.mine.length && !quickReplies.data.shared.length
                ? "Chưa có tin nhắn nhanh — bấm biểu tượng tin nhắn nhanh để thêm."
                : "Không có tin nhắn nhanh phù hợp."
              : undefined
          }
        />
      )}
      {inserting && (
        <p className="flex items-center gap-1 px-1 pb-1 text-xs text-gray-500">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang lấy thông tin POS…
        </p>
      )}
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

      {(items.length > 0 || selectedProductImages.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((i) => (
            <div
              key={i.key}
              title={i.error || i.file.name}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-gray-50 ${
                i.status === "error" ? "border-red-400" : ""
              }`}
            >
              {i.localUrl && isImageItem(i) ? (
                <button
                  onClick={() =>
                    openPreview(i.key)
                  }
                  title="Xem ảnh"
                  className="h-full w-full cursor-zoom-in"
                >
                  <img
                    src={i.localUrl}
                    alt={i.file.name}
                    className="h-full w-full object-cover"
                  />
                </button>
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
                  <span className="w-full truncate text-center text-[11px] leading-tight">
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
                <div
                  role="img"
                  aria-label={`Lỗi tải lên: ${i.error || i.file.name}`}
                  className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-red-600/90 py-0.5 text-[11px] font-medium leading-none text-white"
                >
                  <AlertCircle className="h-3 w-3" aria-hidden />
                  Lỗi
                </div>
              )}
              <button
                onClick={() => remove(i.key)}
                aria-label="Bỏ tệp"
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {selectedProductImages.map((img) => {
            const key = productImageKey(img);
            return (
              <div
                key={key}
                title={img.productName}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-gray-50"
              >
                <button
                  onClick={() => openPreview(key)}
                  title="Xem ảnh"
                  className="h-full w-full cursor-zoom-in"
                >
                  <img
                    src={img.url}
                    alt={img.productName}
                    className="h-full w-full object-cover"
                  />
                </button>
                <button
                  onClick={() => removeProductImage(img)}
                  aria-label="Bỏ ảnh"
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {preview !== null && gallery.length > 0 && (
        <ImageGalleryModal
          images={gallery}
          index={Math.min(Math.max(preview, 0), gallery.length - 1)}
          onClose={() => setPreview(null)}
        />
      )}
      {quickOpen && (
        <QuickRepliesModal
          onInsert={(r) => insertQuick({ type: "text", text: r.content, media: r.media })}
          onClose={() => setQuickOpen(false)}
        />
      )}
      {libraryOpen && (
        <LibraryPickerModal
          max={Math.max(MAX_FILES - items.length, 0)}
          onPick={addLibraryFiles}
          onClose={() => setLibraryOpen(false)}
        />
      )}

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
      {/* Ô soạn tự giãn theo nội dung; thanh công cụ + nút Gửi nằm ngang bên dưới */}
      <div
        className={`rounded-lg border transition-colors focus-within:border-brand ${
          disabled ? "bg-gray-100" : "bg-white"
        }`}
      >
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              detectSlash(e.target.value, e.target.selectionStart);
            }}
            onClick={(e) => detectSlash(text, e.currentTarget.selectionStart)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setSlash(null);
              setFocused(false);
            }}
            onKeyDown={(e) => {
              // "#" không khớp tin nhắn nhanh nào (vd hashtag thường) → Enter gửi tin như bình thường
              if (hash && !options.length && e.key === "Enter" && !e.shiftKey) setSlash(null);
              else if (slash && !e.nativeEvent.isComposing) {
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
            rows={1}
            maxLength={2000}
            placeholder={
              disabled
                ? ""
                : ctx
                  ? "Nhập tin…  / chèn SP, HĐ, công nợ · # tin nhắn nhanh"
                  : "Nhập tin…  / chèn sản phẩm · # tin nhắn nhanh"
            }
            aria-label="Nội dung tin nhắn"
            className="block w-full resize-none bg-transparent px-3 pt-2 pb-1 text-sm leading-5 outline-none max-lg:text-base"
          />
        <div className="flex items-center gap-0.5 px-1 pb-1">
          <button
            onClick={() => setQuickOpen(true)}
            disabled={disabled}
            title="Tin nhắn nhanh (gõ # trong ô chat để chèn nhanh)"
            aria-label="Tin nhắn nhanh"
            className="chat-tap h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand disabled:opacity-40"
          >
            <MessageSquareText className="w-4 h-4" />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={disabled || items.length >= MAX_FILES}
            title={`Đính kèm ảnh, video, tệp (tối đa ${MAX_FILES} tệp, 25MB/tệp)`}
            aria-label="Đính kèm"
            className="chat-tap h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand disabled:opacity-40"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            onClick={() => setLibraryOpen(true)}
            disabled={disabled || items.length >= MAX_FILES}
            title="Thư viện Smax — chọn ảnh/tệp có sẵn"
            aria-label="Thư viện"
            className="chat-tap h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand disabled:opacity-40"
          >
            <Images className="w-4 h-4" />
          </button>
          <button
            // mousedown: không làm mất con trỏ trong ô soạn
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setPickerOpen((o) => !o)}
            disabled={disabled}
            title="Emoji & sticker"
            aria-label="Emoji và sticker"
            aria-expanded={pickerOpen}
            className={`chat-tap h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 hover:text-brand disabled:opacity-40 ${
              pickerOpen ? "bg-cyan-bg text-brand" : "text-gray-500"
            }`}
          >
            <Smile className="w-4 h-4" />
          </button>
          <span className="ml-auto min-w-0 truncate px-1 text-xs text-gray-500" aria-hidden>
            {focused && !disabled ? "Enter gửi · Shift+Enter xuống dòng" : ""}
          </span>
          <button
            onClick={submit}
            disabled={!canSend}
            aria-label={uploading ? "Gửi (đang tải tệp lên…)" : "Gửi"}
            title={uploading ? "Đang tải tệp lên…" : "Gửi (Enter)"}
            className="chat-tap h-8 shrink-0 inline-flex items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-white hover:bg-brand-bright disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
}
