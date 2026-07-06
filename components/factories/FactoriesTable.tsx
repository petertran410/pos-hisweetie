"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Factory as FactoryIcon,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useFactories, useDeleteFactory } from "@/lib/hooks/useFactories";
import { FactoryQueryParams } from "@/lib/api/factories";
import { toast } from "sonner";
import Swal from "sweetalert2";

interface FactoriesTableProps {
  filters: FactoryQueryParams & { page: number; limit: number };
  onPageChange: (page: number) => void;
}

export function FactoriesTable({ filters, onPageChange }: FactoriesTableProps) {
  const data = useFactories(filters);
  const deleteFactory = useDeleteFactory();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const factories = data?.data ?? [];
  const total = data?.total ?? 0;
  const isLoading = !data;

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: "Xóa nhà máy?",
      text: `Nhà máy "${name}" sẽ được ẩn nếu đang được sử dụng.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setDeletingId(id);
    try {
      await deleteFactory.mutateAsync(id);
    } catch (e: any) {
      toast.error(e.message || "Không thể xóa nhà máy");
    } finally {
      setDeletingId(null);
    }
  };

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 15;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--dt-border)" }}>
        <div>
          <h1 className="text-xl font-semibold">Danh sách nhà máy</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} nhà máy` : "Chưa có nhà máy"}
          </p>
        </div>
        <Link
          href="/san-pham/nha-may/new"
          className="px-4 py-2 bg-brand text-white rounded-lg hover:opacity-90 text-sm font-medium">
          + Thêm nhà máy
        </Link>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Mã</th>
              <th className="px-4 py-3 font-medium">Tên nhà máy</th>
              <th className="px-4 py-3 font-medium">Nhà cung cấp</th>
              <th className="px-4 py-3 font-medium">Quốc gia</th>
              <th className="px-4 py-3 font-medium">Tiền tệ</th>
              <th className="px-4 py-3 font-medium text-center">SP chính</th>
              <th className="px-4 py-3 font-medium text-center">SP backup</th>
              <th className="px-4 py-3 font-medium">Trạng thái</th>
              <th className="px-4 py-3 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : factories.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-500">
                  <FactoryIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Chưa có nhà máy nào</p>
                  <Link
                    href="/san-pham/nha-may/new"
                    className="text-brand hover:underline mt-2 inline-block">
                    Tạo nhà máy đầu tiên
                  </Link>
                </td>
              </tr>
            ) : (
              factories.map((f) => (
                <tr
                  key={f.id}
                  className="border-t hover:bg-gray-50"
                  style={{ borderColor: "var(--dt-border)" }}>
                  <td className="px-4 py-3 font-mono text-xs">
                    {f.code || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {f.supplier?.name ? (
                      <span>{f.supplier.name}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {f.country || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {f.currency || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                      {f._count?.primaryForProducts ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
                      {f._count?.backupForProducts ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {f.isActive ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                        Tạm ẩn
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/san-pham/nha-may/${f.id}/san-pham`}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="Xem sản phẩm">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/san-pham/nha-may/${f.id}`}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                        title="Sửa">
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(f.id, f.name)}
                        disabled={deletingId === f.id}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                        title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between px-6 py-3 border-t text-sm" style={{ borderColor: "var(--dt-border)" }}>
          <span className="text-gray-600">
            Trang {page} / {Math.ceil(total / limit)}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded border disabled:opacity-50"
              style={{ borderColor: "var(--dt-border)" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="p-1.5 rounded border disabled:opacity-50"
              style={{ borderColor: "var(--dt-border)" }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}