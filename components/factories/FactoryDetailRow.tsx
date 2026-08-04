"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFactoryProducts, useUpdateFactory } from "@/lib/hooks/useFactories";
import { useProducts, useUpdateProduct } from "@/lib/hooks/useProducts";
import { useCan } from "@/lib/hooks/useCan";
import { Factory } from "@/lib/api/factories";

interface FactoryDetailRowProps {
  factory: Factory;
  colSpan: number;
  onEdit: () => void;
}

type Relation = "primary" | "backup";

export function FactoryDetailRow({ factory, colSpan, onEdit }: FactoryDetailRowProps) {
  const { data, isLoading } = useFactoryProducts(factory.id);
  const updateProduct = useUpdateProduct();
  const updateFactory = useUpdateFactory();
  const queryClient = useQueryClient();
  const canUpdate = useCan("factories", "update");
  const [relation, setRelation] = useState<Relation>("primary");
  const [showAttach, setShowAttach] = useState(false);

  const products = relation === "primary" ? data?.primary ?? [] : data?.backup ?? [];
  const linkedIds = useMemo(
    () => new Set([...(data?.primary ?? []), ...(data?.backup ?? [])].map((item) => item.id)),
    [data]
  );
  const { data: productData, isLoading: loadingProducts } = useProducts(
    { page: 1, limit: 100, isActive: true },
    { enabled: showAttach }
  );
  const availableProducts = (productData?.data ?? []).filter((product) => !linkedIds.has(product.id));

  const assignProduct = async (productId: number) => {
    try {
      await updateProduct.mutateAsync({
        id: productId,
        data: relation === "primary"
          ? { primaryFactoryId: factory.id, backupFactoryId: null }
          : { backupFactoryId: factory.id, primaryFactoryId: null },
      });
      toast.success("Đã gắn sản phẩm vào nhà máy");
      await queryClient.invalidateQueries({ queryKey: ["factories"] });
    } catch {
      // Hook đã hiển thị lỗi.
    }
  };

  const detachProduct = async (productId: number) => {
    try {
      await updateProduct.mutateAsync({
        id: productId,
        data: relation === "primary"
          ? { primaryFactoryId: null }
          : { backupFactoryId: null },
      });
      toast.success("Đã bỏ gắn sản phẩm");
      await queryClient.invalidateQueries({ queryKey: ["factories"] });
    } catch {
      // Hook đã hiển thị lỗi.
    }
  };

  const detachSupplier = async () => {
    if (!confirm("Bỏ liên kết nhà cung cấp khỏi nhà máy này?")) return;
    await updateFactory.mutateAsync({ id: factory.id, data: { supplierId: null } });
  };

  if (isLoading) {
    return (
      <tr className="bg-brand-soft">
        <td colSpan={colSpan} className="px-6 py-8 text-center text-gray-500">
          <Loader2 className="inline w-5 h-5 animate-spin mr-2 text-brand" /> Đang tải thông tin nhà máy...
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan} className="border-b-2 border-l-2 border-r-2 border-brand p-0 bg-gray-50">
        <div className="p-5 bg-white">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{factory.name}</h2>
                <span className={`px-2 py-0.5 rounded text-xs ${factory.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {factory.isActive ? "Hoạt động" : "Tạm ẩn"}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{factory.code || "Chưa có mã"} · {factory.country || "Chưa có quốc gia"}</p>
            </div>
            {canUpdate && <button onClick={onEdit} className="px-3 py-2 rounded border text-sm hover:bg-gray-50">Chỉnh sửa nhà máy</button>}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-5">
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-500">Nhà cung cấp</div><div className="font-medium mt-1">{factory.supplier?.name || "Chưa gắn"}</div>{factory.supplier && canUpdate && <button onClick={detachSupplier} className="text-xs text-red-600 mt-1">Bỏ liên kết</button>}</div>
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-500">Liên hệ</div><div className="font-medium mt-1">{factory.contactNumber || "-"}</div></div>
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-500">Địa chỉ</div><div className="font-medium mt-1 truncate" title={factory.address || "-"}>{factory.address || "-"}</div></div>
            <div className="rounded-lg bg-gray-50 p-3"><div className="text-gray-500">Đặt hàng nhập</div><div className="font-medium mt-1">{factory._count?.orderSupplierItems ?? 0} dòng hàng</div></div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <div className="flex gap-1">
                {(["primary", "backup"] as Relation[]).map((item) => <button key={item} onClick={() => setRelation(item)} className={`px-3 py-1.5 rounded text-sm ${relation === item ? "bg-brand text-white" : "hover:bg-white text-gray-600"}`}>{item === "primary" ? "Sản phẩm chính" : "Sản phẩm backup"} ({item === "primary" ? data?.primary?.length ?? 0 : data?.backup?.length ?? 0})</button>)}
              </div>
              {canUpdate && <button onClick={() => setShowAttach((value) => !value)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-brand text-white"><Plus className="w-4 h-4" /> Gắn sản phẩm</button>}
            </div>
            {showAttach && canUpdate && <div className="p-3 border-b bg-blue-50"><div className="text-xs text-gray-600 mb-2">Chọn sản phẩm chưa được gắn vào nhà máy:</div>{loadingProducts ? <span className="text-sm text-gray-500">Đang tải sản phẩm...</span> : <div className="flex flex-wrap gap-2 max-h-28 overflow-auto">{availableProducts.length ? availableProducts.map((product) => <button key={product.id} disabled={updateProduct.isPending} onClick={() => assignProduct(product.id)} className="px-2 py-1 rounded bg-white border text-xs hover:border-brand">{product.code} - {product.name}</button>) : <span className="text-sm text-gray-500">Không còn sản phẩm phù hợp.</span>}</div>}</div>}
            <div className="divide-y">
              {!products.length ? <div className="px-4 py-8 text-center text-sm text-gray-500">Chưa có sản phẩm liên kết.</div> : products.map((product) => <div key={product.id} className="flex items-center justify-between px-4 py-2.5 text-sm"><div><span className="font-mono text-xs text-gray-500 mr-3">{product.code}</span><span>{product.name}</span>{!product.isActive && <span className="ml-2 text-xs text-gray-400">(Tạm ẩn)</span>}</div>{canUpdate && <button disabled={updateProduct.isPending} onClick={() => detachProduct(product.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Bỏ gắn"><Trash2 className="w-4 h-4" /></button>}</div>)}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
