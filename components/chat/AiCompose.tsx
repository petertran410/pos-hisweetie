"use client";

import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { useCan } from "@/lib/hooks/useCan";
import { formatCurrency } from "@/lib/utils";
import {
  MODE_LABEL,
  REWRITE_LABEL,
  orderConfirmText,
  savePosOrderDraft,
  type ComposeMode,
  type OrderResult,
  type RewriteStyle,
  type SummaryResult,
  type ComposeRequest,
  type ImageReadResult,
} from "@/lib/ai/ai-compose";
import { buildSepayTxHref } from "@/lib/sepay/notification";
import type { QuickReply } from "@/lib/types/smaxChat";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { NumericInput } from "@/components/ui/NumericInput";
import { CustomTooltip } from "@/components/ui/CustomTooltip";
import { useQuickReplies } from "./QuickRepliesModal";

export type AiComposeState = {
  mode: ComposeMode;
  style?: RewriteStyle;
  loading: boolean;
  error?: string;
  drafts?: string[];
  order?: OrderResult;
  quickIds?: number[];
  summary?: SummaryResult;
  /** Câu khách đang được soạn trả lời riêng (từ tóm tắt). */
  focus?: string;
  /** Tham số thêm của lượt (vd ảnh cần đọc) — dùng lại khi "Soạn lại". */
  extra?: Partial<ComposeRequest>;
  image?: ImageReadResult;
};

const MENU: { mode: ComposeMode; hint: string }[] = [
  { mode: "reply", hint: "2–3 phương án, tra giá & tồn kho" },
  { mode: "order", hint: "Đọc món khách đặt, tính giá theo bảng giá" },
  { mode: "reminder", hint: "Dùng công nợ thật + QR" },
  { mode: "complaint", hint: "Xin lỗi, xin ảnh/date/số lô" },
  { mode: "quick", hint: "Chọn sẵn từ tin nhắn nhanh" },
];

