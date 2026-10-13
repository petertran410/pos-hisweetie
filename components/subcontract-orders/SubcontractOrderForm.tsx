"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { Search, Trash2, X } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import type { Branch } from "@/lib/api/branches";
import type { Product } from "@/lib/api/products";
import { useBranchStore } from "@/lib/store/branch";
import { useFactories } from "@/lib/hooks/useFactories";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useProduct, useProducts } from "@/lib/hooks/useProducts";
import { usePermission } from "@/lib/hooks/usePermissions";
import {
  useCreateSubcontractOrder,
  useSendSubcontractMaterials,
  useUpdateSubcontractOrder,
} from "@/lib/hooks/useSubcontractOrders";
import { subcontractOrdersApi } from "@/lib/api/subcontract-orders";
import {
  SUBCONTRACT_COST_TYPES,
  SUBCONTRACT_COST_TYPE_LABEL,
  SUBCONTRACT_STATUS,
  type SubcontractCurrency,
  type SubcontractOrder,
  type SubcontractOrderInput,
} from "@/lib/types/subcontract-order";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { NumericInput } from "@/components/ui/NumericInput";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FactorySelect } from "@/components/factories/FactorySelect";
import { ProductPickerDropdown } from "@/components/products/ProductPickerDropdown";
import { DATE_CLASS, INPUT_CLASS, dateInputToIso, today } from "./ModalShell";

const LIST_PATH = "/san-pham/gia-cong";

interface MaterialRow {
  productId: number;
  productCode: string;
  productName: string;
  unit?: string | null;
  plannedQuantity: number;
  /** null = không có quyền xem giá vốn / chưa biết. */
  unitCost: number | null;
  onHand: number | null;
}

interface CostRow {
  key: number;
  type: string;
  name: string;
  /** Luôn dương trên form; loại "bồi thường" được đổi dấu khi lưu. */
  amount: number;
  isFactoryPayable: boolean;
}

interface FinishedProduct {
  id: number;
  code: string;
  name: string;
  unit?: string | null;
}

const money = (v: number) => formatCurrency(Math.round(v));

