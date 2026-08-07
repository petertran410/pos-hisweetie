"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/lib/hooks/useProducts";
import { useCreateFactoryProduct } from "@/lib/hooks/useFactoryProducts";
import { Factory } from "@/lib/api/factories";

interface AttachProductsModalProps {
  factory: Factory;
  /** productId đã gắn — dùng để ẩn khỏi kết quả tìm kiếm. */
  linkedProductIds: Set<number>;
  /** Vai trò mặc định, lấy theo tab đang mở. */
  defaultRole: "primary" | "backup";
  onClose: () => void;
}

interface PickedProduct {
  id: number;
  code: string;
  name: string;
}

/**
 * Modal gắn sản phẩm vào nhà máy.
 *
 * Khác với cách cũ (đổ toàn bộ 100 sản phẩm ra màn hình dạng nút bấm): ở đây
 * người dùng gõ tìm kiếm, tick chọn nhiều sản phẩm, xem lại danh sách đã chọn
 * rồi lưu một lần. Vai trò (chính/backup) áp cho cả lô đang chọn.
 */
export function AttachProductsModal({
  factory,
  linkedProductIds,
  defaultRole,
  onClose,
}: AttachProductsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<"primary" | "backup">(defaultRole);
  const [picked, setPicked] = useState<PickedProduct[]>([]);
  const [saving, setSaving] = useState(false);

  const createMapping = useCreateFactoryProduct();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: productData, isLoading } = useProducts(
    { search: debouncedSearch || undefined, page: 1, limit: 30, isActive: true },
    { silentForbidden: true }
  );

  const pickedIds = useMemo(
    () => new Set(picked.map((item) => item.id)),
    [picked]
  );

  // Ẩn sản phẩm đã gắn sẵn để tránh lỗi trùng từ backend.
  const results = (productData?.data ?? []).filter(
    (product) => !linkedProductIds.has(product.id)
  );

  const togglePick = (product: PickedProduct) => {
    setPicked((prev) =>
      prev.some((item) => item.id === product.id)
        ? prev.filter((item) => item.id !== product.id)
        : [...prev, { id: product.id, code: product.code, name: product.name }]
    );
  };

  const handleSave = async () => {
    if (!picked.length) {
      toast.error("Chưa chọn sản phẩm nào");
      return;
    }
    setSaving(true);
    // Gắn tuần tự để nếu 1 dòng lỗi thì các dòng trước vẫn được lưu.
    let ok = 0;
    const failed: string[] = [];
    for (const product of picked) {
      try {
        await createMapping.mutateAsync({
          factoryId: factory.id,
          productId: product.id,
          role,
          currency: factory.currency || "VND",
        });
        ok += 1;
      } catch {
        failed.push(product.code);
      }
    }
    setSaving(false);

    if (ok > 0) toast.success(`Đã gắn ${ok} sản phẩm vào nhà máy`);
    if (failed.length) {
      toast.error(`Không gắn được: ${failed.join(", ")}`);
      return;
    }
    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center"
      onMouseDown={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[85vh] sm:m-4 flex flex-col overflow-hidden shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}>
        <div className="border-b px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Gắn sản phẩm vào nhà máy
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{factory.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 border-b space-y-3 flex-shrink-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Vai trò áp dụng cho các sản phẩm được chọn
            </label>
            <div className="flex gap-2">
              {(["primary", "backup"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    role === value
                      ? "bg-brand text-white border-brand"
                      : "border-gray-200 text-gray-700 hover:border-brand"
                  }`}>
                  {value === "primary" ? "Nhà máy chính" : "Nhà máy backup"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm theo mã hoặc tên..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:border-brand"
            />
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {picked.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => togglePick(product)}
                  title="Bỏ chọn"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-brand-soft text-brand text-xs">
                  {product.code}
                  <X className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
              Đang tìm sản phẩm...
            </div>
          ) : !results.length ? (
            <div className="py-12 text-center text-sm text-gray-500">
              {debouncedSearch
                ? "Không tìm thấy sản phẩm phù hợp."
                : "Nhập từ khóa để tìm sản phẩm."}
            </div>
          ) : (
            <div className="divide-y">
              {results.map((product) => {
                const isPicked = pickedIds.has(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => togglePick(product)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-gray-50 ${
                      isPicked ? "bg-brand-soft/40" : ""
                    }`}>
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        isPicked
                          ? "bg-brand border-brand"
                          : "border-gray-300 bg-white"
                      }`}>
                      {isPicked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-gray-800 truncate">
                        {product.name}
                      </span>
                      <span className="block font-mono text-xs text-gray-500">
                        {product.code}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-sm text-gray-500">
            Đã chọn {picked.length} sản phẩm
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !picked.length}
              className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
