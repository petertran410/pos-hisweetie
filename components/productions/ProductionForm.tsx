"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  Calendar,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Clock,
} from "lucide-react";
import { formatNumberInput, parseNumberInput } from "@/lib/utils";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts, useProduct } from "@/lib/hooks/useProducts";
import {
  useCreateProduction,
  useProduction,
  useSendProduction,
  useUpdateProduction,
} from "@/lib/hooks/useProductions";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useFactories } from "@/lib/hooks/useFactories";
import type { Production } from "@/lib/api/productions";
import type { Product } from "@/lib/api/products";
import { FactorySelect } from "@/components/factories/FactorySelect";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { NumericInput } from "@/components/ui/NumericInput";
import { CancelConfirmationModal } from "./CancelConfirmationModal";

interface ProductionFormProps {
  sourceBranchId: number;
  destinationBranchId: number;
  production?: Production | null;
  /** Phiếu Gửi sản xuất ở nhà máy ngoài (thêm nhà máy, NCC, phí lô). */
  isExternal?: boolean;
  onClose: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ── MiniCalendar ─────────────────────────────────────────────────────────────
function MiniCalendar({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (d: string) => void;
  onClose: () => void;
}) {
  const todayObj = new Date();
  const init = value ? new Date(value + "T00:00:00") : todayObj;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const startOffset = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: number) =>
    `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prev = () =>
    vm === 0 ? (setVm(11), setVy((y) => y - 1)) : setVm((m) => m - 1);
  const next = () =>
    vm === 11 ? (setVm(0), setVy((y) => y + 1)) : setVm((m) => m + 1);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl p-3 shadow-lg select-none w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const ds = fmt(day);
          const isSel = value === ds;
          const isToday =
            todayObj.getFullYear() === vy &&
            todayObj.getMonth() === vm &&
            todayObj.getDate() === day;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(ds);
                onClose();
              }}
              className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${
                isSel
                  ? "bg-brand text-white font-semibold"
                  : isToday
                    ? "border border-brand text-brand font-medium hover:bg-brand-soft"
                    : "text-gray-700 hover:bg-gray-100"
              }`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TimePicker ───────────────────────────────────────────────────────────────
function TimePicker({
  hour,
  minute,
  onChange,
  onClose,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
  onClose: () => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
      <p className="text-xs font-semibold text-gray-500 mb-2">
        Chọn giờ : phút
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1 text-center">Giờ</p>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange(h, minute)}
                className={`w-full text-center py-0.5 text-sm rounded transition-colors ${
                  hour === h
                    ? "bg-brand text-white font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}>
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1 text-center">Phút</p>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(hour, m);
                  onClose();
                }}
                className={`w-full text-center py-0.5 text-sm rounded transition-colors ${
                  minute === m
                    ? "bg-brand text-white font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}>
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BranchDropdown ────────────────────────────────────────────────────────────
function BranchDropdown({
  options,
  value,
  placeholder,
  onChange,
  disabled,
}: {
  options: { value: number; label: string }[];
  value: number;
  placeholder: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-2 py-1 border rounded text-sm transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
          open
            ? "border-brand ring-2 ring-brand-soft"
            : "border-gray-200 hover:border-gray-300"
        }`}>
        <span className={selected ? "text-gray-800 truncate" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors ${
                opt.value === value
                  ? "bg-brand-soft text-brand-dark font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              } ${idx > 0 ? "border-t border-gray-50" : ""}`}>
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <Check className="w-3.5 h-3.5 text-brand flex-shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductionForm({
  sourceBranchId: initialSourceBranchId,
  destinationBranchId: initialDestinationBranchId,
  production,
  isExternal = false,
  onClose,
}: ProductionFormProps) {
  const external = isExternal || !!production?.isExternal;
  const [code, setCode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  // Công thức thành phần đã chọn (undefined → công thức mặc định).
  const [selectedFormulaId, setSelectedFormulaId] = useState<number>();

  const [searchQuery, setSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [manufacturedDate, setManufacturedDate] = useState<Date>(new Date());
  const [quantity, setQuantity] = useState<number>(0);
  const [sourceBranchId, setSourceBranchId] = useState(initialSourceBranchId);
  const [destinationBranchId, setDestinationBranchId] = useState(
    initialDestinationBranchId
  );
  const [note, setNote] = useState("");
  const [autoDeductComponents, setAutoDeductComponents] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [actualGrams, setActualGrams] = useState<{
    [componentProductId: number]: number;
  }>({});
  const [actualUnitInputs, setActualUnitInputs] = useState<{
    [componentProductId: number]: string;
  }>({});
  // ── Date picker state (thay thế datetime-local) ──
  const [dateStr, setDateStr] = useState(() => {
    const d = production?.manufacturedDate
      ? new Date(production.manufacturedDate)
      : new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [hour, setHour] = useState(() => {
    const d = production?.manufacturedDate
      ? new Date(production.manufacturedDate)
      : new Date();
    return d.getHours();
  });
  const [minute, setMinute] = useState(() => {
    const d = production?.manufacturedDate
      ? new Date(production.manufacturedDate)
      : new Date();
    return d.getMinutes();
  });
  // ── Gửi sản xuất: nhà máy, NCC (ghi công nợ), phí sản xuất cả lô ──
  const [factoryId, setFactoryId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [feeCurrency, setFeeCurrency] = useState<"VND" | "CNY">("VND");
  const [processingFee, setProcessingFee] = useState(0);
  const [feeForeignAmount, setFeeForeignAmount] = useState(0);
  const [feeExchangeRate, setFeeExchangeRate] = useState(0);
  const [showCal, setShowCal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const { data: branchesData } = useBranches();
  const branches = (branchesData || []).filter((b) => b.isActive);
  const { data: productsData } = useProducts({ type: 4 });
  const { data: productDetail } = useProduct(production?.productId || 0);
  const { data: freshProduction } = useProduction(production?.id || 0);
  const { mutate: createProduction, isPending: isCreating } =
    useCreateProduction();
  const { mutate: updateProduction, isPending: isUpdating } =
    useUpdateProduction();
  const { mutate: sendProduction, isPending: isSending } = useSendProduction();
  const { data: suppliersData } = useSuppliers(
    external ? { pageSize: 500, currentItem: 0 } : undefined,
  );
  const factoriesData = useFactories({ includeInactive: false, limit: 500 });

  const isCompleted = production?.status === 2;
  const isCancelled = production?.status === 3;
  const isSent = production?.status === 4;
  const isSubmitting = isCreating || isUpdating || isSending;
  const isFormDisabled = isSubmitting || isCompleted || isCancelled || isSent;

  const supplierOptions = (suppliersData?.data ?? []).map((s) => ({
    value: String(s.id),
    label: s.code ? `${s.code} — ${s.name}` : s.name,
  }));
  const selectedFactory =
    factoriesData?.data.find((f) => f.id === factoryId) ?? null;
  // Nhà máy đã gắn NCC thì phí sản xuất phải ghi nợ đúng NCC đó.
  const supplierLockedByFactory = !!selectedFactory?.supplierId;
  const feeInVnd =
    feeCurrency === "VND"
      ? processingFee
      : Math.round(feeForeignAmount * feeExchangeRate);

  const handleFactoryChange = (id: number | null) => {
    setFactoryId(id);
    const factory = factoriesData?.data.find((f) => f.id === id);
    if (factory?.supplierId) setSupplierId(factory.supplierId);
    if (factory?.currency === "CNY" || factory?.currency === "VND") {
      setFeeCurrency(factory.currency);
    }
  };

  const manufacturingProducts =
    productsData?.data?.filter((p) => p.type === 4) || [];

  const filteredProducts = manufacturingProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formulas = selectedProduct?.formulas ?? [];
  const selectedFormula =
    formulas.find((f) => f.id === selectedFormulaId) ??
    formulas.find((f) => f.isDefault) ??
    formulas[0];
  // Sản phẩm chưa có công thức (dữ liệu cũ) → dùng comboComponents.
  const formulaComponents =
    selectedFormula?.components ?? selectedProduct?.comboComponents ?? [];

  const initializedFromSavedRef = useRef(false);

  useEffect(() => {
    if (production) {
      setCode(production.code);
      setQuantity(Number(production.quantity));
      setSourceBranchId(production.sourceBranchId);
      setDestinationBranchId(production.destinationBranchId);
      setNote(production.note || "");
      setAutoDeductComponents(production.autoDeductComponents);
      setSelectedFormulaId(production.formulaId ?? undefined);
      if (production.isExternal) {
        setFactoryId(production.factoryId ?? null);
        setSupplierId(production.supplierId ?? null);
        setFeeCurrency(production.feeCurrency ?? "VND");
        setProcessingFee(Number(production.processingFee ?? 0));
        setFeeForeignAmount(Number(production.feeForeignAmount ?? 0));
        setFeeExchangeRate(Number(production.feeExchangeRate ?? 0));
      }
      if (production.manufacturedDate) {
        const d = new Date(production.manufacturedDate);
        setManufacturedDate(d);
        setDateStr(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        );
        setHour(d.getHours());
        setMinute(d.getMinutes());
      }
    }
  }, [production]);

  useEffect(() => {
    if (production && productDetail && !selectedProduct) {
      setSelectedProduct(productDetail);
    }
  }, [production, productDetail, selectedProduct]);

  // Click outside để đóng calendar / time picker
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node))
        setShowCal(false);
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(e.target as Node)
      )
        setShowTimePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset actualGrams về công thức khi đổi sản phẩm, công thức hoặc số lượng
  useEffect(() => {
    if (!selectedProduct) return;

    const hasSaved =
      freshProduction?.components && freshProduction.components.length > 0;
    const useSaved = hasSaved && !initializedFromSavedRef.current;

    const defaults: { [id: number]: number } = {};
    formulaComponents.forEach((comp) => {
      if (useSaved) {
        const savedComp = freshProduction!.components!.find(
          (c) => c.componentProductId === comp.componentProductId
        );
        defaults[comp.componentProductId] = savedComp
          ? Number(savedComp.actualGrams)
          : Number(comp.quantity) * quantity;
      } else {
        defaults[comp.componentProductId] = Number(comp.quantity) * quantity;
      }
    });

    if (useSaved) initializedFromSavedRef.current = true;
    setActualGrams(defaults);
  }, [selectedProduct, selectedFormula?.id, quantity, freshProduction]);

  const calculateComponentRequirements = () => {
    if (!selectedProduct) return [];

    return formulaComponents.map((comp) => {
      const componentProduct = comp.componentProduct;

      // ─── PIECE / CARTON MODE ──────────────────────────────────────
      // Cả hai trừ kho theo đơn vị trực tiếp (không quy đổi gram).
      // CARTON: comp.quantity = 1/N → quantity × SX = số thùng tiêu hao
      // (phân số, ví dụ SX 85 → 8.5 thùng). KHÔNG làm tròn.
      if (comp.inputMode === "piece" || comp.inputMode === "carton") {
        const requiredPiecesPerUnit = Number(comp.quantity);
        const totalRequiredPieces = requiredPiecesPerUnit * quantity;
        const actualG =
          actualGrams[comp.componentProductId] ?? totalRequiredPieces;

        const inventory = componentProduct?.inventories?.find(
          (inv) => inv.branchId === sourceBranchId
        );
        const availableStock = inventory ? Number(inventory.onHand) : 0;
        const isInsufficient = availableStock < actualG;

        return {
          componentProductId: comp.componentProductId,
          productCode: componentProduct?.code || "",
          productName: componentProduct?.name || "",
          // Cả piece lẫn carton đều trừ kho theo Đơn vị tính của nguyên liệu.
          unit: componentProduct?.unit || "chiếc",
          requiredGramsPerUnit: requiredPiecesPerUnit,
          totalRequiredGrams: totalRequiredPieces,
          weightInGrams: 0,
          unitsToDeduct: totalRequiredPieces, // công thức: số thùng/chiếc
          actualG, // actual thùng/chiếc
          actualUnitsToDeduct: actualG, // trừ kho đúng số thùng/chiếc
          availableStock,
          isInsufficient,
          unitCost: inventory ? Number(inventory.cost) : 0,
        };
      }
      // ─────────────────────────────────────────────────────────────

      // GRAM MODE (logic gốc)
      const requiredGramsPerUnit = Number(comp.quantity);
      const totalRequiredGrams = requiredGramsPerUnit * quantity;

      const componentWeight = componentProduct?.weight
        ? Number(componentProduct.weight)
        : 0;
      const componentWeightUnit = componentProduct?.weightUnit || "g";
      const weightInGrams =
        componentWeightUnit === "kg" ? componentWeight * 1000 : componentWeight;

      let unitsToDeduct = 0;
      if (weightInGrams > 0) {
        unitsToDeduct = totalRequiredGrams / weightInGrams;
      }

      const actualG =
        actualGrams[comp.componentProductId] ?? totalRequiredGrams;
      const actualUnitsToDeduct =
        weightInGrams > 0 ? actualG / weightInGrams : 0;

      const inventory = componentProduct?.inventories?.find(
        (inv) => inv.branchId === sourceBranchId
      );
      const availableStock = inventory ? Number(inventory.onHand) : 0;
      const isInsufficient = availableStock < actualUnitsToDeduct;

      return {
        componentProductId: comp.componentProductId,
        productCode: componentProduct?.code || "",
        productName: componentProduct?.name || "",
        unit: componentProduct?.unit || "",
        requiredGramsPerUnit,
        totalRequiredGrams,
        weightInGrams,
        unitsToDeduct,
        actualG,
        actualUnitsToDeduct,
        availableStock,
        isInsufficient,
        unitCost: inventory ? Number(inventory.cost) : 0,
      };
    });
  };

  const componentRequirements = calculateComponentRequirements();

  // Giá vốn nguyên liệu sẽ gửi đi (theo kho xuất) → giá thành dự kiến.
  const materialValue = componentRequirements.reduce(
    (sum, req) => sum + req.actualUnitsToDeduct * req.unitCost,
    0,
  );
  const estimatedUnitCost =
    quantity > 0 ? (materialValue + feeInVnd) / quantity : 0;

  const validateForm = () => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm cần sản xuất");
      return false;
    }

    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0");
      return false;
    }

    if (external && !supplierId) {
      alert("Vui lòng chọn nhà cung cấp (đơn vị ghi nhận phí sản xuất)");
      return false;
    }

    if (external && feeCurrency === "CNY" && feeExchangeRate <= 0) {
      alert("Vui lòng nhập tỷ giá cho phí sản xuất");
      return false;
    }

    return true;
  };

  const handleSubmit = (
    status: number,
    afterSave?: (saved: Production) => void,
  ) => {
    if (!validateForm()) return;

    const hasInsufficientStock = componentRequirements.some(
      (c) => c.isInsufficient
    );

    if (status === 2 && hasInsufficientStock && autoDeductComponents) {
      alert("Một số thành phần không đủ tồn kho. Vui lòng kiểm tra lại.");
      return;
    }

    // Build components array khi hoàn thành
    const components = componentRequirements.map((req) => ({
      componentProductId: req.componentProductId,
      formulaGrams: req.totalRequiredGrams,
      actualGrams: req.actualG,
    }));

    const mfDate = new Date(dateStr + "T00:00:00");
    mfDate.setHours(hour);
    mfDate.setMinutes(minute);
    mfDate.setSeconds(0);

    const data = {
      code: code || undefined,
      sourceBranchId: Number(sourceBranchId),
      destinationBranchId: Number(destinationBranchId),
      productId: Number(selectedProduct!.id),
      quantity: Number(quantity),
      note: note || undefined,
      status: Number(status),
      manufacturedDate: mfDate.toISOString(),
      autoDeductComponents: Boolean(autoDeductComponents),
      components, // ← thêm
      formulaId: selectedFormula?.id,
      ...(external
        ? {
            isExternal: true,
            autoDeductComponents: true,
            factoryId,
            supplierId: supplierId ?? undefined,
            feeCurrency,
            processingFee: feeCurrency === "VND" ? processingFee : undefined,
            feeForeignAmount:
              feeCurrency === "CNY" ? feeForeignAmount : undefined,
            feeExchangeRate:
              feeCurrency === "CNY" ? feeExchangeRate : undefined,
          }
        : {}),
    };

    const handleSaved = (saved: Production) =>
      afterSave ? afterSave(saved) : onClose();

    if (production) {
      updateProduction(
        { id: production.id, data },
        {
          onSuccess: handleSaved,
          onError: (error: any) => {
            alert(error?.message || "Có lỗi xảy ra khi cập nhật phiếu sản xuất");
          },
        }
      );
    } else {
      createProduction(data, {
        onSuccess: handleSaved,
        onError: (error: any) => {
          alert(error?.message || "Có lỗi xảy ra khi tạo phiếu sản xuất");
        },
      });
    }
  };

  const handleSaveDraft = () => {
    handleSubmit(1);
  };

  // Gửi sản xuất: lưu phiếu tạm rồi chuyển sang Đã gửi (trừ kho nguyên liệu).
  const handleSend = () => {
    if (!validateForm()) return;
    if (componentRequirements.length === 0) {
      alert("Thành phẩm chưa có công thức nguyên liệu, không thể gửi sản xuất");
      return;
    }
    if (componentRequirements.some((c) => c.isInsufficient)) {
      alert("Một số nguyên liệu không đủ tồn kho. Vui lòng kiểm tra lại.");
      return;
    }
    const factoryName =
      selectedFactory?.name ||
      supplierOptions.find((o) => o.value === String(supplierId))?.label ||
      "nhà máy";
    const sourceName =
      branches.find((b) => b.id === sourceBranchId)?.name || "";
    if (
      !confirm(
        `Gửi hàng sang ${factoryName}?\nNguyên liệu sẽ bị trừ khỏi kho ${sourceName} và phiếu không sửa được nữa.`,
      )
    )
      return;

    const components = componentRequirements.map((req) => ({
      componentProductId: req.componentProductId,
      formulaGrams: req.totalRequiredGrams,
      actualGrams: req.actualG,
    }));
    handleSubmit(1, (saved) =>
      sendProduction(
        { id: saved.id, data: { components } },
        { onSuccess: () => onClose() },
      ),
    );
  };

  const handleComplete = () => {
    if (!autoDeductComponents) {
      const confirmMessage =
        "Bạn đã tắt tùy chọn 'Tự động trừ thành phần'. Phiếu sẽ được đánh dấu hoàn thành nhưng tồn kho sẽ không thay đổi. Bạn có chắc chắn?";
      if (!confirm(confirmMessage)) return;
    }
    handleSubmit(2);
  };

  const handleCancel = () => {
    if (!production) return;

    if (production.status === 3) {
      alert("Phiếu đã bị hủy rồi");
      return;
    }

    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    if (!production) return;

    const data = {
      status: 3,
    };

    updateProduction(
      { id: production.id, data },
      {
        onSuccess: () => {
          setShowCancelConfirm(false);
          onClose();
        },
        onError: (error: any) => {
          console.error("Error canceling production:", error);
          setShowCancelConfirm(false);
          alert(error?.message || "Có lỗi xảy ra khi hủy phiếu sản xuất");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-md font-semibold">
            {production
              ? isCompleted || isCancelled || isSent
                ? external
                  ? "Xem phiếu gửi sản xuất"
                  : "Xem phiếu sản xuất"
                : external
                  ? "Sửa phiếu gửi sản xuất"
                  : "Sửa phiếu sản xuất"
              : external
                ? "Tạo phiếu gửi sản xuất"
                : "Tạo phiếu sản xuất"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* ── Mã SX + Sản phẩm ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {external ? "Mã phiếu" : "Mã sản xuất"}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Mã phiếu tự động"
                  className="text-sm w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  {external ? "Thành phẩm" : "Sản xuất mặt hàng"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      selectedProduct
                        ? `${selectedProduct.code} - ${selectedProduct.name}`
                        : searchQuery
                    }
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowProductSearch(true);
                      if (!e.target.value) setSelectedProduct(null);
                    }}
                    onFocus={() => setShowProductSearch(true)}
                    placeholder="Tìm sản phẩm..."
                    className="text-sm w-full px-2 py-1 pr-8 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isFormDisabled}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {showProductSearch && !isFormDisabled && (
                  <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredProducts.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        Không tìm thấy sản phẩm
                      </div>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedFormulaId(undefined);
                            setSearchQuery("");
                            setShowProductSearch(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                          {product.code} - {product.name}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {selectedProduct && formulas.length > 1 && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">
                      Công thức
                    </label>
                    <select
                      value={selectedFormula?.id ?? ""}
                      onChange={(e) =>
                        setSelectedFormulaId(Number(e.target.value))
                      }
                      disabled={isFormDisabled}
                      className="text-sm flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed">
                      {formulas.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                          {f.isDefault ? " (mặc định)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {selectedProduct && formulas.length === 1 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Công thức: {formulas[0].name}
                  </div>
                )}
              </div>
            </div>

            {/* ── Ngày SX + Số lượng ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {external ? "Ngày lập phiếu" : "Thời gian sản xuất"}
                </label>
                <div className="flex gap-2">
                  {/* Date trigger */}
                  <div ref={calRef} className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isFormDisabled) {
                          setShowCal((v) => !v);
                          setShowTimePicker(false);
                        }
                      }}
                      disabled={isFormDisabled}
                      className={`w-full flex items-center justify-between px-2 py-1 border rounded text-sm transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        showCal
                          ? "border-brand ring-2 ring-brand-soft"
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <span className="text-gray-800">
                        {dateStr
                          ? dateStr.split("-").reverse().join("/")
                          : "Chọn ngày"}
                      </span>
                      <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                    {showCal && (
                      <MiniCalendar
                        value={dateStr}
                        onChange={(d) => {
                          setDateStr(d);
                          setShowCal(false);
                        }}
                        onClose={() => setShowCal(false)}
                      />
                    )}
                  </div>

                  {/* Time trigger */}
                  <div ref={timePickerRef} className="relative w-24">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isFormDisabled) {
                          setShowTimePicker((v) => !v);
                          setShowCal(false);
                        }
                      }}
                      disabled={isFormDisabled}
                      className={`w-full flex items-center justify-between px-2 py-1 border rounded text-sm transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        showTimePicker
                          ? "border-brand ring-2 ring-brand-soft"
                          : "border-gray-200 hover:border-gray-300"
                      }`}>
                      <span className="text-gray-800">
                        {String(hour).padStart(2, "0")}:
                        {String(minute).padStart(2, "0")}
                      </span>
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                    {showTimePicker && (
                      <TimePicker
                        hour={hour}
                        minute={minute}
                        onChange={(h, m) => {
                          setHour(h);
                          setMinute(m);
                        }}
                        onClose={() => setShowTimePicker(false)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Số lượng
                </label>
                <input
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="0"
                  className="text-sm w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* ── Chi nhánh ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {external ? "Kho xuất nguyên liệu" : "Chi nhánh đầu vào"}
                </label>
                <BranchDropdown
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={sourceBranchId}
                  placeholder="Chọn chi nhánh"
                  onChange={setSourceBranchId}
                  disabled={isFormDisabled}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {external ? "Kho nhận thành phẩm" : "Chi nhánh đầu ra"}
                </label>
                <BranchDropdown
                  options={branches.map((b) => ({ value: b.id, label: b.name }))}
                  value={destinationBranchId}
                  placeholder="Chọn chi nhánh"
                  onChange={setDestinationBranchId}
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* ── Gửi sản xuất: nhà máy, NCC, phí lô ── */}
            {external && (
              <div className="grid grid-cols-2 gap-4 p-3 border rounded bg-gray-50">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nhà máy
                  </label>
                  <FactorySelect
                    value={factoryId}
                    onChange={handleFactoryChange}
                    placeholder="— Chọn nhà máy —"
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nhà cung cấp (ghi công nợ)
                  </label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={supplierId ? String(supplierId) : ""}
                    onChange={(v) => setSupplierId(v ? Number(v) : null)}
                    placeholder="Chọn nhà cung cấp"
                    searchPlaceholder="Tìm nhà cung cấp..."
                    disabled={isFormDisabled || supplierLockedByFactory}
                    size="sm"
                  />
                  {supplierLockedByFactory && (
                    <p className="text-xs text-gray-400 mt-1">
                      Theo nhà cung cấp đã gắn với nhà máy.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phí sản xuất lô hàng (nếu có)
                  </label>
                  <div className="flex gap-2">
                    {feeCurrency === "VND" ? (
                      // Gõ đến đâu thêm dấu phẩy ngăn cách đến đó.
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          processingFee
                            ? formatNumberInput(String(processingFee))
                            : ""
                        }
                        onChange={(e) =>
                          setProcessingFee(
                            parseNumberInput(formatNumberInput(e.target.value)),
                          )
                        }
                        disabled={isFormDisabled}
                        className="text-sm flex-1 min-w-0 px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    ) : (
                      <NumericInput
                        value={feeForeignAmount}
                        onValueChange={setFeeForeignAmount}
                        maxFractionDigits={2}
                        disabled={isFormDisabled}
                        className="text-sm flex-1 min-w-0 px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    )}
                    <select
                      value={feeCurrency}
                      onChange={(e) =>
                        setFeeCurrency(e.target.value as "VND" | "CNY")
                      }
                      disabled={isFormDisabled}
                      className="text-sm w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed">
                      <option value="VND">VND</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cộng vào nợ nhà cung cấp khi phiếu Hoàn thành.
                  </p>
                </div>
                {feeCurrency === "CNY" ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tỷ giá CNY → VND
                    </label>
                    <NumericInput
                      value={feeExchangeRate}
                      onValueChange={setFeeExchangeRate}
                      maxFractionDigits={2}
                      disabled={isFormDisabled}
                      className="text-sm w-full px-2 py-1 border rounded text-right focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Phí quy đổi: {feeInVnd.toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                ) : (
                  <div />
                )}
                <div className="col-span-2 grid grid-cols-3 gap-2 text-sm">
                  <div className="px-3 py-2 border rounded bg-white">
                    <div className="text-xs text-gray-500">
                      Giá vốn nguyên liệu gửi đi
                    </div>
                    <div className="font-medium">
                      {Math.round(materialValue).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div className="px-3 py-2 border rounded bg-white">
                    <div className="text-xs text-gray-500">Phí sản xuất</div>
                    <div className="font-medium">
                      {feeInVnd.toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                  <div className="px-3 py-2 border rounded bg-brand-soft">
                    <div className="text-xs text-gray-500">
                      Giá thành dự kiến / sp
                    </div>
                    <div className="font-semibold text-brand">
                      {Math.round(estimatedUnitCost).toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bảng dự tính sử dụng nguyên liệu ── */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Bảng dự tính sử dụng nguyên liệu
              </label>
              {!selectedProduct ? (
                <div className="text-center text-gray-500 py-6 border rounded bg-gray-50 text-sm">
                  Vui lòng chọn sản phẩm để xem bảng nguyên liệu
                </div>
              ) : componentRequirements.length === 0 ? (
                <div className="text-center text-gray-500 py-6 border rounded bg-gray-50 text-sm">
                  Sản phẩm này chưa có thành phần nào
                </div>
              ) : (
                <div className="overflow-x-auto border rounded">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                          Mã thành phần
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-gray-700">
                          Tên thành phần
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                          Cần (g/sp)
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                          Tổng cần (g)
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                          Công thức
                        </th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">
                          Thực tế dùng
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                          Tồn kho
                        </th>
                        <th className="px-3 py-2 text-center text-sm font-medium text-gray-700">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {componentRequirements.map((req, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-3 py-2 text-sm">
                            {req.productCode}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {req.productName}
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            {req.requiredGramsPerUnit.toLocaleString("vi-VN")}
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            {req.totalRequiredGrams.toLocaleString("vi-VN")}
                          </td>
                          <td className="px-3 py-2 text-sm text-right text-gray-500">
                            {req.unitsToDeduct.toLocaleString("vi-VN", {
                              maximumFractionDigits: 3,
                            })}
                            {req.unit && (
                              <span className="text-gray-400 ml-1 text-xs">
                                {req.unit}
                              </span>
                            )}
                          </td>
                          {/* Thực tế dùng */}
                          <td className="px-3 py-2 text-sm text-center">
                            <div className="flex items-center justify-end gap-1">
                              {/* Nút giảm */}
                              <button
                                type="button"
                                disabled={isFormDisabled}
                                onClick={() => {
                                  const current =
                                    req.weightInGrams > 0
                                      ? req.actualUnitsToDeduct
                                      : req.actualG;
                                  const next = Math.max(0, current - 1);
                                  const newGrams =
                                    req.weightInGrams > 0
                                      ? next * req.weightInGrams
                                      : next;
                                  setActualUnitInputs((prev) => {
                                    const updated = { ...prev };
                                    delete updated[req.componentProductId];
                                    return updated;
                                  });
                                  setActualGrams((prev) => ({
                                    ...prev,
                                    [req.componentProductId]: newGrams,
                                  }));
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500">
                                <Minus className="w-3 h-3" />
                              </button>

                              {/* Text input */}
                              <input
                                type="text"
                                value={
                                  actualUnitInputs[req.componentProductId] !==
                                  undefined
                                    ? actualUnitInputs[req.componentProductId]
                                    : (req.weightInGrams > 0
                                        ? req.actualUnitsToDeduct
                                        : req.actualG
                                      ).toLocaleString("vi-VN", {
                                        maximumFractionDigits: 3,
                                      })
                                }
                                onChange={(e) =>
                                  setActualUnitInputs((prev) => ({
                                    ...prev,
                                    [req.componentProductId]: e.target.value,
                                  }))
                                }
                                onBlur={(e) => {
                                  // Parse cả "," lẫn "." làm dấu thập phân
                                  const raw = e.target.value
                                    .replace(/\./g, "")
                                    .replace(",", ".");
                                  const parsed = parseFloat(raw);
                                  if (!isNaN(parsed) && parsed >= 0) {
                                    const newGrams =
                                      req.weightInGrams > 0
                                        ? parsed * req.weightInGrams
                                        : parsed;
                                    setActualGrams((prev) => ({
                                      ...prev,
                                      [req.componentProductId]: newGrams,
                                    }));
                                  }
                                  // Xóa input string → trả về computed display
                                  setActualUnitInputs((prev) => {
                                    const updated = { ...prev };
                                    delete updated[req.componentProductId];
                                    return updated;
                                  });
                                }}
                                disabled={isFormDisabled}
                                className="w-20 border rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />

                              {/* <span className="text-xs text-gray-400 w-6 text-left">
                                {req.weightInGrams > 0 ? req.unit || "đv" : "g"}
                              </span> */}

                              {/* Nút tăng */}
                              <button
                                type="button"
                                disabled={isFormDisabled}
                                onClick={() => {
                                  const current =
                                    req.weightInGrams > 0
                                      ? req.actualUnitsToDeduct
                                      : req.actualG;
                                  const next = current + 1;
                                  const newGrams =
                                    req.weightInGrams > 0
                                      ? next * req.weightInGrams
                                      : next;
                                  setActualUnitInputs((prev) => {
                                    const updated = { ...prev };
                                    delete updated[req.componentProductId];
                                    return updated;
                                  });
                                  setActualGrams((prev) => ({
                                    ...prev,
                                    [req.componentProductId]: newGrams,
                                  }));
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            {/* Hint gram bên dưới */}
                            {req.weightInGrams > 0 && (
                              <div className="text-xs text-gray-400 text-right mt-0.5 pr-7">
                                ≈{" "}
                                {req.actualG.toLocaleString("vi-VN", {
                                  maximumFractionDigits: 0,
                                })}{" "}
                                g
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-right">
                            {req.availableStock.toLocaleString("vi-VN")}
                            {req.unit && (
                              <span className="text-gray-400 ml-1 text-xs">
                                {req.unit}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {req.isInsufficient ? (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
                                Không đủ
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                                Đủ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Ghi chú ── */}
            <div>
              <label className="block text-sm font-medium mb-1">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                maxLength={1000}
                rows={3}
                placeholder="Ghi chú..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                disabled={isFormDisabled}
              />
            </div>

            {/* ── Checkbox tự động trừ ── */}
            <div hidden={external}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDeductComponents}
                  onChange={(e) => setAutoDeductComponents(e.target.checked)}
                  className="rounded disabled:cursor-not-allowed"
                  disabled={isFormDisabled}
                />
                <span className="text-sm">
                  Tự động trừ thành phần thứ cấp khi sản xuất
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                {autoDeductComponents
                  ? "Khi hoàn thành, tồn kho nguyên liệu sẽ tự động trừ và tồn kho thành phẩm sẽ được cộng"
                  : "Tồn kho sẽ không tự động thay đổi khi hoàn thành phiếu"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 border-t">
          {production && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50"
              hidden={
                isSubmitting ||
                production.status === 3 ||
                // Phiếu gửi đã gửi/hoàn thành: chỉ admin hủy ở chi tiết phiếu.
                (external && production.status !== 1)
              }>
              {isSubmitting ? "Đang xử lý..." : "Hủy"}
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={isSubmitting}>
              Bỏ qua
            </button>

            {(!production || production.status === 1) && (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 border border-brand text-brand rounded hover:bg-brand-soft disabled:opacity-50"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Lưu tạm"}
                </button>
                {external ? (
                  <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50"
                    disabled={isSubmitting}>
                    {isSubmitting ? "Đang xử lý..." : "Gửi hàng"}
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50"
                    disabled={isSubmitting}>
                    {isSubmitting ? "Đang xử lý..." : "Hoàn thành"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showCancelConfirm && production && (
        <CancelConfirmationModal
          productionCode={production.code}
          productionStatus={production.status}
          onConfirm={confirmCancel}
          onClose={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  );
}
