"use client";

import { useState, useMemo, useEffect } from "react";
import {
  useAddProductsToPriceBook,
  useProductsWithPrices,
  useUpdateProductPrice,
} from "@/lib/hooks/usePriceBooks";
import {
  useProducts,
  useUpdateProductRetailPrice,
} from "@/lib/hooks/useProducts";
import type { PriceBook } from "@/lib/api/price-books";
import type { Product } from "@/lib/api/products";
import { toast } from "sonner";
import { useBranchStore } from "@/lib/store/branch";
import { PermissionGate } from "../permissions/PermissionGate";
import { usePermission } from "@/lib/hooks/usePermissions";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { formatNumberInput } from "@/lib/utils";

interface TableProduct {
  id: number;
  code: string;
  name: string;
  basePrice: number;
  unit?: string;
  prices: Record<number, number>;
  stockQuantity: number;
  inventories?: { onHand: number; cost: number; branchId: number }[];
}

interface PriceBookTableProps {
  selectedPriceBooks: (PriceBook | { id: number; name: string })[];
  onAddProducts?: () => void;
  onCreateNew: () => void;
  onEditPriceBook?: (priceBook: PriceBook) => void;
  onImportClick?: () => void;
  selectedCategoryIds?: number[];
  filters: any;
  branchId?: number;
}

