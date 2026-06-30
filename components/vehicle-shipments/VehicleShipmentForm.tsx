"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Send,
  Search,
  Upload,
  X,
  FileText,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import {
  useVehicleAvailableItems,
  useCreateVehicleShipment,
  useUpdateVehicleShipment,
  useVehicleShipment,
} from "@/lib/hooks/useVehicleShipments";
import { vehicleShipmentsApi } from "@/lib/api/vehicle-shipments";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { BorderGateSelect } from "./BorderGateSelect";
import {
  VEHICLE_SHIPMENT_STATUS,
  type AvailableOrderSupplier,
  type VehicleFile,
} from "@/lib/types/vehicle-shipment";

interface Props {
  /** Khi có id => chế độ sửa. */
  shipmentId?: number;
}

interface PickedItem {
  // ID ổn định sinh phía client (UUID-ish) khi thêm dòng. Dùng làm React key
  // để tránh unmount/remount <tr> khi user sửa các field dữ liệu (đặc biệt
  // `contractNo` — vì key không được phụ thuộc giá trị user đang gõ vào).
  clientId: string;
  orderSupplierId: number;
  osCode: string;
  supplierName: string;
  productId: number;
  productCode: string;
  productName: string;
  remaining: number; // còn lại để ghép (chỉ tham chiếu khi thêm mới)
  quantity: number; // SL ghép
  // Số HĐ gắn với dòng này. Mặc định auto-fill từ vehicleInfo, user sửa tay
  // được (null khi xóa trỗng). Quan trọng để phân biệt các dòng cùng (osId,
  // productId) nhưng khác HĐ (vd HH00082-26 có 2 dòng: HĐ 169 + HĐ 197).
  contractNo?: string | null;
  weight: number; // trọng lượng đơn vị
  weightUnit: string; // 'g' | 'kg'
}

/** Sinh ID ngắn cho dòng picked. Đủ unique trong 1 phiếu (dùng Date.now +
 * counter) — không cần crypto vì chỉ tồn tại trong session FE. */
let _pickedCounter = 0;
const nextClientId = () =>
  `p_${Date.now().toString(36)}_${(++_pickedCounter).toString(36)}`;

/** Quy đổi trọng lượng đơn vị về kg. */
const toKg = (weight: number, unit: string) =>
  (unit || "kg").toLowerCase() === "g" ? weight / 1000 : weight;

/** Quy đổi trọng lượng đơn vị về gram. */
const toGram = (weight: number, unit: string) =>
  (unit || "kg").toLowerCase() === "g" ? weight : weight * 1000;

