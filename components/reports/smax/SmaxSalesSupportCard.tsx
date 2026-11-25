"use client";

import { Image as ImageIcon, PackageCheck, QrCode, Truck } from "lucide-react";
import { vi } from "@/lib/dashboard/format";
import type { SmaxSalesSupport } from "@/lib/dashboard/smax/smaxDashboard.types";
import { LeadCard } from "@/components/reports/lead/leadUi";

export function SmaxSalesSupportCard({ data }: { data: SmaxSalesSupport }) {
  const items = [
    { key: "qr", label: "QR thanh toán", value: data.qr, Icon: QrCode },
    { key: "img", label: "Ảnh sản phẩm", value: data.productImages, Icon: ImageIcon },
    { key: "slip", label: "Phiếu đóng gói", value: data.packingSlips, Icon: PackageCheck },
    { key: "ship", label: "Đặt xe giao hàng", value: data.deliveryBookings, Icon: Truck },
  ];
  return (
    <LeadCard title="Tin hỗ trợ bán hàng" subtitle="Số lượt gửi từ POS theo loại">
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ key, label, value, Icon }) => (
          <div
            key={key}
            className="rounded-lg p-3 flex items-center gap-3"
            style={{ background: "var(--dt-bg-soft)" }}>
            <span
              className="w-[34px] h-[34px] rounded-[9px] grid place-items-center flex-none"
              style={{ background: "#E0F6F9", color: "#00A5B5" }}>
              <Icon className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="text-[12px]" style={{ color: "var(--dt-text-secondary)" }}>
                {label}
              </div>
              <div className="text-[20px] font-bold leading-tight dt-mono">{vi(value)}</div>
            </div>
          </div>
        ))}
      </div>
    </LeadCard>
  );
}
