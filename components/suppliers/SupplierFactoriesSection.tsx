"use client";

import { useMemo, useState } from "react";
import {
  Factory as FactoryIcon,
  Plus,
  Pencil,
  Link2,
  Unlink,
  Loader2,
  X,
  Search,
} from "lucide-react";
import {
  useFactories,
  useFactoriesBySupplier,
  useUpdateFactory,
} from "@/lib/hooks/useFactories";
import { Factory } from "@/lib/api/factories";
import { usePermission } from "@/lib/hooks/usePermissions";
import { FactoryQuickFormModal } from "@/components/factories/FactoryQuickFormModal";

interface SupplierFactoriesSectionProps {
  supplierId: number;
}

function factoryLabel(f: Factory): string {
  const parts: string[] = [];
  if (f.code) parts.push(f.code);
  parts.push(f.name);
  return parts.join(" — ");
}

/**
 * Section quản lý quan hệ "1 NCC → nhiều nhà máy" trong SupplierForm.
 *
 * Cho phép:
 *  - Xem danh sách nhà máy thuộc NCC (useFactoriesBySupplier).
 *  - Tạo mới nhà máy gắn thẳng vào NCC (modal, defaultSupplierId = NCC).
 *  - Sửa nhà máy (modal chế độ edit).
 *  - Gỡ nhà máy khỏi NCC: set supplierId = null (nhà máy vẫn tồn tại).
 *  - Gắn nhà máy "mồ côi" (chưa thuộc NCC nào) vào NCC hiện tại.
 *
 * Chỉ nên render khi NCC đã tồn tại (có supplierId hợp lệ).
 */
export function SupplierFactoriesSection({
  supplierId,
}: SupplierFactoriesSectionProps) {
  const canCreate = usePermission("factories", "create");
  const canUpdate = usePermission("factories", "update");

  const { data: factories, isLoading } = useFactoriesBySupplier(supplierId);
  const updateFactory = useUpdateFactory();

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);

  // Trạng thái panel "gắn nhà máy có sẵn".
  const [showAttach, setShowAttach] = useState(false);

  const list = factories ?? [];

  const handleUnlink = async (factory: Factory) => {
    if (!canUpdate) return;
    await updateFactory.mutateAsync({
      id: factory.id,
      // Gỡ khỏi NCC: nhà máy vẫn tồn tại, chỉ bỏ liên kết supplier.
      data: { supplierId: null },
    });
  };

  return (
    <section className="border-t border-gray-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">
          Nhà máy của nhà cung cấp
        </h3>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setEditingFactory(null);
              setModalMode("create");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-dark border border-brand-soft rounded-lg hover:bg-brand-soft transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Thêm nhà máy
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Một nhà cung cấp có thể quản lý nhiều nhà máy. Nhà máy gắn vào NCC sẽ
        xuất hiện trong bộ lọc theo NCC ở đơn đặt hàng.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải danh sách nhà máy...
        </div>
      ) : list.length === 0 ? (
        <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg py-6 text-center">
          Chưa có nhà máy nào thuộc nhà cung cấp này.
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-brand-soft/50 flex items-center justify-center">
                  <FactoryIcon className="w-4 h-4 text-brand" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {f.name}
                  </p>
                  {f.code && (
                    <p className="text-xs text-gray-400 truncate">{f.code}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFactory(f);
                      setModalMode("edit");
                    }}
                    title="Sửa nhà máy"
                    className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => handleUnlink(f)}
                    disabled={updateFactory.isPending}
                    title="Gỡ khỏi nhà cung cấp"
                    className="p-1.5 rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                    <Unlink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Gắn nhà máy có sẵn (mồ côi) */}
      {canUpdate && (
        <div className="mt-3">
          {showAttach ? (
            <AttachExistingFactory
              supplierId={supplierId}
              onClose={() => setShowAttach(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAttach(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand transition-colors">
              <Link2 className="w-3.5 h-3.5" />
              Gắn nhà máy đã có sẵn (chưa thuộc NCC nào)
            </button>
          )}
        </div>
      )}

      {modalMode && (
        <FactoryQuickFormModal
          factory={modalMode === "edit" ? editingFactory : null}
          defaultSupplierId={modalMode === "create" ? supplierId : null}
          onSaved={() => {
            setModalMode(null);
            setEditingFactory(null);
          }}
          onClose={() => {
            setModalMode(null);
            setEditingFactory(null);
          }}
        />
      )}
    </section>
  );
}

/**
 * Panel chọn nhà máy chưa thuộc NCC nào để gắn vào NCC hiện tại.
 * Lấy toàn bộ nhà máy rồi lọc client-side những nhà máy có supplierId == null.
 */
function AttachExistingFactory({
  supplierId,
  onClose,
}: {
  supplierId: number;
  onClose: () => void;
}) {
  const data = useFactories({ includeInactive: false, limit: 500 });
  const updateFactory = useUpdateFactory();
  const [search, setSearch] = useState("");

  const orphans = useMemo(() => {
    const all = data?.data ?? [];
    const q = search.toLowerCase().trim();
    return all
      .filter((f) => f.supplierId == null)
      .filter(
        (f) =>
          !q ||
          f.name.toLowerCase().includes(q) ||
          (f.code ?? "").toLowerCase().includes(q)
      );
  }, [data, search]);

  const handleAttach = async (factory: Factory) => {
    await updateFactory.mutateAsync({
      id: factory.id,
      data: { supplierId },
    });
    onClose();
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-xs font-medium text-gray-600">
          Chọn nhà máy chưa thuộc NCC nào
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm nhà máy..."
          autoFocus
          className="flex-1 outline-none text-sm bg-transparent placeholder:text-gray-400"
        />
      </div>

      <div className="max-h-[200px] overflow-y-auto">
        {!data ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 px-3 py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải...
          </div>
        ) : orphans.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-5">
            Không có nhà máy nào chưa thuộc NCC.
          </div>
        ) : (
          orphans.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleAttach(f)}
              disabled={updateFactory.isPending}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
              <span className="truncate text-gray-700">{factoryLabel(f)}</span>
              <Link2 className="w-4 h-4 text-brand flex-shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