/** Badge trạng thái PĐN (chỉ 1=Đã xác nhận NCC, 2=Nhập một phần xuất hiện ở ghép xe). */
const OS_STATUS_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "Đã xác nhận NCC", cls: "bg-blue-100 text-blue-700" },
  2: { label: "Nhập một phần", cls: "bg-orange-100 text-orange-700" },
};


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
  // Lưu ý: "Số hợp đồng" không còn ô nhập tổng — user nhập trực tiếp per-row
  // ở cột "Số HĐ" trong bảng hàng đã ghép. State vehicleInfo chỉ dùng nội bộ
  // để gửi BE (giữ backward-compat với VehicleShipment.vehicleInfo).
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [borderGateId, setBorderGateId] = useState<number | undefined>(
    undefined
  );
  const [description, setDescription] = useState("");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<VehicleFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [picked, setPicked] = useState<PickedItem[]>([]);
  const [search, setSearch] = useState("");
  const [initialized, setInitialized] = useState(false);
  // PDN nào đang mở (hiển thị sản phẩm) ở panel phải. Mặc định đóng hết.
  const [expandedOs, setExpandedOs] = useState<Set<number>>(new Set());

  const toggleOsExpand = (osId: number) =>
    setExpandedOs((prev) => {
      const next = new Set(prev);
      if (next.has(osId)) next.delete(osId);
      else next.add(osId);
      return next;
    });

  const { data: available, isLoading: loadingAvailable } =
    useVehicleAvailableItems(branchId);

  const createMutation = useCreateVehicleShipment();
  const updateMutation = useUpdateVehicleShipment();

  // Đóng lịch khi click ra ngoài.
  useEffect(() => {
    if (!showDatePicker) return;
    const h = (e: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDatePicker]);

  // Nạp dữ liệu khi sửa (1 lần).
  if (isEdit && existing && !initialized) {
    setCode(existing.code);
    setBranchId(existing.branchId ?? undefined);
    setVehicleInfo(existing.vehicleInfo || "");
    setBorderGateId(existing.borderGateId ?? undefined);
    setDescription(existing.description || "");
    setExpectedArrivalDate(
      existing.expectedArrivalDate
        ? existing.expectedArrivalDate.slice(0, 10)
        : ""
    );
    setFiles(existing.files || []);
    setPicked(
      (existing.items || []).map((it) => ({
        clientId: nextClientId(),
        orderSupplierId: it.orderSupplierId,
        osCode: it.orderSupplier?.code || `PĐN #${it.orderSupplierId}`,
        supplierName: it.orderSupplier?.supplier?.name || "-",
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        remaining: Number(it.quantity),
        quantity: Number(it.quantity),
        contractNo: it.contractNo ?? null,
        weight: it.unitWeight ?? 0,
        weightUnit: it.weightUnit ?? "kg",
      }))
    );
    setInitialized(true);
  }

  // pickedKey gồm contractNo — cùng (osId, productId) có thể xuất hiện nhiều lần
  // nếu khác HĐ (vd HH00082-26 có 2 dòng thuộc 2 HĐ khác nhau).
  const pickedKey = (osId: number, pId: number, contractNo?: string | null) =>
    `${osId}:${pId}:${contractNo ?? ""}`;
  const pickedSet = useMemo(
    () =>
      new Set(
        picked.map((p) => pickedKey(p.orderSupplierId, p.productId, p.contractNo))
      ),
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
    // Không auto-fill Số HĐ — để null để user tự nhập per-row ở cột "Số HĐ".
    // Trước đây có auto-fill từ `vehicleInfo` (ô nhập tổng) nhưng ô này đã bỏ
    // theo yêu cầu UX — phiếu có thể gồm nhiều HĐ, không có giá trị "chung"
    // nào hợp lý để fill mặc định.
    setPicked((prev) => [
      ...prev,
      {
        clientId: nextClientId(),
        orderSupplierId: os.orderSupplierId,
        osCode: os.code,
        supplierName: os.supplier?.name || "-",
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        remaining: item.remaining,
        quantity: item.remaining,
        contractNo: null,
        weight: item.weight ?? 0,
        weightUnit: item.weightUnit ?? "kg",
      },
    ]);
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const { items, errors } = await vehicleShipmentsApi.uploadFiles(
        Array.from(fileList)
      );
      if (items.length > 0) {
        setFiles((prev) => [...prev, ...items]);
        toast.success(`Đã tải lên ${items.length} file`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} file lỗi: ${errors[0].reason}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Tải file thất bại");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (url: string) =>
    setFiles((prev) => prev.filter((f) => f.url !== url));

  const removeItem = (osId: number, productId: number, contractNo?: string | null) =>
    setPicked((prev) =>
      prev.filter(
        (p) =>
          !(
            p.orderSupplierId === osId &&
            p.productId === productId &&
            (p.contractNo ?? null) === (contractNo ?? null)
          )
      )
    );

  const updateQty = (
    osId: number,
    productId: number,
    contractNo: string | null | undefined,
    value: number
  ) =>
    setPicked((prev) =>
      prev.map((p) =>
        p.orderSupplierId === osId &&
        p.productId === productId &&
        (p.contractNo ?? null) === (contractNo ?? null)
          ? { ...p, quantity: value }
          : p
      )
    );

  const updateContractNo = (
    osId: number,
    productId: number,
    currentContractNo: string | null | undefined,
    value: string
  ) => {
    const trimmed = value.trim();
    setPicked((prev) =>
      prev.map((p) =>
        p.orderSupplierId === osId &&
        p.productId === productId &&
        (p.contractNo ?? null) === (currentContractNo ?? null)
          ? { ...p, contractNo: trimmed || null }
          : p
      )
    );
  };

  const buildPayload = (status: number) => ({
    code: code.trim() || undefined,
    branchId,
    borderGateId: borderGateId ?? undefined,
    vehicleInfo: vehicleInfo.trim() || undefined,
    description: description.trim() || undefined,
    expectedArrivalDate: expectedArrivalDate || undefined,
    files,
    status,
    items: picked.map((p) => ({
      orderSupplierId: p.orderSupplierId,
      productId: p.productId,
      quantity: Number(p.quantity),
      contractNo: p.contractNo?.trim() || undefined,
    })),
  });

  const totalWeightGram = useMemo(
    () =>
      picked.reduce(
        (sum, p) =>
          sum + toGram(p.weight, p.weightUnit) * Number(p.quantity || 0),
        0
      ),
    [picked]
  );
  const totalWeightKg = totalWeightGram / 1000;

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
                Cửa khẩu
              </label>
              <BorderGateSelect value={borderGateId} onChange={setBorderGateId} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Ngày dự kiến về kho
              </label>
              <div ref={dateRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowDatePicker((v) => !v)}
                  className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white transition-colors ${
                    showDatePicker
                      ? "border-brand ring-2 ring-brand-soft"
                      : "hover:border-gray-400"
                  }`}>
                  <span
                    className={
                      expectedArrivalDate ? "text-gray-800" : "text-gray-400"
                    }>
                    {expectedArrivalDate
                      ? new Date(
                          expectedArrivalDate + "T00:00:00"
                        ).toLocaleDateString("vi-VN")
                      : "Chọn ngày"}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </button>
                {showDatePicker && (
                  <div className="absolute z-50 left-0 top-full w-64">
                    <MiniCalendar
                      value={expectedArrivalDate}
                      onChange={(d) => setExpectedArrivalDate(d)}
                      onClose={() => setShowDatePicker(false)}
                    />
                  </div>
                )}
              </div>
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

          {/* Upload file hợp đồng/chứng từ */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              File đính kèm (hợp đồng, chứng từ)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="px-3 py-2 border border-dashed rounded-lg text-sm text-gray-600 hover:bg-gray-50 cursor-pointer flex items-center gap-1.5">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Tải file lên
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    handleUploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f) => (
                  <div
                    key={f.url}
                    className="flex items-center gap-2 text-sm bg-gray-50 border rounded-lg px-2 py-1.5">
                    <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline truncate flex-1">
                      {f.originalname || f.filename}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeFile(f.url)}
                      className="p-0.5 text-red-500 hover:bg-red-50 rounded shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                          <th className="px-3 py-2 text-left font-medium w-36">
                            Số HĐ
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Trọng lượng (gram)
                          </th>
                          <th className="px-3 py-2 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {sec.items.map((it) => (
                          <tr
                            key={it.clientId}
                            className="border-t">
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
                                    it.contractNo,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 border rounded-lg px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={it.contractNo ?? ""}
                                onChange={(e) =>
                                  updateContractNo(
                                    sec.orderSupplierId,
                                    it.productId,
                                    it.contractNo,
                                    e.target.value
                                  )
                                }
                                placeholder="Nhập Số HĐ"
                                className="w-32 border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {toGram(it.weight, it.weightUnit).toLocaleString(
                                "vi-VN",
                                { maximumFractionDigits: 2 }
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() =>
                                  removeItem(
                                    sec.orderSupplierId,
                                    it.productId,
                                    it.contractNo
                                  )
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
                {/* Tổng cân nặng toàn phiếu */}
                <div className="flex justify-end items-center gap-2 px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                  <span className="text-gray-600">Tổng cân nặng:</span>
                  <span className="font-semibold text-gray-900">
                    {totalWeightGram.toLocaleString("vi-VN", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    gram
                  </span>
                  <span className="text-gray-400">·</span>
                  <span className="font-semibold text-gray-900">
                    {totalWeightKg.toLocaleString("vi-VN", {
                      maximumFractionDigits: 3,
                    })}{" "}
                    kg
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: chọn hàng từ PĐN */}
        <div className="w-[460px] shrink-0 overflow-y-auto p-4 bg-gray-50">
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
              {filteredAvailable.map((os) => {
                // Mở khi user bấm, hoặc khi đang tìm kiếm (để thấy kết quả).
                const isOpen =
                  expandedOs.has(os.orderSupplierId) || !!search.trim();
                const badge = os.status
                  ? OS_STATUS_BADGE[os.status]
                  : undefined;
                return (
                  <div
                    key={os.orderSupplierId}
                    className="border rounded-lg bg-white">
                    <button
                      type="button"
                      onClick={() => toggleOsExpand(os.orderSupplierId)}
                      className="w-full px-3 py-2 border-b flex items-center gap-2 text-left hover:bg-gray-50">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {os.code}{" "}
                          <span className="text-gray-400 font-normal">
                            · {os.supplier?.name || "-"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {os.items.length} sản phẩm
                        </div>
                      </div>
                      {badge && (
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="divide-y">
                        {os.items.map((it) => {
                          // Disable "Thêm" khi đã có dòng cùng (osId, productId)
                          // và cùng Số HĐ null. Dòng mới luôn có contractNo=null
                          // (không auto-fill sau khi bỏ ô tổng) → chặn trùng SP
                          // vô tình. Để thêm dòng cùng SP khác HĐ: nhập HĐ cho
                          // dòng đã thêm, rồi bấm Thêm lại (lúc đó contractNo
                          // khác null → key khác → cho phép).
                          const isPicked = pickedSet.has(
                            pickedKey(os.orderSupplierId, it.productId, null)
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