export function PriceBookTable({
  selectedPriceBooks,
  onAddProducts,
  onCreateNew,
  onEditPriceBook,
  onImportClick,
  selectedCategoryIds,
  filters,
  branchId,
}: PriceBookTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [editingCell, setEditingCell] = useState<{
    productId: number;
    priceBookId: number;
    value: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const canCreate = usePermission("price_books", "create");
  const canUpdate = usePermission("price_books", "update");
  const canDelete = usePermission("price_books", "delete");
  const canCreateProduct = usePermission("products", "create");
  const canViewProduct = usePermission("products", "view");
  const canUpdatePrice = usePermission("products", "update");

  const updateRetailPrice = useUpdateProductRetailPrice();
  const updateProductPrice = useUpdateProductPrice();
  const addProductsToPriceBook = useAddProductsToPriceBook();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page khi filter đổi
  useEffect(() => {
    setPage(1);
  }, [selectedCategoryIds, selectedPriceBooks]);

  const hasDefaultPriceBook = selectedPriceBooks.some((pb) => pb.id === 0);
  const realPriceBooks = selectedPriceBooks.filter(
    (pb) => pb.id !== 0
  ) as PriceBook[];

  const priceBookIds = useMemo(
    () => realPriceBooks.map((pb) => pb.id),
    [realPriceBooks]
  );

  const categoryIds = filters.categoryIds || undefined;

  useEffect(() => {
    setPage(1);
  }, [filters, selectedPriceBooks]);

  const isDefaultOnly = hasDefaultPriceBook && realPriceBooks.length === 0;

  const { data: allProductsData, isLoading: isLoadingAll } = useProducts({
    search: debouncedSearch,
    categoryIds,
    page,
    limit,
    branchId,
    parentName: filters.parentName,
    middleName: filters.middleName,
    childName: filters.childName,
    stockStatus: filters.stockStatus,
  });

  const { data: productsWithPricesData, isLoading: isLoadingPrices } =
    useProductsWithPrices({
      priceBookIds,
      search: debouncedSearch,
      categoryIds,
      branchId,
      page,
      limit,
    });

  const products = useMemo<TableProduct[] | undefined>(() => {
    if (isDefaultOnly) {
      return allProductsData?.data?.map((p: Product) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        basePrice: Number(p.basePrice),
        unit: p.unit,
        prices: {},
        stockQuantity:
          p.inventories?.reduce((sum, inv) => sum + Number(inv.onHand), 0) || 0,
        inventories: p.inventories?.map((inv) => ({
          onHand: Number(inv.onHand),
          cost: Number(inv.cost),
          branchId: inv.branchId,
        })),
      }));
    } else {
      return productsWithPricesData?.data;
    }
  }, [isDefaultOnly, allProductsData, productsWithPricesData]);

  const total = isDefaultOnly
    ? (allProductsData?.total ?? 0)
    : (productsWithPricesData?.total ?? 0);
  const totalPages = Math.ceil(total / limit) || 1;

  const isLoading = isDefaultOnly ? isLoadingAll : isLoadingPrices;

  const handleCellClick = (productId: number, priceBookId: number) => {
    if (!canUpdatePrice) {
      toast.error("Bạn không có quyền chỉnh sửa giá bán");
      return;
    }
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    const currentPrice =
      priceBookId === 0
        ? product.basePrice.toString()
        : (product.prices[priceBookId] || 0).toString();
    setEditingCell({ productId, priceBookId, value: currentPrice });
  };

  const handlePriceChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    productId: number,
    priceBookId: number
  ) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setEditingCell({ productId, priceBookId, value: raw });
  };

  const handleBlur = async () => {
    if (!editingCell) return;
    const newPrice = Number(editingCell.value);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error("Giá không hợp lệ");
      setEditingCell(null);
      return;
    }
    try {
      if (editingCell.priceBookId === 0) {
        await updateRetailPrice.mutateAsync({
          id: editingCell.productId,
          basePrice: newPrice,
        });
        toast.success("Cập nhật giá bán cơ bản thành công");
      } else {
        await updateProductPrice.mutateAsync({
          priceBookId: editingCell.priceBookId,
          productId: editingCell.productId,
          price: newPrice,
        });
        toast.success("Cập nhật giá thành công");
      }
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBlur();
    else if (e.key === "Escape") setEditingCell(null);
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === products?.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products?.map((p) => p.id) || []);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddProductToPriceBook = async (
    productId: number,
    priceBookId: number,
    initialPrice: number
  ) => {
    try {
      await addProductsToPriceBook.mutateAsync({
        priceBookId,
        products: [{ productId, price: initialPrice }],
      });
      setEditingCell({
        productId,
        priceBookId,
        value: initialPrice.toString(),
      });
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    }
  };

  if (selectedPriceBooks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Chưa chọn bảng giá nào</p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Tạo bảng giá mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white mt-4 mr-4 mb-4 border rounded-xl">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 w-[500px]">
          <h2 className="text-xl font-semibold w-[200px]">Thiết Lập Giá</h2>
          <input
            type="text"
            placeholder="Theo mã, tên hàng"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <PermissionGate resource="price_books" action="create">
          <div className="flex items-center gap-2">
            {canCreate && (
              <button
                onClick={onCreateNew}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                + Bảng giá
              </button>
            )}
            <button
              onClick={onImportClick}
              className="px-4 py-2 border rounded hover:bg-gray-50">
              Import
            </button>
            <button className="px-4 py-2 border rounded hover:bg-gray-50">
              Xuất file
            </button>
          </div>
        </PermissionGate>
      </div>

      {/* Selected bar */}
      {selectedProductIds.length > 0 && (
        <div className="border-b p-4 bg-blue-50 flex items-center justify-between shrink-0">
          <span className="text-sm">
            Đã chọn {selectedProductIds.length} sản phẩm
          </span>
          {canDelete && (
            <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
              Xóa khỏi bảng giá
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Đang tải...</div>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Không có sản phẩm nào</p>
              {canCreateProduct && !isDefaultOnly && onAddProducts && (
                <button
                  onClick={onAddProducts}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Thêm sản phẩm
                </button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ minWidth: "max-content" }}>
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="p-3 text-left sticky left-0 bg-gray-50 z-20">
                  <input
                    type="checkbox"
                    checked={
                      products.length > 0 &&
                      selectedProductIds.length === products.length
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="p-3 text-left font-medium text-gray-700 whitespace-nowrap">
                  Mã hàng
                </th>
                <th className="p-3 text-left font-medium text-gray-700 whitespace-nowrap">
                  Tên hàng
                </th>
                <th className="p-3 text-right font-medium text-gray-700 whitespace-nowrap">
                  Giá vốn
                </th>
                {selectedPriceBooks.map((pb) => (
                  <th
                    key={pb.id}
                    className="p-3 text-right font-medium text-gray-700 whitespace-nowrap"
                    style={{ minWidth: "140px" }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span>{pb.name}</span>
                      {pb.id !== 0 && onEditPriceBook && canUpdate && (
                        <button
                          type="button"
                          onClick={() => onEditPriceBook(pb as PriceBook)}
                          className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                          title="Sửa bảng giá">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {products.map((product) => {
                const selectedBranchId =
                  useBranchStore.getState().selectedBranch?.id;
                const inventory = product.inventories?.find(
                  (inv) => inv.branchId === selectedBranchId
                );
                const cost = inventory ? Number(inventory.cost) : 0;
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-3 sticky left-0 bg-white z-10">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">{product.code}</td>
                    <td className="p-3">{product.name}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {cost.toLocaleString()}
                    </td>
                    {selectedPriceBooks.map((pb) => {
                      const isEditing =
                        editingCell?.productId === product.id &&
                        editingCell?.priceBookId === pb.id;
                      const priceExists =
                        pb.id === 0 || product.prices[pb.id] !== undefined;
                      const displayPrice =
                        pb.id === 0 ? product.basePrice : product.prices[pb.id];

                      return (
                        <td
                          key={pb.id}
                          className="p-3 text-right cursor-pointer hover:bg-blue-50 whitespace-nowrap"
                          style={{ minWidth: "140px" }}
                          onClick={() => {
                            if (pb.id !== 0 && !priceExists) {
                              handleAddProductToPriceBook(
                                product.id,
                                pb.id,
                                product.basePrice
                              );
                            } else {
                              handleCellClick(product.id, pb.id);
                            }
                          }}>
                          {isEditing && canUpdate ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={formatNumberInput(editingCell.value)}
                              onChange={(e) =>
                                handlePriceChange(e, product.id, pb.id)
                              }
                              onBlur={handleBlur}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : pb.id !== 0 && !priceExists && canCreate ? (
                            <button className="text-blue-600 hover:text-blue-800 text-xl font-bold">
                              +
                            </button>
                          ) : canViewProduct ? (
                            <span>
                              {displayPrice !== undefined
                                ? displayPrice.toLocaleString()
                                : "-"}
                            </span>
                          ) : (
                            <span>***</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="border-t px-4 py-2.5 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Hiển thị</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
            {[10, 15, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500">/ trang</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.min(
              Math.max(page - 2 + i, i + 1),
              totalPages - (Math.min(5, totalPages) - 1 - i)
            );
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs rounded border font-medium transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "hover:bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 border rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs text-gray-400">
          Trang {page}/{totalPages}
          {total > 0 ? ` • ${total} sản phẩm` : ""}
        </span>
      </div>
    </div>
  );
}
