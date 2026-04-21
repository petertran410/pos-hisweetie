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
  Clock,
} from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useProducts, useProduct } from "@/lib/hooks/useProducts";
import {
  useCreateProduction,
  useProduction,
  useUpdateProduction,
} from "@/lib/hooks/useProductions";
import type { Production } from "@/lib/api/productions";
import type { Product } from "@/lib/api/products";
import { CancelConfirmationModal } from "./CancelConfirmationModal";

interface ProductionFormProps {
  sourceBranchId: number;
  destinationBranchId: number;
  production?: Production | null;
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
                  ? "bg-blue-600 text-white font-semibold"
                  : isToday
                    ? "border border-blue-400 text-blue-600 font-medium hover:bg-blue-50"
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
                    ? "bg-blue-600 text-white font-medium"
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
                    ? "bg-blue-600 text-white font-medium"
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

export function ProductionForm({
  sourceBranchId: initialSourceBranchId,
  destinationBranchId: initialDestinationBranchId,
  production,
  onClose,
}: ProductionFormProps) {
  const [code, setCode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
  const [showCal, setShowCal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const { data: branches } = useBranches();
  const { data: productsData } = useProducts({ type: 4 });
  const { data: productDetail } = useProduct(production?.productId || 0);
  const { data: freshProduction } = useProduction(production?.id || 0);
  const { mutate: createProduction, isPending: isCreating } =
    useCreateProduction();
  const { mutate: updateProduction, isPending: isUpdating } =
    useUpdateProduction();

  const isCompleted = production?.status === 2;
  const isCancelled = production?.status === 3;
  const isSubmitting = isCreating || isUpdating;
  const isFormDisabled = isSubmitting || isCompleted || isCancelled;

  const manufacturingProducts =
    productsData?.data?.filter((p) => p.type === 4) || [];

  const filteredProducts = manufacturingProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initializedFromSavedRef = useRef(false);

  useEffect(() => {
    if (production) {
      setCode(production.code);
      setQuantity(Number(production.quantity));
      setSourceBranchId(production.sourceBranchId);
      setDestinationBranchId(production.destinationBranchId);
      setNote(production.note || "");
      setAutoDeductComponents(production.autoDeductComponents);
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

  // Reset actualGrams về công thức khi đổi sản phẩm hoặc số lượng
  useEffect(() => {
    if (!selectedProduct?.comboComponents) return;

    const hasSaved =
      freshProduction?.components && freshProduction.components.length > 0;
    const useSaved = hasSaved && !initializedFromSavedRef.current;

    const defaults: { [id: number]: number } = {};
    selectedProduct.comboComponents.forEach((comp) => {
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
  }, [selectedProduct, quantity, freshProduction]);

  const calculateComponentRequirements = () => {
    if (!selectedProduct || !selectedProduct.comboComponents) return [];

    return selectedProduct.comboComponents.map((comp) => {
      const componentProduct = comp.componentProduct;

      // ─── PIECE MODE ───────────────────────────────────────────────
      if (comp.inputMode === "piece") {
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
          unit: componentProduct?.unit || "chiếc",
          requiredGramsPerUnit: requiredPiecesPerUnit,
          totalRequiredGrams: totalRequiredPieces,
          weightInGrams: 0,
          unitsToDeduct: totalRequiredPieces, // công thức: pieces
          actualG, // actual pieces
          actualUnitsToDeduct: actualG, // trừ kho đúng số chiếc
          availableStock,
          isInsufficient,
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
      };
    });
  };

  const componentRequirements = calculateComponentRequirements();

  const validateForm = () => {
    if (!selectedProduct) {
      alert("Vui lòng chọn sản phẩm cần sản xuất");
      return false;
    }

    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0");
      return false;
    }

    return true;
  };

  const handleSubmit = (status: number) => {
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
    };

    if (production) {
      updateProduction(
        { id: production.id, data },
        {
          onSuccess: () => onClose(),
          onError: (error) => {
            console.error("Error updating production:", error);
            alert("Có lỗi xảy ra khi cập nhật phiếu sản xuất");
          },
        }
      );
    } else {
      createProduction(data, {
        onSuccess: () => onClose(),
        onError: (error) => {
          console.error("Error creating production:", error);
          alert("Có lỗi xảy ra khi tạo phiếu sản xuất");
        },
      });
    }
  };

  const handleSaveDraft = () => {
    handleSubmit(1);
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
        onError: (error) => {
          console.error("Error canceling production:", error);
          setShowCancelConfirm(false);
          alert("Có lỗi xảy ra khi hủy phiếu sản xuất");
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
              ? isCompleted || isCancelled
                ? "Xem phiếu sản xuất"
                : "Sửa phiếu sản xuất"
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
                  Mã sản xuất
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Mã phiếu tự động"
                  className="text-sm w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  Sản xuất mặt hàng
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
                    className="text-sm w-full px-2 py-1 pr-8 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              </div>
            </div>

            {/* ── Ngày SX + Số lượng ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Thời gian sản xuất
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
                          ? "border-blue-400 ring-2 ring-blue-100"
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
                          ? "border-blue-400 ring-2 ring-blue-100"
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
                  className="text-sm w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* ── Chi nhánh ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Chi nhánh đầu vào
                </label>
                <select
                  value={sourceBranchId}
                  onChange={(e) => setSourceBranchId(Number(e.target.value))}
                  className="text-sm w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Chi nhánh đầu ra
                </label>
                <select
                  value={destinationBranchId}
                  onChange={(e) =>
                    setDestinationBranchId(Number(e.target.value))
                  }
                  className="text-sm w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={isFormDisabled}>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                                className="w-20 border rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
                disabled={isFormDisabled}
              />
            </div>

            {/* ── Checkbox tự động trừ ── */}
            <div>
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
              hidden={isSubmitting || production.status === 3}>
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
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:opacity-50"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Lưu tạm"}
                </button>
                <button
                  onClick={handleComplete}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Đang xử lý..." : "Hoàn thành"}
                </button>
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
