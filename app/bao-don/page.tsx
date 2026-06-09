"use client";

import Link from "next/link";
import { Package, Truck, Container } from "lucide-react";
import { DeliveryOverview } from "@/components/packing-slips/DeliveryOverview";

export default function BaoDonPage() {
  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Tổng quan giao hàng hôm nay */}
      <DeliveryOverview />

      {/* Tạo báo đơn */}
      <div className="bg-white rounded-xl shadow p-4 max-w-sm mx-auto">
        <h2 className="text-sm font-semibold text-center mb-3">Tạo báo đơn</h2>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/bao-don/dong-hang"
            className="flex flex-col items-center gap-1 px-2 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-xs font-medium"
          >
            <Package className="w-5 h-5" />
            Đóng hàng
          </Link>
          <Link
            href="/bao-don/loading"
            className="flex flex-col items-center gap-1 px-2 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-xs font-medium"
          >
            <Container className="w-5 h-5" />
            Loading
          </Link>
          <Link
            href="/bao-don/giao-hang"
            className="flex flex-col items-center gap-1 px-2 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-xs font-medium"
          >
            <Truck className="w-5 h-5" />
            Giao hàng
          </Link>
        </div>
      </div>
    </div>
  );
}