/** Nút ✨ trên thanh công cụ ô soạn: menu các kiểu soạn bằng AI. */
export function AiComposeMenu({
  disabled,
  hasCustomer,
  debt,
  hasDraft,
  unread,
  onPick,
}: {
  disabled: boolean;
  /** Số tin chưa đọc lúc mở hội thoại (cho mục Tóm tắt). */
  unread: number;
  hasCustomer: boolean;
  /** Công nợ khách đang chat; null = không có quyền xem / chưa gắn khách. */
  debt: number | null;
  hasDraft: boolean;
  onPick: (mode: ComposeMode, style?: RewriteStyle) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rewrite, setRewrite] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const blocked = (mode: ComposeMode) =>
    mode === "order" && !hasCustomer
      ? "Gắn khách POS để tính giá theo bảng giá của khách"
      : mode === "reminder" && !(debt !== null && debt > 0)
        ? !hasCustomer
          ? "Gắn khách POS để lấy công nợ"
          : debt === null
            ? "Bạn không có quyền xem công nợ"
            : "Khách không còn công nợ"
        : null;
  const pick = (mode: ComposeMode, style?: RewriteStyle) => {
    setOpen(false);
    setRewrite(false);
    onPick(mode, style);
  };
  return (
    // Không "relative": menu neo theo khung ô soạn (cha relative) để không tràn khi khung chat hẹp
    <div ref={ref}>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label="Soạn bằng AI"
        aria-expanded={open}
        title="Soạn bằng AI"
        className={`chat-tap flex h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium hover:bg-cyan-bg disabled:opacity-40 ${
          open ? "bg-cyan-bg text-brand" : "text-brand-deep"
        }`}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        AI
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          className="absolute bottom-full left-2 z-30 mb-1 w-[min(300px,calc(100%-1rem))] rounded-lg border bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick("summary")}
            className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-cyan-bg"
          >
            <span className="text-sm text-gray-800">
              {unread > 0 ? `Tóm tắt ${unread} tin chưa đọc` : "Tóm tắt hội thoại"}
            </span>
            <span className="text-[11px] text-gray-500">Ai cần gì, câu nào chưa trả lời</span>
          </button>
          <div className="my-1 border-t" />
          {MENU.map(({ mode, hint }) => {
            const reason = blocked(mode);
            return (
              <button
                key={mode}
                type="button"
                role="menuitem"
                disabled={!!reason}
                title={reason ?? undefined}
                onClick={() => pick(mode)}
                className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-cyan-bg disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent"
              >
                <span className="text-sm text-gray-800">
                  {MODE_LABEL[mode]}
                </span>
                <span className="text-[11px] text-gray-500">
                  {reason ?? hint}
                </span>
              </button>
            );
          })}
          <div className="my-1 border-t" />
          <button
            type="button"
            role="menuitem"
            disabled={!hasDraft}
            aria-expanded={rewrite}
            title={hasDraft ? undefined : "Gõ nội dung vào ô soạn trước"}
            onClick={() => setRewrite((r) => !r)}
            className="flex w-full items-center px-3 py-1.5 text-left hover:bg-cyan-bg disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="flex flex-1 flex-col">
              <span className="text-sm text-gray-800">
                Viết lại tin đang gõ
              </span>
              <span className="text-[11px] text-gray-500">
                {hasDraft ? "Chọn kiểu viết lại" : "Gõ nội dung trước"}
              </span>
            </span>
            <ChevronRight
              className={`h-4 w-4 text-gray-400 ${rewrite ? "rotate-90" : ""}`}
              aria-hidden
            />
          </button>
          {rewrite && hasDraft && (
            <div className="flex flex-wrap gap-1 px-3 pb-2 pt-1">
              {(Object.keys(REWRITE_LABEL) as RewriteStyle[]).map((style) => (
                <button
                  key={style}
                  type="button"
                  role="menuitem"
                  onClick={() => pick("rewrite", style)}
                  className="rounded-full border border-brand-border px-2 py-0.5 text-xs text-brand-deep hover:bg-cyan-bg"
                >
                  {REWRITE_LABEL[style]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Khung kết quả phía trên ô soạn: bản nháp / tin nhắn nhanh / bảng duyệt đơn. */
export function AiComposePanel({
  state,
  onRetry,
  onClose,
  onUse,
  onQuick,
  onJump,
  onReplyTo,
  onRun,
}: {
  state: AiComposeState;
  onRetry: () => void;
  onClose: () => void;
  onUse: (text: string) => void;
  onQuick: (reply: QuickReply) => void;
  /** Cuộn tới tin trong khung chat (tóm tắt). */
  onJump: (messageId: string) => void;
  /** Soạn trả lời riêng một câu của khách (tóm tắt). */
  onReplyTo: (question: string) => void;
  /** Chạy một kiểu soạn khác (vd từ ảnh hàng lỗi → trả lời khiếu nại). */
  onRun: (mode: ComposeMode) => void;
}) {
  const title =
    state.mode === "rewrite" && state.style
      ? `Viết lại: ${REWRITE_LABEL[state.style]}`
      : MODE_LABEL[state.mode];
  return (
    <div
      className="mb-2 rounded-lg border border-brand-border bg-ai-surface text-sm"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5 border-b border-brand-border px-2.5 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
        <span className="flex-1 text-xs font-semibold text-brand-dark">
          {title}
        </span>
        {!state.loading && (
          <button
            type="button"
            onClick={onRetry}
            title="Soạn lại"
            aria-label="Soạn lại"
            className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-white"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Đóng"
          aria-label="Đóng gợi ý AI"
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="max-h-[45vh] overflow-y-auto p-2">
        {state.loading ? (
          <p className="m-0 flex items-center gap-2 px-1 py-1 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {state.mode === "order"
              ? "Đang đọc món khách đặt và tính giá…"
              : "Đang soạn…"}
          </p>
        ) : state.error ? (
          <p
            className="m-0 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700"
            role="alert"
          >
            {state.error}
          </p>
        ) : state.order ? (
          <OrderReview order={state.order} onUse={onUse} />
        ) : state.image ? (
          <ImageReadView result={state.image} onUse={onUse} onRun={onRun} />
        ) : state.summary ? (
          <SummaryView summary={state.summary} onJump={onJump} onReplyTo={onReplyTo} />
        ) : state.quickIds ? (
          <QuickPicks ids={state.quickIds} onPick={onQuick} />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {(state.drafts ?? []).map((draft, i) => (
              <li
                key={i}
                className="rounded-md border border-cyan-pale bg-white p-2"
              >
                <p className="m-0 whitespace-pre-wrap break-words text-[13px] leading-snug text-gray-800">
                  {draft}
                </p>
                <div className="mt-1.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onUse(draft)}
                    className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-bright"
                  >
                    Dùng bản này
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!state.loading && !state.error && state.mode !== "quick" && (
        <p className="m-0 border-t border-brand-border px-2.5 py-1 text-[11px] text-gray-500">
          AI soạn nháp: đọc lại, sửa trong ô soạn rồi mới gửi.
        </p>
      )}
    </div>
  );
}

function QuickPicks({
  ids,
  onPick,
}: {
  ids: number[];
  onPick: (reply: QuickReply) => void;
}) {
  const { data, isLoading } = useQuickReplies(true);
  const all = [...(data?.mine ?? []), ...(data?.shared ?? [])];
  const picks = ids
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is QuickReply => !!r);
  if (isLoading)
    return (
      <p className="m-0 px-1 text-xs text-gray-500">Đang tải tin nhắn nhanh…</p>
    );
  if (!picks.length)
    return (
      <p className="m-0 px-1 text-xs text-gray-500">
        Không có tin nhắn nhanh nào phù hợp với tin mới nhất.
      </p>
    );
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {picks.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => onPick(r)}
            className="w-full rounded-md border border-cyan-pale bg-white p-2 text-left hover:border-brand"
          >
            <span className="text-xs font-semibold text-brand">
              #{r.shortcut}
            </span>
            {r.media.length > 0 && (
              <span className="ml-1 text-[11px] text-gray-500">
                · {r.media.length} tệp kèm
              </span>
            )}
            <span className="mt-0.5 line-clamp-3 block whitespace-pre-wrap text-[13px] text-gray-700">
              {r.content}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const vnd = (n: number) => `${formatCurrency(Math.round(n))}đ`;

/** Duyệt đơn AI đọc được: chọn đúng sản phẩm, sửa số lượng, rồi chèn tin xác nhận / tạo đơn nháp. */
function OrderReview({
  order,
  onUse,
}: {
  order: OrderResult;
  onUse: (text: string) => void;
}) {
  const router = useRouter();
  const canCreateOrder = useCan("orders", "create");
  // Sửa đơn giá theo cùng quyền sửa giá trên màn Bán hàng
  const canEditPrice = useCan("pos_price", "update");
  // choice: vị trí trong candidates, -1 = bỏ dòng; price: đơn giá đã sửa (null = giá gợi ý)
  const [rows, setRows] = useState(() =>
    order.lines.map((l) => ({
      choice: l.candidates.length ? 0 : -1,
      quantity: l.quantity,
      price: null as number | null,
    })),
  );
  const setRow = (i: number, change: Partial<(typeof rows)[number]>) =>
    setRows((cur) => cur.map((r, j) => (j === i ? { ...r, ...change } : r)));
  const [delivery, setDelivery] = useState(order.delivery);
  const [note, setNote] = useState(order.note ?? "");
  const chosen = useMemo(
    () =>
      rows
        .map((r, i) => {
          if (r.choice < 0 || r.quantity <= 0) return null;
          const candidate = order.lines[i].candidates[r.choice];
          return {
            candidate:
              r.price !== null ? { ...candidate, price: r.price } : candidate,
            quantity: r.quantity,
          };
        })
        .filter((l): l is NonNullable<typeof l> => !!l),
    [rows, order.lines],
  );
  const priced =
    order.priceVisible && chosen.every((l) => l.candidate.price !== null);
  const total = chosen.reduce(
    (s, l) => s + (l.candidate.price ?? 0) * l.quantity,
    0,
  );

  if (!order.lines.length)
    return (
      <p className="m-0 px-1 text-xs text-gray-500">
        Chưa thấy khách đặt món nào trong các tin gần đây.
      </p>
    );

  const createDraft = () => {
    savePosOrderDraft({
      customerId: order.customer?.id ?? null,
      priceBookId: order.priceBook?.id ?? null,
      priceBookName: order.priceBook?.id ? order.priceBook.name : null,
      items: chosen.map((l) => ({
        productId: l.candidate.productId,
        quantity: l.quantity,
        price: l.candidate.price,
      })),
      note: [
        delivery.date && `Ngày giao: ${delivery.date}`,
        delivery.address && `Giao: ${delivery.address}`,
        note,
      ]
        .filter(Boolean)
        .join(" · "),
    });
    router.push("/ban-hang?aiOrderDraft=1");
  };

  return (
    <div className="flex flex-col gap-2">
      {order.priceBook && (
        <p className="m-0 px-1 text-[11px] text-gray-600">
          Món khách đã mua: giá hoá đơn gần nhất. Món khác: theo{" "}
          <span className="font-semibold text-brand-dark">
            {order.priceBook.name}
          </span>{" "}
          ({order.priceBook.source}).
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {order.lines.map((line, i) => {
          const row = rows[i];
          const pick = row.choice >= 0 ? line.candidates[row.choice] : null;
          return (
            <li
              key={i}
              className="rounded-md border border-cyan-pale bg-white p-2"
            >
              <p className="m-0 text-[11px] text-gray-500">
                Khách ghi:{" "}
                <span className="text-gray-700">
                  {line.quantity} {line.unit ?? ""} {line.text}
                </span>
                {line.note ? ` · ${line.note}` : ""}
              </p>
              {line.candidates.length ? (
                <div className="mt-1">
                  <SearchableSelect
                    size="sm"
                    value={String(row.choice)}
                    // Đổi sản phẩm → bỏ giá đã sửa, dùng giá gợi ý của sản phẩm mới
                    onChange={(v) =>
                      setRow(i, { choice: Number(v), price: null })
                    }
                    options={[
                      ...line.candidates.map((c, j) => ({
                        value: String(j),
                        label: `${c.code} · ${c.name}${c.unit ? ` (${c.unit})` : ""}${c.bought ? " · đã mua" : ""}`,
                      })),
                      { value: "-1", label: "— Bỏ dòng này —" },
                    ]}
                  />
                </div>
              ) : (
                <p className="m-0 mt-1 text-xs text-amber-700">
                  Không tìm thấy sản phẩm khớp: thêm tay trên màn Bán hàng.
                </p>
              )}
              {pick && (
                <PriceRow
                  pick={pick}
                  showPrice={order.priceVisible && pick.price !== null}
                  price={row.price ?? pick.price ?? 0}
                  edited={row.price !== null && row.price !== pick.price}
                  quantity={row.quantity}
                  editable={canEditPrice}
                  label={line.text}
                  bookName={order.priceBook?.id ? order.priceBook.name : null}
                  onQuantity={(quantity) => setRow(i, { quantity })}
                  onChange={(price) => setRow(i, { price })}
                  onReset={() => setRow(i, { price: null })}
                />
              )}
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-xs">
        <label htmlFor="ai-order-date" className="text-gray-500">
          Ngày giao
        </label>
        <input
          id="ai-order-date"
          value={delivery.date ?? ""}
          onChange={(e) =>
            setDelivery((d) => ({ ...d, date: e.target.value || null }))
          }
          className="h-7 rounded border border-brand-border px-1.5"
        />
        <label htmlFor="ai-order-address" className="text-gray-500">
          Địa chỉ
        </label>
        <input
          id="ai-order-address"
          value={delivery.address ?? ""}
          onChange={(e) =>
            setDelivery((d) => ({ ...d, address: e.target.value || null }))
          }
          className="h-7 rounded border border-brand-border px-1.5"
        />
        <label htmlFor="ai-order-note" className="text-gray-500">
          Ghi chú
        </label>
        <input
          id="ai-order-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-7 rounded border border-brand-border px-1.5"
        />
      </div>
      {priced && chosen.length > 0 && (
        <p className="m-0 text-right text-xs">
          Tổng tiền hàng:{" "}
          <span className="font-semibold text-brand-dark">{vnd(total)}</span>
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-1.5">
        {canCreateOrder && (
          <button
            type="button"
            disabled={!chosen.length}
            onClick={createDraft}
            title="Mở màn Bán hàng với tab Đặt hàng đã điền sẵn — kiểm tra rồi mới lưu"
            className="flex items-center gap-1 rounded-md border border-brand px-2.5 py-1 text-xs font-medium text-brand-deep hover:bg-white disabled:opacity-40"
          >
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden /> Tạo đơn đặt
            hàng nháp
          </button>
        )}
        <button
          type="button"
          disabled={!chosen.length}
          onClick={() =>
            onUse(
              orderConfirmText(chosen, {
                delivery,
                note: note || null,
                priceVisible: order.priceVisible,
              }),
            )
          }
          className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-bright disabled:opacity-40"
        >
          Chèn tin xác nhận
        </button>
      </div>
    </div>
  );
}

/** Số lượng + đơn giá một dòng: ô sửa giá (nếu có quyền), nguồn giá gợi ý, thành tiền. */
function PriceRow({
  pick,
  showPrice,
  price,
  edited,
  quantity,
  editable,
  label,
  bookName,
  onQuantity,
  onChange,
  onReset,
}: {
  pick: OrderResult["lines"][number]["candidates"][number];
  showPrice: boolean;
  price: number;
  edited: boolean;
  quantity: number;
  editable: boolean;
  label: string;
  bookName: string | null;
  onQuantity: (quantity: number) => void;
  onChange: (price: number) => void;
  onReset: () => void;
}) {
  const unit = pick.unit ? `/${pick.unit.toLowerCase()}` : "";
  const source = pick.lastInvoice
    ? `giá ${pick.lastInvoice.code} ngày ${pick.lastInvoice.date}`
    : null;
  // Nguồn giá gợi ý: di chuột vào đơn giá để xem (250ms)
  const hint = source
    ? `Giá khách mua ở ${pick.lastInvoice!.code} ngày ${pick.lastInvoice!.date}`
    : pick.inBook && bookName
      ? `Giá theo ${bookName}`
      : null;
  const withHint = (node: React.ReactNode) =>
    hint ? (
      <CustomTooltip content={hint} delayMs={250}>
        {node}
      </CustomTooltip>
    ) : (
      node
    );
  return (
    <div className="mt-1 text-[11px] text-gray-500">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <span>SL</span>
        <input
          type="number"
          min={0}
          step="any"
          value={quantity}
          onChange={(e) => onQuantity(Math.max(0, Number(e.target.value) || 0))}
          aria-label={`Số lượng "${label}"`}
          className="h-7 w-14 rounded border border-brand-border px-1.5 text-right text-xs"
        />
        {pick.unit && !showPrice && (
          <span className="-ml-1">{pick.unit.toLowerCase()}</span>
        )}
        {!showPrice ? null : editable ? (
          <>
            <span>Đơn giá</span>
            {withHint(
              <NumericInput
                value={price}
                onValueChange={(v) => onChange(Math.max(0, Math.round(v)))}
                maxFractionDigits={0}
                className={`h-7 w-24 rounded border px-1.5 text-right text-xs ${edited ? "border-amber-400 bg-amber-50" : "border-brand-border"}`}
              />,
            )}
            <span className="-ml-1">đ{unit}</span>
          </>
        ) : (
          withHint(
            <span>
              {vnd(price)}
              {unit}
            </span>,
          )
        )}
        {showPrice && (
          <span>
            ={" "}
            <span className="font-medium text-gray-800">
              {vnd(price * quantity)}
            </span>
          </span>
        )}
      </div>
      {showPrice && (edited || (!pick.inBook && bookName)) && (
        <p className="m-0 mt-0.5 text-right" aria-live="polite">
          {edited ? (
            <>
              <span className="text-amber-700">
                Đã sửa giá (gợi ý {vnd(pick.price ?? 0)}
                {source ? `, ${source}` : ""})
              </span>{" "}
              <button
                type="button"
                onClick={onReset}
                className="text-brand underline"
                aria-label={`Về giá gợi ý cho "${label}"`}
              >
                Về giá gợi ý
              </button>
            </>
          ) : !pick.inBook && bookName ? (
            <span className="text-amber-700">
              Không có trong {bookName}: đang dùng giá gốc
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

/** Kết quả tóm tắt: tổng quan, câu chưa trả lời (đến tin / soạn trả lời), ai cần gì, việc cần làm. */
function SummaryView({
  summary,
  onJump,
  onReplyTo,
}: {
  summary: SummaryResult;
  onJump: (messageId: string) => void;
  onReplyTo: (question: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-[13px] text-gray-800">
      <p className="m-0 px-1 leading-snug">
        <span className="text-[11px] text-gray-500">Đọc {summary.count} tin · </span>
        {summary.overview}
      </p>
      {summary.unanswered.length > 0 && (
        <section aria-label="Chưa được trả lời">
          <h5 className="m-0 mb-1 px-1 text-xs font-semibold text-red-700">
            Chưa được trả lời ({summary.unanswered.length})
          </h5>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {summary.unanswered.map((u) => (
              <li key={u.messageId} className="rounded-md border border-red-100 bg-white p-2">
                <p className="m-0 text-[11px] text-gray-500">
                  {u.who} · {hm(u.time)}
                </p>
                <p className="m-0 leading-snug">{u.text}</p>
                <div className="mt-1 flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => onJump(u.messageId)}
                    className="rounded border border-brand-border px-2 py-0.5 text-xs text-brand-deep hover:bg-cyan-bg"
                  >
                    Đến tin
                  </button>
                  <button
                    type="button"
                    onClick={() => onReplyTo(`${u.who}: ${u.text}`)}
                    className="rounded bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-bright"
                  >
                    Soạn trả lời
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {summary.needs.length > 0 && (
        <section aria-label="Ai cần gì">
          <h5 className="m-0 mb-1 px-1 text-xs font-semibold text-gray-600">Ai cần gì</h5>
          <ul className="m-0 flex list-none flex-col gap-0.5 px-1">
            {summary.needs.map((n, i) => (
              <li key={i}>
                <span className="font-medium">{n.who}</span>: {n.need}
              </li>
            ))}
          </ul>
        </section>
      )}
      {summary.todo.length > 0 && (
        <section aria-label="Việc cần làm">
          <h5 className="m-0 mb-1 px-1 text-xs font-semibold text-gray-600">Việc cần làm</h5>
          <ul className="m-0 list-disc pl-5">
            {summary.todo.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const vndText = (n: number) => `${formatCurrency(n)}đ`;

/** Kết quả đọc ảnh: chuyển khoản (+ giao dịch SePay khớp), phiếu gửi hàng, hàng lỗi. */
function ImageReadView({
  result,
  onRun,
}: {
  result: ImageReadResult;
  onUse: (text: string) => void;
  onRun: (mode: ComposeMode) => void;
}) {
  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <p className="m-0">
        <span className="text-gray-500">{label}: </span>
        {value}
      </p>
    ) : null;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã chép");
    } catch {
      toast.error("Trình duyệt chặn sao chép");
    }
  };
  return (
    <div className="flex flex-col gap-2 text-[13px] text-gray-800">
      {result.summary && <p className="m-0 px-1">{result.summary}</p>}
      {result.transfer && (
        <div className="rounded-md border border-cyan-pale bg-white p-2">
          <p className="m-0 mb-1 text-xs font-semibold text-brand-dark">Ảnh chuyển khoản</p>
          {row("Số tiền", result.transfer.amount !== null ? vndText(result.transfer.amount) : null)}
          {row("Nội dung", result.transfer.content)}
          {row("Ngân hàng", result.transfer.bank)}
          {row("Thời gian", result.transfer.time)}
          {row("Mã giao dịch", result.transfer.reference)}
          {result.sepay === null ? (
            <p className="m-0 mt-1 text-[11px] text-gray-500">Không đối chiếu SePay (không có quyền xem, hoặc chưa đọc được số tiền).</p>
          ) : result.sepay.length === 0 ? (
            <p className="m-0 mt-1 text-[11px] text-amber-700">
              Chưa thấy giao dịch SePay đang chờ khớp số tiền này (±1 ngày).
            </p>
          ) : (
            <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
              {result.sepay.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded bg-cyan-bg px-2 py-1 text-xs">
                  <span className="min-w-0 flex-1 truncate" title={t.content ?? ""}>
                    {vndText(t.amount)} · {t.bank ?? ""}{" "}
                    {t.transactionDate ? new Date(t.transactionDate).toLocaleString("vi-VN") : ""} · {t.content}
                  </span>
                  <a
                    href={buildSepayTxHref({ referenceNumber: t.reference, transactionContent: t.content })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded bg-brand px-2 py-0.5 font-medium text-white hover:bg-brand-bright"
                  >
                    Mở giao dịch SePay
                  </a>
                </li>
              ))}
              <li className="text-[11px] text-gray-500">Kế toán xác nhận trên màn SePay — AI không gạch nợ.</li>
            </ul>
          )}
        </div>
      )}
      {result.shipping && (
        <div className="rounded-md border border-cyan-pale bg-white p-2">
          <p className="m-0 mb-1 text-xs font-semibold text-brand-dark">Phiếu gửi hàng</p>
          {row("Nhà xe / đơn vị", result.shipping.carrier)}
          {row("Mã vận đơn", result.shipping.trackingCode)}
          {row("Số kiện", result.shipping.packages)}
          {row("Ghi chú", result.shipping.note)}
          {result.shipping.trackingCode && (
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => void copy(result.shipping!.trackingCode!)}
                className="rounded border border-brand-border px-2 py-0.5 text-xs text-brand-deep hover:bg-cyan-bg"
              >
                Chép mã vận đơn
              </button>
            </div>
          )}
        </div>
      )}
      {result.defect && (
        <div className="rounded-md border border-red-100 bg-white p-2">
          <p className="m-0 mb-1 text-xs font-semibold text-red-700">Ảnh hàng lỗi</p>
          {row("Sản phẩm", result.defect.product)}
          {row("Lỗi thấy được", result.defect.issue)}
          {result.defect.note && <p className="m-0 mt-1 rounded bg-gray-50 p-1.5 text-xs">{result.defect.note}</p>}
          <div className="mt-1 flex justify-end gap-1.5">
            {result.defect.note && (
              <button
                type="button"
                onClick={() => void copy(result.defect!.note!)}
                className="rounded border border-brand-border px-2 py-0.5 text-xs text-brand-deep hover:bg-cyan-bg"
              >
                Chép ghi chú
              </button>
            )}
            <button
              type="button"
              onClick={() => onRun("complaint")}
              className="rounded bg-brand px-2 py-0.5 text-xs font-medium text-white hover:bg-brand-bright"
            >
              Soạn trả lời khiếu nại
            </button>
          </div>
        </div>
      )}
      {result.kind === "other" && !result.summary && (
        <p className="m-0 px-1 text-xs text-gray-500">Ảnh không phải chuyển khoản, phiếu gửi hàng hay hàng lỗi.</p>
      )}
    </div>
  );
}