export function SubcontractOrderForm({
  order,
}: {
  order: SubcontractOrder | null;
}) {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const factories = useFactories({ includeInactive: false, limit: 500 });
  const { data: suppliersData } = useSuppliers({
    pageSize: 500,
    currentItem: 0,
  });
  const canViewCost = usePermission("subcontract_orders", "view_cost_price");

  const createOrder = useCreateSubcontractOrder();
  const updateOrder = useUpdateSubcontractOrder();
  const sendMaterials = useSendSubcontractMaterials();

  // Đã gửi nguyên liệu: tồn kho và giá vốn đã chốt nên chỉ còn sửa điều khoản.
  const locked = !!order && order.status !== SUBCONTRACT_STATUS.DRAFT;
  const readOnly =
    !!order &&
    (order.status === SUBCONTRACT_STATUS.COMPLETED ||
      order.status === SUBCONTRACT_STATUS.CANCELLED);

  const [supplierId, setSupplierId] = useState<number | null>(
    order?.supplierId ?? null,
  );
  const [factoryId, setFactoryId] = useState<number | null>(
    order?.factoryId ?? null,
  );
  const [branchId, setBranchId] = useState<number | null>(
    order?.branchId ?? selectedBranch?.id ?? null,
  );
  const [receiveBranchId, setReceiveBranchId] = useState<number | null>(
    order?.receiveBranchId ?? selectedBranch?.id ?? null,
  );
  const [product, setProduct] = useState<FinishedProduct | null>(
    order
      ? {
          id: order.productId,
          code: order.productCode,
          name: order.productName,
          unit: order.product?.unit,
        }
      : null,
  );
  const [formulaId, setFormulaId] = useState<number | null>(
    order?.formulaId ?? null,
  );
  const [plannedQuantity, setPlannedQuantity] = useState(
    order?.plannedQuantity ?? 0,
  );
  const [processingUnitPrice, setProcessingUnitPrice] = useState(
    order?.processingUnitPrice ?? 0,
  );
  const [currency, setCurrency] = useState<SubcontractCurrency>(
    order?.currency ?? "VND",
  );
  const [exchangeRate, setExchangeRate] = useState(order?.exchangeRate ?? 1);
  const [lossAllowancePercent, setLossAllowancePercent] = useState(
    order?.lossAllowancePercent ?? 0,
  );
  const [orderDate, setOrderDate] = useState(
    order?.orderDate ? order.orderDate.slice(0, 10) : today(),
  );
  const [expectedDate, setExpectedDate] = useState(
    order?.expectedDate ? order.expectedDate.slice(0, 10) : "",
  );
  const [note, setNote] = useState(order?.note ?? "");

  const [materials, setMaterials] = useState<MaterialRow[]>(
    () =>
      order?.materials.map((m) => ({
        productId: m.productId,
        productCode: m.productCode,
        productName: m.productName,
        unit: m.unit,
        plannedQuantity: m.plannedQuantity,
        unitCost: m.unitCost,
        onHand: null,
      })) ?? [],
  );
  const costKey = useRef(0);
  const [costs, setCosts] = useState<CostRow[]>(
    () =>
      order?.costs.map((c) => ({
        key: ++costKey.current,
        type: c.type,
        name: c.name,
        amount: Math.abs(c.amount),
        isFactoryPayable: c.isFactoryPayable,
      })) ?? [],
  );
  const [loadingFormula, setLoadingFormula] = useState(false);

  // Công thức của thành phẩm (chỉ có ở API chi tiết sản phẩm).
  const { data: productDetail } = useProduct(product?.id ?? 0);
  const formulas = productDetail?.formulas ?? [];

  const supplierOptions = useMemo(
    () =>
      (suppliersData?.data ?? []).map((s) => ({
        value: String(s.id),
        label: s.code ? `${s.code} — ${s.name}` : s.name,
      })),
    [suppliersData],
  );
  const activeBranches = useMemo(
    () => (branches || []).filter((b) => b.isActive),
    [branches],
  );
  const selectedFactory = useMemo(
    () => factories?.data.find((f) => f.id === factoryId) ?? null,
    [factories, factoryId],
  );
  // Nhà máy đã gắn NCC thì công nợ phải ghi cho đúng NCC đó.
  const supplierLockedByFactory = !!selectedFactory?.supplierId;

  const handleFactoryChange = (id: number | null) => {
    setFactoryId(id);
    const factory = factories?.data.find((f) => f.id === id);
    if (!factory) return;
    if (factory.supplierId) setSupplierId(factory.supplierId);
    if (factory.currency === "CNY" || factory.currency === "VND") {
      setCurrency(factory.currency);
    }
  };

  const handleAddMaterial = (p: Product, quantity?: number) => {
    if (product && p.id === product.id) {
      toast.error("Nguyên liệu không được trùng với thành phẩm");
      return;
    }
    if (materials.some((m) => m.productId === p.id)) {
      toast.info(`${p.name} đã có trong danh sách nguyên liệu`);
      return;
    }
    const inventory = p.inventories?.find((i) => i.branchId === branchId);
    setMaterials((prev) => [
      ...prev,
      {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        unit: p.unit,
        plannedQuantity: quantity ?? 0,
        unitCost: inventory ? Number(inventory.cost) : canViewCost ? 0 : null,
        onHand: inventory ? Number(inventory.onHand) : 0,
      },
    ]);
  };

  const handleLoadFormula = async () => {
    if (!product || !branchId) {
      toast.error("Vui lòng chọn thành phẩm và kho xuất nguyên liệu trước");
      return;
    }
    if (plannedQuantity <= 0) {
      toast.error("Vui lòng nhập số lượng kế hoạch trước");
      return;
    }
    if (materials.length > 0) {
      const res = await Swal.fire({
        title: "Thay danh sách nguyên liệu?",
        text: "Nguyên liệu đang nhập sẽ được thay bằng định mức của công thức.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Thay thế",
        cancelButtonText: "Đóng",
      });
      if (!res.isConfirmed) return;
    }
    setLoadingFormula(true);
    try {
      const rows = await subcontractOrdersApi.getMaterialSuggestions({
        productId: product.id,
        formulaId: formulaId ?? undefined,
        quantity: plannedQuantity,
        branchId,
      });
      if (rows.length === 0) {
        toast.info("Thành phẩm này chưa có công thức thành phần");
        return;
      }
      setMaterials(
        rows.map((r) => ({
          productId: r.productId,
          productCode: r.productCode,
          productName: r.productName,
          unit: r.unit,
          plannedQuantity: r.plannedQuantity,
          unitCost: r.unitCost,
          onHand: r.onHand,
        })),
      );
    } catch (e) {
      toast.error((e as Error)?.message || "Không lấy được công thức");
    } finally {
      setLoadingFormula(false);
    }
  };

  const updateMaterial = (productId: number, plannedQuantity: number) =>
    setMaterials((prev) =>
      prev.map((m) =>
        m.productId === productId ? { ...m, plannedQuantity } : m,
      ),
    );

  const updateCost = (key: number, patch: Partial<CostRow>) =>
    setCosts((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    );

  // ── Giá thành dự kiến ──────────────────────────────────────────────────
  const rate = currency === "VND" ? 1 : exchangeRate || 0;
  const signedCost = (c: CostRow) =>
    c.type === "compensation" ? -c.amount : c.amount;
  const materialValue = materials.reduce(
    (s, m) => s + m.plannedQuantity * (m.unitCost ?? 0),
    0,
  );
  const processingValue = plannedQuantity * processingUnitPrice * rate;
  const otherValue = costs.reduce((s, c) => s + signedCost(c), 0);
  const estimatedTotal = materialValue + processingValue + otherValue;
  const estimatedUnit =
    plannedQuantity > 0 ? estimatedTotal / plannedQuantity : 0;
  const factoryPayable =
    processingValue +
    costs
      .filter((c) => c.isFactoryPayable)
      .reduce((s, c) => s + signedCost(c), 0);

  // ── Lưu ────────────────────────────────────────────────────────────────
  const validate = (forSend: boolean): string | null => {
    if (!supplierId) return "Vui lòng chọn nhà cung cấp (đơn vị ghi công nợ)";
    if (!branchId) return "Vui lòng chọn kho xuất nguyên liệu";
    if (!receiveBranchId) return "Vui lòng chọn kho nhận thành phẩm";
    if (!product) return "Vui lòng chọn thành phẩm";
    if (plannedQuantity <= 0) return "Số lượng kế hoạch phải lớn hơn 0";
    if (currency !== "VND" && exchangeRate <= 0) return "Vui lòng nhập tỷ giá";
    if (costs.some((c) => c.amount <= 0)) {
      return "Có dòng chi phí chưa nhập số tiền";
    }
    if (forSend && !materials.some((m) => m.plannedQuantity > 0)) {
      return "Cần ít nhất một nguyên liệu có số lượng để gửi nhà máy";
    }
    return null;
  };

  const buildPayload = (): SubcontractOrderInput => ({
    supplierId: supplierId!,
    factoryId,
    branchId: branchId!,
    receiveBranchId: receiveBranchId!,
    productId: product!.id,
    formulaId,
    plannedQuantity,
    processingUnitPrice,
    currency,
    exchangeRate: currency === "VND" ? 1 : exchangeRate,
    lossAllowancePercent,
    orderDate: dateInputToIso(orderDate),
    expectedDate: expectedDate ? dateInputToIso(expectedDate) : null,
    note: note.trim() || null,
    materials: materials.map((m) => ({
      productId: m.productId,
      plannedQuantity: m.plannedQuantity,
    })),
    costs: costs.map((c) => ({
      type: c.type,
      name: c.name.trim() || SUBCONTRACT_COST_TYPE_LABEL[c.type],
      amount: signedCost(c),
      isFactoryPayable: c.isFactoryPayable,
    })),
  });

  const isSaving =
    createOrder.isPending || updateOrder.isPending || sendMaterials.isPending;

  const handleSave = async (thenSend: boolean) => {
    if (locked) {
      if (currency !== "VND" && exchangeRate <= 0) {
        toast.error("Vui lòng nhập tỷ giá");
        return;
      }
      await updateOrder.mutateAsync({
        id: order!.id,
        data: {
          processingUnitPrice,
          exchangeRate: currency === "VND" ? undefined : exchangeRate,
          lossAllowancePercent,
          expectedDate: expectedDate ? dateInputToIso(expectedDate) : null,
          note: note.trim() || null,
        },
      });
      router.push(LIST_PATH);
      return;
    }

    const error = validate(thenSend);
    if (error) {
      toast.error(error);
      return;
    }

    if (thenSend) {
      const branchName = activeBranches.find((b) => b.id === branchId)?.name;
      const res = await Swal.fire({
        title: "Lưu và gửi nguyên liệu?",
        text: `${materials.filter((m) => m.plannedQuantity > 0).length} nguyên liệu sẽ được xuất khỏi kho ${branchName ?? ""} theo đúng số lượng định mức.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Lưu & gửi",
        cancelButtonText: "Đóng",
      });
      if (!res.isConfirmed) return;
    }

    try {
      const saved = order
        ? await updateOrder.mutateAsync({ id: order.id, data: buildPayload() })
        : await createOrder.mutateAsync(buildPayload());
      const savedId = (saved as SubcontractOrder | null)?.id ?? order?.id;
      if (thenSend && savedId) {
        await sendMaterials.mutateAsync({ id: savedId, data: {} });
      }
      router.push(LIST_PATH);
    } catch {
      // Hook đã hiện toast lỗi; ở lại form để người dùng sửa.
    }
  };

  const title = !order
    ? "Tạo lệnh gia công"
    : locked
      ? `Lệnh gia công ${order.code}`
      : `Cập nhật lệnh ${order.code}`;

  return (
    <div className="flex h-full border-t bg-gray-50 overflow-hidden">
      {/* Trái: nguyên liệu + chi phí */}
      <div className="flex-1 flex flex-col overflow-hidden m-4 border rounded-xl">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push(LIST_PATH)}
            className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold shrink-0">{title}</h2>
          {!locked && (
            <div className="flex-1 max-w-xl">
              <ProductPickerDropdown
                branchId={branchId ?? undefined}
                placeholder="Thêm nguyên liệu theo mã hoặc tên... (F3)"
                onAddProduct={handleAddMaterial}
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Nguyên liệu */}
          <section className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">
                Nguyên liệu gửi nhà máy
              </h3>
              {!locked && (
                <button
                  onClick={handleLoadFormula}
                  disabled={loadingFormula}
                  className="text-sm text-brand hover:underline font-medium disabled:opacity-50">
                  {loadingFormula ? "Đang lấy..." : "Lấy theo công thức"}
                </button>
              )}
            </div>
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-gray-100 border-b text-gray-700">
                  <th className="px-3 py-2 text-center w-12">STT</th>
                  <th className="px-3 py-2 text-left">Mã hàng</th>
                  <th className="px-3 py-2 text-left min-w-[200px]">
                    Tên nguyên liệu
                  </th>
                  <th className="px-3 py-2 text-right">Tồn kho</th>
                  <th className="px-3 py-2 text-right w-36">SL định mức</th>
                  {canViewCost && (
                    <>
                      <th className="px-3 py-2 text-right">Giá vốn</th>
                      <th className="px-3 py-2 text-right">Thành tiền</th>
                    </>
                  )}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 && (
                  <tr>
                    <td
                      colSpan={canViewCost ? 8 : 6}
                      className="px-3 py-10 text-center text-gray-400">
                      Tìm nguyên liệu ở ô phía trên, hoặc bấm “Lấy theo công
                      thức” sau khi chọn thành phẩm và số lượng.
                    </td>
                  </tr>
                )}
                {materials.map((m, idx) => {
                  const shortage =
                    m.onHand != null && m.plannedQuantity > m.onHand;
                  return (
                    <tr key={m.productId} className="border-b">
                      <td className="px-3 py-2 text-center">{idx + 1}</td>
                      <td className="px-3 py-2">{m.productCode}</td>
                      <td className="px-3 py-2">{m.productName}</td>
                      <td
                        className={`px-3 py-2 text-right ${
                          shortage ? "text-red-600 font-medium" : ""
                        }`}>
                        {m.onHand == null ? "-" : formatNumber(m.onHand)}{" "}
                        {m.unit || ""}
                      </td>
                      <td className="px-3 py-2">
                        {locked ? (
                          <div className="text-right">
                            {formatNumber(m.plannedQuantity)}
                          </div>
                        ) : (
                          <NumericInput
                            value={m.plannedQuantity}
                            onValueChange={(v) =>
                              updateMaterial(m.productId, v)
                            }
                            maxFractionDigits={4}
                            className={`${INPUT_CLASS} text-right`}
                          />
                        )}
                      </td>
                      {canViewCost && (
                        <>
                          <td className="px-3 py-2 text-right">
                            {m.unitCost == null ? "-" : money(m.unitCost)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {m.unitCost == null
                              ? "-"
                              : money(m.plannedQuantity * m.unitCost)}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2 text-center">
                        {!locked && (
                          <button
                            onClick={() =>
                              setMaterials((prev) =>
                                prev.filter((x) => x.productId !== m.productId),
                              )
                            }
                            className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Chi phí khác */}
          <section className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-800">
                Chi phí khác (VND)
              </h3>
              {!locked && (
                <button
                  onClick={() =>
                    setCosts((prev) => [
                      ...prev,
                      {
                        key: ++costKey.current,
                        type: "freight_out",
                        name: "",
                        amount: 0,
                        isFactoryPayable: false,
                      },
                    ])
                  }
                  className="text-sm text-brand hover:underline font-medium">
                  + Thêm chi phí
                </button>
              )}
            </div>
            {locked ? (
              <p className="px-3 py-3 text-sm text-gray-500">
                Lệnh đã gửi nguyên liệu — thêm/sửa chi phí ở tab “Chi phí khác”
                trong chi tiết lệnh.
              </p>
            ) : costs.length === 0 ? (
              <p className="px-3 py-6 text-sm text-center text-gray-400">
                Vận chuyển, thuế nhập khẩu, bao bì nhà máy cấp… đều được cộng
                vào giá thành. Có thể bổ sung sau khi tạo lệnh.
              </p>
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b text-gray-700">
                    <th className="px-3 py-2 text-left w-52">Loại</th>
                    <th className="px-3 py-2 text-left">Diễn giải</th>
                    <th className="px-3 py-2 text-right w-40">Số tiền</th>
                    <th className="px-3 py-2 text-center w-36">
                      Trả cho nhà máy
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {costs.map((c) => (
                    <tr key={c.key} className="border-b">
                      <td className="px-3 py-2">
                        <select
                          value={c.type}
                          onChange={(e) =>
                            updateCost(c.key, { type: e.target.value })
                          }
                          className={INPUT_CLASS}>
                          {SUBCONTRACT_COST_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={c.name}
                          onChange={(e) =>
                            updateCost(c.key, { name: e.target.value })
                          }
                          placeholder={SUBCONTRACT_COST_TYPE_LABEL[c.type]}
                          className={INPUT_CLASS}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <NumericInput
                          value={c.amount}
                          onValueChange={(v) =>
                            updateCost(c.key, { amount: v })
                          }
                          maxFractionDigits={0}
                          className={`${INPUT_CLASS} text-right ${
                            c.type === "compensation" ? "text-green-600" : ""
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={c.isFactoryPayable}
                          onChange={(e) =>
                            updateCost(c.key, {
                              isFactoryPayable: e.target.checked,
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() =>
                            setCosts((prev) =>
                              prev.filter((x) => x.key !== c.key),
                            )
                          }
                          className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>

      {/* Phải: thông tin lệnh */}
      <div className="w-[360px] border mr-4 mt-4 mb-4 rounded-xl overflow-hidden bg-white flex flex-col">
        <div className="px-4 py-2.5 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">
            Thông tin lệnh gia công
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-sidebar-scroll">
          <FormField label="Nhà máy">
            <FactorySelect
              value={factoryId}
              onChange={handleFactoryChange}
              placeholder="— Chọn nhà máy —"
              disabled={locked}
            />
          </FormField>

          <FormField
            label="Nhà cung cấp (ghi công nợ)"
            hint={
              supplierLockedByFactory
                ? "Theo nhà cung cấp đã gắn với nhà máy."
                : undefined
            }>
            <SearchableSelect
              options={supplierOptions}
              value={supplierId ? String(supplierId) : ""}
              onChange={(v) => setSupplierId(v ? Number(v) : null)}
              placeholder="Chọn nhà cung cấp"
              searchPlaceholder="Tìm nhà cung cấp..."
              disabled={locked || supplierLockedByFactory}
              size="sm"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Kho xuất NVL">
              <BranchSelect
                branches={activeBranches}
                value={branchId}
                onChange={setBranchId}
                disabled={locked}
              />
            </FormField>
            <FormField label="Kho nhận thành phẩm">
              <BranchSelect
                branches={activeBranches}
                value={receiveBranchId}
                onChange={setReceiveBranchId}
                disabled={locked}
              />
            </FormField>
          </div>

          <FormField label="Thành phẩm">
            <FinishedProductSelect
              value={product}
              disabled={locked}
              onChange={(p) => {
                setProduct(p);
                setFormulaId(null);
              }}
            />
          </FormField>

          {formulas.length > 0 && (
            <FormField label="Công thức">
              <select
                value={formulaId ?? ""}
                disabled={locked}
                onChange={(e) =>
                  setFormulaId(e.target.value ? Number(e.target.value) : null)
                }
                className={INPUT_CLASS}>
                <option value="">Công thức mặc định</option>
                {formulas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                    {f.isDefault ? " (mặc định)" : ""}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-2">
            <FormField label="SL kế hoạch">
              <NumericInput
                value={plannedQuantity}
                onValueChange={setPlannedQuantity}
                maxFractionDigits={4}
                disabled={locked}
                className={`${INPUT_CLASS} text-right`}
              />
            </FormField>
            <FormField label="Hao hụt cho phép (%)">
              <NumericInput
                value={lossAllowancePercent}
                onValueChange={setLossAllowancePercent}
                maxFractionDigits={2}
                disabled={readOnly}
                className={`${INPUT_CLASS} text-right`}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField label={`Đơn giá gia công (${currency})`}>
              <NumericInput
                value={processingUnitPrice}
                onValueChange={setProcessingUnitPrice}
                maxFractionDigits={currency === "VND" ? 2 : 4}
                disabled={readOnly}
                className={`${INPUT_CLASS} text-right`}
              />
            </FormField>
            <FormField label="Tiền tệ">
              <select
                value={currency}
                disabled={locked}
                onChange={(e) =>
                  setCurrency(e.target.value as SubcontractCurrency)
                }
                className={INPUT_CLASS}>
                <option value="VND">VND</option>
                <option value="CNY">CNY</option>
              </select>
            </FormField>
          </div>

          {currency !== "VND" && (
            <FormField
              label={`Tỷ giá ${currency} → VND`}
              hint={
                locked ? "Chỉ áp dụng cho các đợt nhập sau khi sửa." : undefined
              }>
              <NumericInput
                value={exchangeRate}
                onValueChange={setExchangeRate}
                maxFractionDigits={2}
                disabled={readOnly}
                className={`${INPUT_CLASS} text-right`}
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Ngày lập">
              {locked ? (
                <div className={`${INPUT_CLASS} bg-gray-100`}>
                  {new Date(orderDate).toLocaleDateString("vi-VN")}
                </div>
              ) : (
                <DatePickerInput
                  value={orderDate}
                  onChange={setOrderDate}
                  className={DATE_CLASS}
                />
              )}
            </FormField>
            <FormField label="Dự kiến xong">
              <DatePickerInput
                value={expectedDate}
                onChange={setExpectedDate}
                minDate={orderDate}
                className={DATE_CLASS}
              />
            </FormField>
          </div>

          <FormField label="Ghi chú">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              disabled={readOnly}
              className={INPUT_CLASS}
            />
          </FormField>

          {/* Giá thành dự kiến */}
          {canViewCost && !locked && (
            <div className="rounded border divide-y text-sm">
              <SummaryLine label="Nguyên liệu" value={money(materialValue)} />
              <SummaryLine
                label="Phí gia công"
                value={money(processingValue)}
              />
              <SummaryLine label="Chi phí khác" value={money(otherValue)} />
              <SummaryLine
                bold
                label="Tổng dự kiến"
                value={money(estimatedTotal)}
              />
              <div className="flex items-center justify-between px-3 py-2 bg-brand-soft">
                <span className="font-medium">Giá thành dự kiến / đv</span>
                <span className="text-base font-bold text-brand">
                  {money(estimatedUnit)}
                </span>
              </div>
              <SummaryLine
                label="Sẽ phải trả nhà máy"
                value={money(factoryPayable)}
              />
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="p-3 border-t bg-gray-50 flex gap-2">
            {locked ? (
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand rounded hover:bg-brand-dark disabled:opacity-50">
                Lưu thay đổi
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                  Lưu nháp
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand rounded hover:bg-brand-dark disabled:opacity-50">
                  Lưu &amp; gửi nguyên liệu
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function SummaryLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 ${
        bold ? "font-semibold" : ""
      }`}>
      <span className={bold ? "" : "text-gray-600"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function BranchSelect({
  branches,
  value,
  onChange,
  disabled,
}: {
  branches: Branch[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={INPUT_CLASS}>
      <option value="">Chọn kho</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}

/**
 * Chọn MỘT thành phẩm. Không dùng ProductPickerDropdown vì nó gắn phím tắt F3
 * toàn cục — đã dành cho ô thêm nguyên liệu trên cùng màn hình.
 */
function FinishedProductSelect({
  value,
  onChange,
  disabled,
}: {
  value: FinishedProduct | null;
  onChange: (p: FinishedProduct | null) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data } = useProducts(
    { search: debounced, limit: 30, isActive: true },
    { enabled: open && !value, silentForbidden: true },
  );
  const products = data?.data ?? [];

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 border border-gray-300 rounded px-2 py-1.5 text-sm bg-gray-50">
        <div className="min-w-0">
          <div className="truncate font-medium">{value.name}</div>
          <div className="text-xs text-gray-400">
            {value.code}
            {value.unit ? ` · ${value.unit}` : ""}
          </div>
        </div>
        {!disabled && (
          <button
            onClick={() => onChange(null)}
            className="text-gray-400 hover:text-red-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        value={search}
        disabled={disabled}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Tìm thành phẩm theo mã hoặc tên..."
        className={`${INPUT_CLASS} pl-8`}
      />
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {products.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400">
              Không tìm thấy sản phẩm
            </div>
          ) : (
            products.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onChange({
                    id: p.id,
                    code: p.code,
                    name: p.name,
                    unit: p.unit,
                  });
                  setSearch("");
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand-soft border-b last:border-b-0">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-400">{p.code}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
