"use client";

import { useEffect, useState } from "react";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { CustomerDebtsTab } from "@/components/customers/CustomerDebtsTab";
import { Loader2, X } from "lucide-react";

export interface SepayDebtViewCustomer {
  id: number;
  code: string | null;
  name: string;
}

/** Nội dung công nợ của 1 khách — tự lấy totalDebt mới nhất rồi render lại
 * đúng bảng "Công nợ" (ẩn các nút thao tác để chụp màn hình gửi khách). */
function CustomerDebtView({ customerId }: { customerId: number }) {
  const { data: customer, isLoading } = useCustomer(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <CustomerDebtsTab
      customerId={customerId}
      customerDebt={Number(customer?.totalDebt || 0)}
      includeChildren={false}
      hideActions
    />
  );
}

/** Modal hiển thị bảng công nợ (giống tab "Công nợ" trang khách hàng) cho
 * (các) khách hàng của 1 giao dịch Sepay sau khi đã lập phiếu thu. */
export function SepayDebtViewModal({
  customers,
  onClose,
}: {
  customers: SepayDebtViewCustomer[];
  onClose: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (customers.length === 0) return null;

  const active = customers[Math.min(activeIdx, customers.length - 1)];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-12"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-[84rem] bg-white rounded-xl shadow-2xl flex flex-col max-h-[88vh]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-800">
              Công nợ khách hàng
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {active.code ? `${active.code} — ` : ""}
              {active.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab chọn khách khi giao dịch gắn nhiều khách */}
        {customers.length > 1 && (
          <div className="flex flex-wrap gap-1 px-5 pt-3 border-b">
            {customers.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveIdx(i)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  i === activeIdx
                    ? "border-brand text-brand"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto px-5 py-4">
          {/* key theo customerId để reset phân trang khi đổi tab */}
          <CustomerDebtView key={active.id} customerId={active.id} />
        </div>
      </div>
    </div>
  );
}
