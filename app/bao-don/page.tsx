"use client";

import Link from "next/link";
import { Package, Truck, Container } from "lucide-react";

export default function BaoDonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm space-y-3">
        <h2 className="text-lg font-semibold text-center mb-4">Tạo báo đơn</h2>
        <Link
          href="/bao-don/giao-hang"
          className="w-full px-4 py-3 bg-brand text-white rounded-lg hover:bg-brand-dark font-medium flex items-center justify-center gap-2"
        >
          <Truck className="w-5 h-5" />
          Giao hàng
        </Link>
        <Link
          href="/bao-don/dong-hang"
          className="w-full px-4 py-3 bg-brand text-white rounded-lg hover:bg-brand-dark font-medium flex items-center justify-center gap-2"
        >
          <Package className="w-5 h-5" />
          Đóng hàng
        </Link>
        <Link
          href="/bao-don/loading"
          className="w-full px-4 py-3 bg-brand text-white rounded-lg hover:bg-brand-dark font-medium flex items-center justify-center gap-2"
        >
          <Container className="w-5 h-5" />
          Loading
        </Link>
      </div>
    </div>
  );
}
