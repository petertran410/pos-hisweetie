"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ChatContext } from "@/lib/types/smaxChat";
import { QUICK_ITEM_MIME, type QuickItem } from "@/lib/chat/quickInsert";

/** Kéo dòng vào ô soạn tin để chèn thông tin (như menu "/"). */
const dragProps = (item: QuickItem) => ({
  draggable: true,
  title: "Kéo vào ô chat để gửi thông tin này",
  onDragStart: (e: React.DragEvent) => {
    e.dataTransfer.setData(QUICK_ITEM_MIME, JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  },
  className: "cursor-grab active:cursor-grabbing rounded hover:bg-cyan-bg",
});

const shortDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

/** Thông tin POS của khách cạnh khung chat. Sale PIC chỉ để xem. */
export function ChatCustomerCard({ context }: { context: ChatContext }) {
  const { customer, salePic, debt, recentOrders, recentInvoices } = context;
  const customerHref = `/khach-hang?Code=${encodeURIComponent(customer.code ?? "")}`;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <Link
          href={customerHref}
          className="font-semibold text-brand hover:underline"
        >
          {customer.code}
        </Link>
        <p className="font-medium">{customer.name}</p>
        {customer.phone && <p className="text-gray-500">{customer.phone}</p>}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-gray-500">Sale PIC</dt>
        <dd>{salePic?.name ?? "—"}</dd>
      </dl>
      {debt !== null && (
        <div {...dragProps({ type: "debt" })}>
          <div className="flex justify-between gap-3 px-1">
            <span className="text-gray-500">Công nợ</span>
            <span className={debt > 0 ? "font-semibold text-red-600" : ""}>
              {formatCurrency(debt)}
            </span>
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
          Đặt hàng gần đây
        </h4>
        {recentOrders.length === 0 ? (
          <p className="text-gray-400">Không có</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recentOrders.map((o) => {
              const d = dragProps({ type: "order", id: o.id });
              return (
                <li
                  key={o.id}
                  {...d}
                  className={`flex justify-between gap-2 px-1 ${d.className}`}
                >
                  <Link
                    href={`/don-hang/dat-hang?Code=${encodeURIComponent(o.code)}`}
                    className="text-brand hover:underline truncate"
                  >
                    {o.code}
                  </Link>
                  <span className="text-gray-500 shrink-0">
                    {shortDate(o.date)} · {formatCurrency(o.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
          Hóa đơn gần đây
        </h4>
        {recentInvoices.length === 0 ? (
          <p className="text-gray-400">Không có</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recentInvoices.map((i) => {
              const d = dragProps({ type: "invoice", id: i.id });
              return (
                <li
                  key={i.id}
                  {...d}
                  className={`flex justify-between gap-2 px-1 ${d.className}`}
                >
                  <Link
                    href={`/don-hang/hoa-don?Code=${encodeURIComponent(i.code)}`}
                    className="text-brand hover:underline truncate"
                  >
                    {i.code}
                  </Link>
                  <span className="text-gray-500 shrink-0">
                    {shortDate(i.date)} · {formatCurrency(i.total)}
                    {debt !== null && i.debt > 0 && (
                      <span className="text-red-600">
                        {" "}
                        · nợ {formatCurrency(i.debt)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Kéo công nợ, đơn hàng, hóa đơn vào ô chat để gửi.
      </p>
      <Link href={customerHref} className="text-brand hover:underline">
        Mở khách hàng →
      </Link>
    </div>
  );
}
