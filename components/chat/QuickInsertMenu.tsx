"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CreditCard, FileText, Loader2, MessageSquareText, Package, Play, ShoppingCart } from "lucide-react";
import { useCan } from "@/lib/hooks/useCan";
import { useProducts } from "@/lib/hooks/useProducts";
import { invoicesApi } from "@/lib/api/invoices";
import { ordersApi } from "@/lib/api/orders";
import { useBranchStore } from "@/lib/store/branch";
import { usePosInViewStore } from "@/lib/store/posInView";
import type { QuickItem } from "@/lib/chat/quickInsert";
import type { ChatContext, OutgoingAttachment } from "@/lib/types/smaxChat";
import { formatCurrency } from "@/lib/utils";

export interface QuickOption {
  key: string;
  group: string;
  label: string;
  hint?: string;
  icon: "invoice" | "order" | "product" | "cart" | "debt" | "quick";
  item: QuickItem;
  // Tin nhắn nhanh: nội dung xem trước + ảnh/tệp nhỏ bên cạnh
  preview?: string;
  media?: OutgoingAttachment[];
}

const THUMBS = 3;

/** Ảnh nhỏ media của tin nhắn nhanh (tối đa THUMBS, thừa hiện "+n"). */
function MediaThumbs({ media }: { media: OutgoingAttachment[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {media.slice(0, THUMBS).map((m, i) =>
        m.kind === "image" ? (
          <img key={i} src={m.url} alt={m.name} loading="lazy" className="h-9 w-9 rounded border object-cover" />
        ) : (
          <span key={i} title={m.name} className="flex h-9 w-9 items-center justify-center rounded border bg-gray-50 text-gray-500">
            {m.kind === "video" ? <Play className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          </span>
        )
      )}
      {media.length > THUMBS && <span className="text-xs text-gray-500">+{media.length - THUMBS}</span>}
    </span>
  );
}

const ICONS = {
  invoice: FileText,
  order: ClipboardList,
  product: Package,
  cart: ShoppingCart,
  debt: CreditCard,
  quick: MessageSquareText,
};

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Các lựa chọn của menu "/": gợi ý từ màn hình bên trái, sản phẩm, hóa đơn, đặt hàng, công nợ.
 * ctx null (chưa gắn khách POS): chỉ có sản phẩm.
 */
export function useQuickOptions(query: string, ctx: ChatContext | null, enabled: boolean) {
  const entries = usePosInViewStore((s) => s.entries);
  const branchId = useBranchStore((s) => s.selectedBranch?.id);
  const canProducts = useCan("products", "view");
  const canInvoices = useCan("invoices", "view");
  const canOrders = useCan("orders", "view");
  const q = useDebounced(query.trim());
  const search = q.length >= 2 ? q : "";
  const customerId = ctx?.customer.id ?? 0;

  const products = useProducts(
    { search, limit: 8, isActive: true, branchId },
    { enabled: enabled && canProducts && !!search, silentForbidden: true }
  );
  const invoices = useQuery({
    queryKey: ["chatQuickInvoices", customerId, search],
    queryFn: () => invoicesApi.getInvoices({ search, customerIds: [customerId], pageSize: 5 }),
    enabled: enabled && !!ctx && canInvoices && !!search,
    retry: false,
  });
  const orders = useQuery({
    queryKey: ["chatQuickOrders", customerId, search],
    queryFn: () => ordersApi.getOrders({ search, customerId, limit: 5 }),
    enabled: enabled && !!ctx && canOrders && !!search,
    retry: false,
  });

  const options = useMemo(() => {
    const nq = norm(query.trim());
    const match = (...texts: (string | undefined | null)[]) =>
      !nq || texts.some((t) => t && norm(t).includes(nq));
    const out: QuickOption[] = [];
    const seen = new Set<string>();
    const push = (o: QuickOption) => {
      if (seen.has(o.key)) return;
      seen.add(o.key);
      out.push(o);
    };

    // Gợi ý: mục đang mở bên trái (mới mở lên đầu) + công nợ khách đang chat
    for (const e of Object.values(entries).reverse()) {
      // Chưa gắn khách POS: chỉ gợi ý sản phẩm
      if (!ctx && e.type !== "product") continue;
      if (e.type === "cart") {
        if (e.lines.length && match("gio hang bao gia", e.label))
          push({
            key: `cart-${e.id}`,
            group: "Gợi ý từ màn hình",
            label: `Giỏ hàng ${e.label}`,
            hint: `${e.lines.length} sản phẩm`,
            icon: "cart",
            item: { type: "cart", lines: e.lines },
          });
      } else if (match(e.code, e.type === "product" ? e.name : null)) {
        push({
          key: `${e.type}-${e.id}`,
          group: "Gợi ý từ màn hình",
          label: e.type === "product" ? `${e.name}` : `${e.type === "invoice" ? "Hóa đơn" : "Đặt hàng"} ${e.code}`,
          hint: e.type === "product" ? e.code : "đang mở",
          icon: e.type,
          item: { type: e.type, id: e.id },
        });
      }
    }
    if (ctx && ctx.debt !== null && match("cong no", "no", "thanh toan", "qr"))
      push({
        key: "debt",
        group: "Công nợ",
        label: "Thông tin công nợ + QR chuyển khoản",
        hint: `Tổng nợ ${formatCurrency(ctx.debt)}đ`,
        icon: "debt",
        item: { type: "debt" },
      });

    for (const p of products.data?.data ?? [])
      push({
        key: `product-${p.id}`,
        group: "Sản phẩm",
        label: p.name,
        hint: p.code,
        icon: "product",
        item: { type: "product", id: p.id },
      });

    const recentInv = search
      ? (invoices.data?.data ?? []).map((i) => ({ id: i.id, code: i.code, date: i.purchaseDate, total: i.grandTotal }))
      : (ctx?.recentInvoices ?? []);
    for (const i of recentInv)
      if (search || match(i.code))
        push({
          key: `invoice-${i.id}`,
          group: "Hóa đơn",
          label: `Hóa đơn ${i.code}`,
          hint: `${new Date(i.date).toLocaleDateString("vi-VN")} · ${formatCurrency(i.total)}đ`,
          icon: "invoice",
          item: { type: "invoice", id: i.id },
        });

    const recentOrd = search
      ? (orders.data?.data ?? []).map((o) => ({ id: o.id, code: o.code, date: o.orderDate, total: o.grandTotal }))
      : (ctx?.recentOrders ?? []);
    for (const o of recentOrd)
      if (search || match(o.code))
        push({
          key: `order-${o.id}`,
          group: "Đặt hàng",
          label: `Đặt hàng ${o.code}`,
          hint: `${new Date(o.date).toLocaleDateString("vi-VN")} · ${formatCurrency(o.total)}đ`,
          icon: "order",
          item: { type: "order", id: o.id },
        });
    return out;
  }, [entries, query, search, ctx, products.data, invoices.data, orders.data]);

  const loading =
    !!search && (products.isFetching || invoices.isFetching || orders.isFetching);
  return { options, loading };
}

interface MenuProps {
  options: QuickOption[];
  loading: boolean;
  activeIndex: number;
  onHover: (i: number) => void;
  onPick: (o: QuickOption) => void;
  // Menu "#" (tin nhắn nhanh) dùng tiêu đề / câu báo trống riêng
  title?: string;
  emptyText?: string;
}

/** Bảng chọn nhanh hiện phía trên ô soạn tin. */
export function QuickInsertMenu({ options, loading, activeIndex, onHover, onPick, title, emptyText }: MenuProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-2 right-2 mb-1 max-h-72 overflow-y-auto rounded-lg border bg-white py-1 text-sm shadow-xl z-30">
      <div className="flex items-center justify-between px-3 py-1 text-[11px] text-gray-400">
        <span>{title ?? "Gửi nhanh thông tin POS"} — ↑↓ chọn · Enter chèn · Esc đóng</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
      {options.length === 0 && !loading && (
        <p className="px-3 py-2 text-gray-500">
          {emptyText ?? "Không có mục phù hợp. Gõ tên/mã sản phẩm, mã hóa đơn hoặc đơn hàng (từ 2 ký tự)."}
        </p>
      )}
      {options.map((o, i) => {
        const Icon = ICONS[o.icon];
        const newGroup = i === 0 || options[i - 1].group !== o.group;
        return (
          <div key={o.key}>
            {newGroup && (
              <div className="px-3 pt-2 pb-0.5 text-[11px] font-semibold uppercase text-gray-500">
                {o.group}
              </div>
            )}
            <button
              data-index={i}
              onMouseEnter={() => onHover(i)}
              // mousedown: giữ focus ở ô soạn
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(o);
              }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${
                i === activeIndex ? "bg-cyan-bg" : ""
              }`}>
              <Icon className={`h-4 w-4 shrink-0 text-brand ${o.preview !== undefined ? "self-start mt-0.5" : ""}`} />
              {o.preview !== undefined ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.label}</span>
                  {o.preview && (
                    <span className="line-clamp-2 whitespace-pre-wrap break-words text-xs text-gray-500">{o.preview}</span>
                  )}
                </span>
              ) : (
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
              )}
              {o.media?.length ? <MediaThumbs media={o.media} /> : null}
              {o.hint && <span className="shrink-0 text-xs text-gray-500">{o.hint}</span>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
