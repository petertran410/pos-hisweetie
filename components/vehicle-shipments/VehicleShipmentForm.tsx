"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Save, Send, Search } from "lucide-react";
import { toast } from "sonner";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import {
  useVehicleAvailableItems,
  useCreateVehicleShipment,
  useUpdateVehicleShipment,
  useVehicleShipment,
} from "@/lib/hooks/useVehicleShipments";
import {
  VEHICLE_SHIPMENT_STATUS,
  type AvailableOrderSupplier,
} from "@/lib/types/vehicle-shipment";

interface Props {
  /** Khi có id => chế độ sửa. */
  shipmentId?: number;
}

interface PickedItem {
  orderSupplierId: number;
  osCode: string;
  supplierName: string;
  productId: number;
  productCode: string;
  productName: string;
  remaining: number; // còn lại để ghép (chỉ tham chiếu khi thêm mới)
  quantity: number; // SL ghép
}

export function VehicleShipmentForm({ shipmentId }: Props) {
  const router = useRouter();
  const isEdit = !!shipmentId;
  const { data: branches } = useBranches();
  const { selectedBranch } = useBranchStore();

  const { data: existing, isLoading: loadingExisting } = useVehicleShipment(
    shipmentId || 0
  );

  const [code, setCode] = useState("");
  const [branchId, setBranchId] = useState<number | undefined>(
    selectedBranch?.id
  );
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [description, setDescription] = useState("");
  const [picked, setPicked] = useState<PickedItem[]>([]);
  const [search, setSearch] = useState("");
  const [initialized, setInitialized] = useState(false);

  const { data: available, isLoading: loadingAvailable } =
    useVehicleAvailableItems(branchId);

  const createMutation = useCreateVehicleShipment();
  const updateMutation = useUpdateVehicleShipment();

  // Nạp dữ liệu khi sửa (1 lần).
  if (isEdit && existing && !initialized) {
    setCode(existing.code);
    setBranchId(existing.branchId ?? undefined);
    setVehicleInfo(existing.vehicleInfo || "");
    setDescription(existing.description || "");
    setPicked(
      (existing.items || []).map((it) => ({
        orderSupplierId: it.orderSupplierId,
        osCode: it.orderSupplier?.code || `PĐN #${it.orderSupplierId}`,
        supplierName: it.orderSupplier?.supplier?.name || "-",
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        remaining: Number(it.quantity),
        quantity: Number(it.quantity),
      }))
    );
    setInitialized(true);
  }

  const pickedKey = (osId: number, pId: number) => `${osId}:${pId}`;
  const pickedSet = useMemo(
    () => new Set(picked.map((p) => pickedKey(p.orderSupplierId, p.productId))),
    [picked]
  );

  const filteredAvailable = useMemo<AvailableOrderSupplier[]>(() => {
    const list = available || [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list
      .map((os) => ({
        ...os,
        items: os.items.filter(
          (it) =>
            it.productCode.toLowerCase().includes(q) ||
            it.productName.toLowerCase().includes(q) ||
            os.code.toLowerCase().includes(q) ||
            (os.supplier?.name || "").toLowerCase().includes(q)
        ),
      }))
      .filter((os) => os.items.length > 0);
  }, [available, search]);

  const addItem = (os: AvailableOrderSupplier, productId: number) => {
    const item = os.items.find((i) => i.productId === productId);
    if (!item) return;
    setPicked((prev) => [
      ...prev,
      {
        orderSupplierId: os.orderSupplierId,
        osCode: os.code,
        supplierName: os.supplier?.name || "-",
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        remaining: item.remaining,
        quantity: item.remaining,
      },
    ]);
  };

  const removeItem = (osId: number, productId: number) =>
    setPicked((prev) =>
      prev.filter(
        (p) => !(p.orderSupplierId === osId && p.productId === productId)
      )
    );

  const updateQty = (osId: number, productId: number, value: number) =>
    setPicked((prev) =>
      prev.map((p) =>
        p.orderSupplierId === osId && p.productId === productId
          ? { ...p, quantity: value }
          : p
      )
    );

  const buildPayload = (status: number) => ({
    code: code.trim() || undefined,
    branchId,
    vehicleInfo: vehicleInfo.trim() || undefined,
    description: description.trim() || undefined,
    status,
    items: picked.map((p) => ({
      orderSupplierId: p.orderSupplierId,
      productId: p.productId,
      quantity: Number(p.quantity),
    })),
  });

  const validate = () => {
    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh nhận");
      return false;
    }
    if (picked.length === 0) {
      toast.error("Cần chọn ít nhất 1 dòng hàng để ghép xe");
      return false;
    }
    if (picked.some((p) => !p.quantity || p.quantity <= 0)) {
      toast.error("Số lượng ghép phải lớn hơn 0");
      return false;
    }
    return true;
  };

  const handleSave = (status: number) => {
    if (!validate()) return;
    if (isEdit) {
      updateMutation.mutate(
        { id: shipmentId!, data: buildPayload(status) },
        { onSuccess: () => router.push("/san-pham/ghep-xe") }
      );
    } else {
      createMutation.mutate(buildPayload(status), {
        onSuccess: () => router.push("/san-pham/ghep-xe"),
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Nhóm picked theo PĐN để hiển thị.
  const pickedSections = useMemo(() => {
    const grouped = picked.reduce(
      (acc, p) => {
        if (!acc[p.orderSupplierId]) {
          acc[p.orderSupplierId] = {
            orderSupplierId: p.orderSupplierId,
            osCode: p.osCode,
            supplierName: p.supplierName,
            items: [] as PickedItem[],
          };
        }
        acc[p.orderSupplierId].items.push(p);
        return acc;
      },
      {} as Record<
        number,
        {
          orderSupplierId: number;
          osCode: string;
          supplierName: string;
          items: PickedItem[];
        }
      >
    );
    return Object.values(grouped);
  }, [picked]);

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white m-4 border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="border-b px-5 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-gray-900">
          {isEdit ? "Sửa phiếu ghép xe" : "Tạo phiếu ghép xe"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/san-pham/ghep-xe")}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Đóng
          </button>
          <button
            onClick={() => handleSave(VEHICLE_SHIPMENT_STATUS.DRAFT)}
            disabled={isSaving}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Lưu phiếu tạm
          </button>
          <button
            onClick={() => handleSave(VEHICLE_SHIPMENT_STATUS.CONFIRMED)}
            disabled={isSaving}
            className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark flex items-center gap-1.5 disabled:opacity-50">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Xác nhận giao
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Left: thông tin + danh sách đã chọn */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Mã phiếu xe
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Để trống để tự sinh (XE......)"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Chi nhánh nhận <span className="text-red-500">*</span>
              </label>
              <select
                value={branchId ?? ""}
                onChange={(e) =>
                  setBranchId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
                <option value="">-- Chọn chi nhánh --</option>
                {branches
                  ?.filter((b) => b.isActive)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Biển số / Tài xế
              </label>
              <input
                value={vehicleInfo}
                onChange={(e) => setVehicleInfo(e.target.value)}
                placeholder="VD: 51C-123.45 / Anh Tài"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Ghi chú
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Hàng đã ghép ({picked.length} dòng)
            </h3>
            {pickedSections.length === 0 ? (
              <div className="text-sm text-gray-400 border rounded-lg py-8 text-center">
                Chưa có hàng nào. Chọn từ danh sách bên phải.
              </div>
            ) : (
              <div className="space-y-3">
                {pickedSections.map((sec) => (
                  <div key={sec.orderSupplierId} className="border rounded-lg">
                    <div className="px-3 py-2 bg-gray-50 border-b text-sm font-medium">
                      {sec.osCode}{" "}
                      <span className="text-gray-400 font-normal">
                        · {sec.supplierName}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="px-3 py-2 text-left font-medium">
                            Sản phẩm
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Còn ghép
                          </th>
                          <th className="px-3 py-2 text-right font-medium w-32">
                            SL ghép
                          </th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {sec.items.map((it) => (
                          <tr key={it.productId} className="border-t">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800">
                                {it.productName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {it.productCode}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">
                              {it.remaining.toLocaleString("vi-VN")}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min={0}
                                value={it.quantity}
                                onChange={(e) =>
                                  updateQty(
                                    sec.orderSupplierId,
                                    it.productId,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 border rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() =>
                                  removeItem(sec.orderSupplierId, it.productId)
                                }
                                className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: chọn hàng từ PĐN */}
        <div className="w-[400px] shrink-0 overflow-y-auto p-4 bg-gray-50">
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm PĐN, mã/tên sản phẩm..."
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white"
            />
          </div>

          {!branchId && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              Chọn chi nhánh nhận để lọc đúng phiếu đặt hàng nhập.
            </div>
          )}

          {loadingAvailable ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang tải...
            </div>
          ) : filteredAvailable.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-10">
              Không còn hàng nào để ghép.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAvailable.map((os) => (
                <div
                  key={os.orderSupplierId}
                  className="border rounded-lg bg-white">
                  <div className="px-3 py-2 border-b text-sm font-medium">
                    {os.code}{" "}
                    <span className="text-gray-400 font-normal">
                      · {os.supplier?.name || "-"}
                    </span>
                  </div>
                  <div className="divide-y">
                    {os.items.map((it) => {
                      const isPicked = pickedSet.has(
                        pickedKey(os.orderSupplierId, it.productId)
                      );
                      return (
                        <div
                          key={it.productId}
                          className="px-3 py-2 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {it.productName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {it.productCode} · còn ghép:{" "}
                              {it.remaining.toLocaleString("vi-VN")}
                            </div>
                          </div>
                          <button
                            disabled={isPicked}
                            onClick={() => addItem(os, it.productId)}
                            className="px-2 py-1 text-xs rounded-lg border flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-soft hover:border-brand text-brand border-brand/40">
                            <Plus className="w-3.5 h-3.5" />
                            {isPicked ? "Đã thêm" : "Thêm"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
