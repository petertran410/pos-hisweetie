"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Factory as FactoryIcon, Package } from "lucide-react";
import { useFactory, useFactoryProducts } from "@/lib/hooks/useFactories";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";

interface ProductsByFactory {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  images?: Array<{ image: string }>;
}

export default function FactoryProductsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const factoryId = Number(id);
  const { data: factory, isLoading: loadingFactory } = useFactory(factoryId);
  const { data: products, isLoading: loadingProducts } = useFactoryProducts(factoryId);

  if (loadingFactory) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Đang tải...
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="p-6">
        <p className="text-red-500">Không tìm thấy nhà máy</p>
        <Link
          href="/san-pham/nha-may"
          className="text-brand hover:underline mt-2 inline-block">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const primary: ProductsByFactory[] = products?.primary ?? [];
  const backup: ProductsByFactory[] = products?.backup ?? [];
  const totalPrimary = primary.length;
  const totalBackup = backup.length;

  return (
    <PagePermissionGuard resource="factories" action="view">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/san-pham/nha-may"
              className="p-2 rounded-lg hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <FactoryIcon className="w-6 h-6 text-brand" />
                Sản phẩm của nhà máy: {factory.name}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {factory.code && <span className="font-mono">{factory.code} · </span>}
                {factory.country && <span>{factory.country} · </span>}
                {factory.supplier?.name && <span>NCC: {factory.supplier.name}</span>}
              </p>
            </div>
          </div>
        </div>

        {loadingProducts ? (
          <div className="text-center py-12 text-gray-500">Đang tải...</div>
        ) : (
          <div className="space-y-6">
            {/* Sản phẩm — nhà máy chính */}
            <div className="bg-white rounded-xl border" style={{ borderColor: "var(--dt-border)" }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--dt-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-2 h-2 rounded-full bg-blue-500" />
                  <h2 className="font-semibold">Sản phẩm — Nhà máy chính</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {totalPrimary} sản phẩm
                </span>
              </div>
              {totalPrimary === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Chưa có sản phẩm nào dùng nhà máy này làm nhà máy chính
                </div>
              ) : (
                <ProductTable products={primary} badge="primary" />
              )}
            </div>

            {/* Sản phẩm — nhà máy backup */}
            <div className="bg-white rounded-xl border" style={{ borderColor: "var(--dt-border)" }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--dt-border)" }}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex w-2 h-2 rounded-full bg-yellow-500" />
                  <h2 className="font-semibold">Sản phẩm — Nhà máy backup</h2>
                </div>
                <span className="text-sm text-gray-500">
                  {totalBackup} sản phẩm
                </span>
              </div>
              {totalBackup === 0 ? (
                <div className="px-5 py-12 text-center text-gray-400 text-sm">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Chưa có sản phẩm nào dùng nhà máy này làm nhà máy backup
                </div>
              ) : (
                <ProductTable products={backup} badge="backup" />
              )}
            </div>
          </div>
        )}
      </div>
    </PagePermissionGuard>
  );
}

function ProductTable({
  products,
  badge,
}: {
  products: ProductsByFactory[];
  badge: "primary" | "backup";
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr className="text-left">
          <th className="px-5 py-3 font-medium w-16"></th>
          <th className="px-5 py-3 font-medium">Mã</th>
          <th className="px-5 py-3 font-medium">Tên sản phẩm</th>
          <th className="px-5 py-3 font-medium">Vai trò</th>
          <th className="px-5 py-3 font-medium">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr
            key={p.id}
            className="border-t hover:bg-gray-50"
            style={{ borderColor: "var(--dt-border)" }}>
            <td className="px-5 py-3">
              {p.images?.[0]?.image ? (
                <img
                  src={p.images[0].image}
                  alt={p.name}
                  className="w-10 h-10 object-cover rounded border"
                  style={{ borderColor: "var(--dt-border)" }}
                />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                  📦
                </div>
              )}
            </td>
            <td className="px-5 py-3 font-mono text-xs">{p.code}</td>
            <td className="px-5 py-3 font-medium">{p.name}</td>
            <td className="px-5 py-3">
              {badge === "primary" ? (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                  Chính
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                  Backup
                </span>
              )}
            </td>
            <td className="px-5 py-3">
              {p.isActive ? (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                  Hoạt động
                </span>
              ) : (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                  Tạm ẩn
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}