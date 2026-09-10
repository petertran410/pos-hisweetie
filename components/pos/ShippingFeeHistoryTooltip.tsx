"use client";

import { Info } from "lucide-react";
import { CustomTooltip } from "@/components/ui/CustomTooltip";
import { useCustomerShippingFeeHistory } from "@/lib/hooks/useCustomers";
import { formatCurrency } from "@/lib/utils";

interface ShippingFeeHistoryTooltipProps {
  customerId: number | undefined;
}

export function ShippingFeeHistoryTooltip({
  customerId,
}: ShippingFeeHistoryTooltipProps) {
  const { data, isLoading } = useCustomerShippingFeeHistory(customerId);

  if (!customerId) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const content = () => {
    if (isLoading) return <span>Đang tải...</span>;
    if (!data || data.length === 0) return <span>Chưa có lịch sử</span>;
    return (
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-[11px] opacity-80 mb-0.5">
          Phí ship 5 lần gần nhất
        </span>
        {data.map((item) => (
          <span key={item.code} className="whitespace-nowrap">
            {formatDate(item.date)} — {item.code} —{" "}
            {formatCurrency(item.amount)}₫
          </span>
        ))}
      </div>
    );
  };

  return (
    <CustomTooltip content={content()} delayMs={200}>
      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
    </CustomTooltip>
  );
}
