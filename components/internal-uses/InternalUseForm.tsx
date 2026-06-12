"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Trash2, Plus } from "lucide-react";
import { useProducts } from "@/lib/hooks/useProducts";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  useCreateInternalUse,
  useUpdateInternalUse,
  useInternalUsePurposes,
} from "@/lib/hooks/useInternalUses";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useBranchStore } from "@/lib/store/branch";
import { useAuthStore } from "@/lib/store/auth";
import type { InternalUse } from "@/lib/api/internalUses";
import { productsApi, type Product } from "@/lib/api/products";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PurposeForm } from "./PurposeForm";

interface InternalUseFormProps {
  internalUse?: InternalUse | null;
  onClose?: () => void;
}

interface ProductItem {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string;
  quantity: number;
  cost: number;
  value: number;
}

export function InternalUseForm({ internalUse, onClose }: InternalUseFormProps) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const currentUser = useAuthStore((s) => s.user);
  const { data: users } = useUsersForFilter();
  const { data: purposes } = useInternalUsePurposes();
  const createInternalUse = useCreateInternalUse();
  const updateInternalUse = useUpdateInternalUse();

  const isCompleted = internalUse?.status === 2;
  const isCancelled = internalUse?.status === 3;
  const isFormDisabled = isCompleted || isCancelled;

  const [branchId, setBranchId] = useState<number>(
    internalUse?.branchId || selectedBranch?.id || 0
  );

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [code, setCode] = useState(internalUse?.code || "");
  const [purposeId, setPurposeId] = useState<number>(
    internalUse?.purposeId || 0
  );
  const [userId, setUserId] = useState<number>(internalUse?.userId || 0);
  const [description, setDescription] = useState(
    internalUse?.description || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showPurposeForm, setShowPurposeForm] = useState(false);

  const canManagePurpose = usePermission("internal-use-purpose", "manage");
  const canViewCost = usePermission("internal-use", "view_cost_price");

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 20,
    branchId: branchId || undefined,
  });

  // Load lại details khi edit
  useEffect(() => {
    if (internalUse?.details && branchId) {
      const loaded: ProductItem[] = internalUse.details.map((detail) => ({
        productId: detail.productId,
        productCode: detail.productCode,
        productName: detail.productName,
        unit: detail.unit || "",
        quantity: Number(detail.quantity),
        cost: Number(detail.cost),
        value: Number(detail.value),
      }));
      setProducts(loaded);
    }
  }, [internalUse, branchId]);

  // Khi đổi chi nhánh ở header (chỉ với phiếu tạo mới): giữ nguyên các dòng
  // sản phẩm, cập nhật lại giá vốn theo chi nhánh mới. Bỏ qua lần mount đầu
  // và khi đang sửa phiếu đã có.
  const productsRef = useRef<ProductItem[]>(products);
  productsRef.current = products;
  const isFirstBranchSyncRef = useRef(true);
  useEffect(() => {
    if (internalUse) return;
    const newBranchId = selectedBranch?.id;
    if (!newBranchId) return;

    if (isFirstBranchSyncRef.current) {
      isFirstBranchSyncRef.current = false;
      return;
    }
    if (newBranchId === branchId) return;

    setBranchId(newBranchId);

    const current = productsRef.current;
    if (current.length === 0) return;

    let cancelled = false;
    Promise.all(
      current.map(async (p) => {
        try {
          const prod = await productsApi.getProduct(p.productId);
          const inv = prod.inventories?.find(
            (i: any) => i.branchId === newBranchId
          );
          const cost = inv ? Number(inv.cost) : p.cost;
          return { ...p, cost, value: p.quantity * cost };
        } catch {
          return p;
        }
      })
    ).then((refreshed) => {
      if (!cancelled) setProducts(refreshed);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch?.id]);

  const handleAddProduct = (product: Product) => {
    const inventory = product.inventories?.find(
      (inv: any) => inv.branchId === branchId
    );

    const existingIndex = products.findIndex(
      (p) => p.productId === product.id
    );
    if (existingIndex >= 0) {
      // Trùng sản phẩm: +1 số lượng thay vì thêm dòng mới
      setProducts((prev) => {
        const updated = [...prev];
        const item = { ...updated[existingIndex] };
        item.quantity += 1;
        item.value = item.quantity * item.cost;
        updated[existingIndex] = item;
        return updated;
      });
      setSearchQuery("");
      setShowSearchResults(false);
      return;
    }

    const cost = Number(inventory?.cost || 0);
    const newProduct: ProductItem = {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      unit: product.unit || "",
      quantity: 1,
      cost,
      value: cost,
    };

    setProducts((prev) => [...prev, newProduct]);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  const handleRemoveProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseFloat(value);
    setProducts((prev) => {
      const updated = [...prev];
      const q = isNaN(quantity) ? 0 : quantity;
      updated[index] = {
        ...updated[index],
        quantity: q,
        value: q * updated[index].cost,
      };
      return updated;
    });
  };

  const handleCostChange = (index: number, value: string) => {
    const cost = parseFloat(value);
    setProducts((prev) => {
      const updated = [...prev];
      const c = isNaN(cost) ? 0 : cost;
      updated[index] = {
        ...updated[index],
        cost: c,
        value: updated[index].quantity * c,
      };
      return updated;
    });
  };

  const calculateTotalValue = () =>
    products.reduce((sum, p) => sum + p.value, 0);

  const handleSubmit = async (isDraft: boolean) => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }
    if (!purposeId) {
      toast.error("Vui lòng chọn mục đích sử dụng");
      return;
    }
    if (products.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm");
      return;
    }
    if (!isDraft) {
      const hasInvalidQuantity = products.some((p) => p.quantity <= 0);
      if (hasInvalidQuantity) {
        toast.error("Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm");
        return;
      }
    }

    const payload = {
      branchId,
      purposeId,
      userId: userId || undefined,
      isDraft,
      description,
      internalUseDetails: products.map((p) => ({
        productId: p.productId,
        productCode: p.productCode,
        productName: p.productName,
        unit: p.unit,
        quantity: p.quantity,
        // Chỉ gửi giá vốn khi user có quyền xem giá vốn; nếu không, backend tự
        // lấy giá vốn từ tồn kho.
        ...(canViewCost ? { cost: p.cost } : {}),
      })),
    };

    try {
      if (internalUse?.id) {
        // Update: KHÔNG gửi `code` (mã phiếu cố định sau khi tạo).
        await updateInternalUse.mutateAsync({
          id: internalUse.id,
          data: { ...payload, status: isDraft ? 1 : 2 },
        });
      } else {
        await createInternalUse.mutateAsync({
          ...payload,
          code: code.trim() || undefined,
        });
      }
      router.push("/san-pham/xuat-dung-noi-bo");
    } catch (error: any) {
      toast.error(error?.message || "Có lỗi xảy ra");
    }
  };

  const isPending =
    createInternalUse.isPending || updateInternalUse.isPending;

  return (
    <div className="flex h-full border-t bg-gray-50 overflow-hidden relative">
      {/* Khu trái */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-white w-[60%] m-4 border rounded-xl">
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold">
              {internalUse
                ? "Chi tiết phiếu xuất dùng nội bộ"
                : "Tạo phiếu xuất dùng nội bộ"}
            </h2>
            {internalUse && (
              <p className="text-sm text-gray-600 mt-1">
                Mã phiếu: {internalUse.code}
              </p>
            )}
          </div>
          <button
            onClick={() => (onClose ? onClose() : router.back())}
            className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tìm hàng hóa theo mã hoặc tên (F3)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={
                  isFormDisabled
                    ? "Không thể thêm sản phẩm ở trạng thái này"
                    : "Tìm kiếm sản phẩm..."
                }
                value={searchQuery}
                onChange={(e) => {
                  if (isFormDisabled) return;
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => !isFormDisabled && setShowSearchResults(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchResults(false), 200)
                }
                disabled={isFormDisabled}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {showSearchResults && searchQuery && searchResults?.data && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50">
                {searchResults.data.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Không tìm thấy sản phẩm
                  </div>
                ) : (
                  searchResults.data.map((product) => {
                    const inventory = product.inventories?.find(
                      (inv: any) => inv.branchId === branchId
                    );

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                            {product.images?.[0] && (
                              <img
                                src={product.images[0].image}
                                alt={product.name}
                                className="w-full h-full object-cover rounded"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {product.code}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {canViewCost && (
                                <>
                                  Giá vốn:{" "}
                                  {formatCurrency(Number(inventory?.cost || 0))}{" "}
                                  •{" "}
                                </>
                              )}
                              Tồn:{" "}
                              {Number(inventory?.onHand || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {products.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        STT
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Mã hàng
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        Tên hàng
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        ĐVT
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                        SL xuất
                      </th>
                      {canViewCost && (
                        <>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                            Giá vốn
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                            Giá trị xuất
                          </th>
                        </>
                      )}
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-brand font-medium">
                          {item.productCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 min-w-[200px]">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                          {item.unit || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(index, e.target.value)
                            }
                            disabled={isFormDisabled}
                            className="w-20 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100"
                            min="0"
                            step="1"
                          />
                        </td>
                        {canViewCost && (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <input
                                type="number"
                                value={item.cost}
                                onChange={(e) =>
                                  handleCostChange(index, e.target.value)
                                }
                                disabled={isFormDisabled}
                                className="w-28 px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100"
                                min="0"
                                step="1"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                              {formatCurrency(item.value)}
                            </td>
                          </>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {!isFormDisabled && (
                            <button
                              onClick={() => handleRemoveProduct(index)}
                              className="p-1 hover:bg-gray-200 rounded"
                              title="Xóa">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Khu phải */}
      <div className="w-96 border m-4 rounded-xl overflow-y-auto custom-sidebar-scroll bg-white shadow-xl">
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Người tạo</label>
            <input
              type="text"
              value={internalUse?.createdByName || currentUser?.name || ""}
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Thời gian</label>
            <input
              type="text"
              value={
                internalUse?.transDate
                  ? new Date(internalUse.transDate).toLocaleString("vi-VN")
                  : new Date().toLocaleString("vi-VN")
              }
              disabled
              className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Mã xuất dùng nội bộ
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isFormDisabled || !!internalUse?.code}
              placeholder="Để trống sẽ tự sinh"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Trạng thái</label>
            <div className="px-3 py-2 border rounded bg-gray-50">
              <span className="text-sm text-gray-600">
                {internalUse
                  ? internalUse.status === 2
                    ? "Hoàn thành"
                    : internalUse.status === 3
                      ? "Đã hủy"
                      : "Phiếu tạm"
                  : "Phiếu tạm"}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-gray-600">
                Mục đích sử dụng <span className="text-red-500">*</span>
              </label>
              {canManagePurpose && !isFormDisabled && (
                <button
                  type="button"
                  onClick={() => setShowPurposeForm(true)}
                  className="text-gray-400 hover:text-brand p-0.5 rounded"
                  title="Thêm mục đích sử dụng">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={purposeId}
              onChange={(e) => setPurposeId(Number(e.target.value))}
              disabled={isFormDisabled}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100">
              <option value={0}>Chọn mục đích sử dụng</option>
              {purposes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Người sử dụng
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              disabled={isFormDisabled}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100">
              <option value={0}>Chọn người sử dụng</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {canViewCost && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Tổng giá trị
              </label>
              <input
                type="text"
                value={formatCurrency(calculateTotalValue())}
                disabled
                className="w-full px-3 py-2 border rounded bg-brand-soft text-right text-brand font-semibold"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">Ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              maxLength={1000}
              disabled={isFormDisabled}
              rows={4}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 resize-none"
              placeholder="Nhập ghi chú..."
            />
          </div>

          {!isFormDisabled && (
            <div className="space-y-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <span>💾</span>
                <span>Lưu tạm</span>
              </button>

              <button
                onClick={() => handleSubmit(false)}
                disabled={isPending}
                className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <span>✓</span>
                <span>Hoàn thành</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <PurposeForm
        isOpen={showPurposeForm}
        purpose={null}
        onClose={() => setShowPurposeForm(false)}
      />
    </div>
  );
}
