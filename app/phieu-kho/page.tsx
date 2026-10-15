"use client";

import Link from "next/link";
import { Banknote, CarFront, Fuel, Loader2, ReceiptText } from "lucide-react";
import { useFinanceAccess } from "@/lib/internal-finance/finance-access";

const ITEMS = [
  {
    href: "/phieu-kho/chi-khac",
    label: "Khoản chi khác",
    icon: ReceiptText,
    resource: "warehouse_expense",
    candidates: [6, 1, 4, 7],
  },
  {
    href: "/phieu-kho/tien-mat",
    label: "Phiếu tiền mặt kho",
    icon: Banknote,
    resource: "warehouse_cash",
    candidates: [6, 1],
  },
  {
    href: "/phieu-kho/xang-dau",
    label: "Xăng dầu",
    icon: Fuel,
    resource: "vehicles",
    candidates: [6, 1],
  },
  {
    href: "/phieu-kho/cham-soc-xe",
    label: "Chăm sóc xe",
    icon: CarFront,
    resource: "vehicles",
    candidates: [6, 1],
  },
];

export default function PhieuKhoPage() {
  const access = useFinanceAccess();
  // Chỉ hiện loại phiếu người dùng có quyền tạo ở ít nhất một kho.
  const items = ITEMS.filter(
    (item) =>
      access.branches(item.resource, "create", item.candidates).length > 0,
  );

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-sm rounded-xl bg-white p-4 shadow">
        <h2 className="mb-3 text-center text-sm font-semibold">
          Tạo phiếu kho
        </h2>
        {!access.ready ? (
          <div className="flex justify-center py-6 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-2">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1.5 rounded-lg bg-brand px-2 py-3.5 text-sm font-medium text-white hover:bg-brand-dark">
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">
            Tài khoản chưa có quyền tạo phiếu kho.
          </p>
        )}
      </div>
    </div>
  );
}
