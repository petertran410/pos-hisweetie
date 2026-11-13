"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { UnitSelect } from "./UnitSelect";
import { useUnits } from "@/lib/hooks/useUnits";
import { CARTON_UNIT_CODE, normalizeUnitKey } from "@/lib/api/units";
import type {
  Product,
  ProductComponent,
  ProductFormula,
} from "@/lib/api/products";
import type { ManufacturerMaterial } from "@/lib/api/manufacturers";
import { ManufacturerMaterialsEditor } from "@/components/manufacturers/ManufacturerMaterialsEditor";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  currencySymbol,
  isNsxUnit,
  normalizeNsxUnit,
  nsxPriceFactor,
  nsxRawAmount,
  round6,
  type NsxUnit,
} from "@/lib/utils/nsx-pricing";
import {
  useCreateProduct,
  useUpdateProduct,
  useProducts,
} from "@/lib/hooks/useProducts";
import { useAuthStore } from "@/lib/store/auth";
import { useBranchStore } from "@/lib/store/branch";
import { CostConfirmationModal } from "./CostConfirmationModal";
import { FormSection } from "./FormSection";
import { ProductFormHeader } from "./ProductFormHeader";
import "./product-form.css";
import { CategoryDropdown } from "./CategoryDropdown";
import { toast } from "sonner";
import { TrademarkDropdown } from "./TrademarkDropdown";
import { MisaItemDropdown } from "./MisaItemDropdown";
import { MisaInventoryItem } from "@/lib/api/misa";
import { usePermission } from "@/lib/hooks/usePermissions";
import { useFormattedNumber } from "@/lib/hooks/useFormattedNumber";
import { API_URL } from "@/lib/config/api";
import { formatNumberInput } from "@/lib/utils";
import { usePublication } from "./publication/usePublication";
import { PublicationSection } from "./publication/PublicationSection";
import {
  ProductImageGallery,
  toProductImageItems,
  uploadProductImages,
  type ProductImageItem,
} from "./ProductImageGallery";

interface ManufacturingComponent {
  id?: number;
  componentProductId: number;
  componentProduct?: Product;
  quantity: number;
}

type InputMode = "gram" | "quantity" | "piece" | "carton";

// Một công thức thành phần. Công thức đang mở được sửa qua state
// components / quantityInputs / inputModes; chuyển tab thì lưu lại vào đây.
// Công thức gửi đi sản xuất (isExternal): thêm nguyên liệu NSX (định lượng /
// 1 sp), phí gia công / 1 sp, tiền tệ. Các trường này sửa thẳng trên `formulas`
// (không qua state của tab đang mở). Không bao giờ là mặc định.
interface FormulaDraft {
  key: string;
  id?: number;
  name: string;
  isDefault: boolean;
  components: ManufacturingComponent[];
  quantityInputs: { [key: number]: string };
  inputModes: { [componentProductId: number]: InputMode };
  isExternal: boolean;
  processingFeePerUnit: number;
  currency: "VND" | "CNY";
  nsxLines: ManufacturerMaterial[];
}

const emptyFormula = (key: string, name: string, isDefault: boolean) => ({
  key,
  name,
  isDefault,
  components: [],
  quantityInputs: {},
  inputModes: {},
  isExternal: false,
  processingFeePerUnit: 0,
  currency: "VND" as const,
  nsxLines: [] as ManufacturerMaterial[],
});

// Dòng NSX đã lưu trong công thức → dòng của bảng nguyên liệu NSX.
const nsxLinesFromFormula = (f: ProductFormula): ManufacturerMaterial[] =>
  (f.nsxLines ?? []).map((l) => ({
    productId: l.productId,
    productCode: l.product?.code ?? null,
    description: l.product?.name ?? `#${l.productId}`,
    pricingMode: "UNIT_PRICE",
    quantity: Number(l.quantity),
    unit: l.unit,
    unitPrice: Number(l.unitPrice),
    priceUnit: isNsxUnit(l.priceUnit)
      ? (normalizeNsxUnit(l.priceUnit) as NsxUnit)
      : null,
    amount: 0,
  }));

// Gram của dòng NSX đơn vị g/kg (để đối chiếu trọng lượng thành phẩm).
const nsxLineGrams = (line: ManufacturerMaterial) => {
  const unit = normalizeNsxUnit(line.unit);
  if (unit === "g") return Number(line.quantity ?? 0);
  if (unit === "kg") return Number(line.quantity ?? 0) * 1000;
  return 0;
};

interface ManufacturingProductFormProps {
  product?: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManufacturingProductForm({
  product,
  onClose,
  onSuccess,
}: ManufacturingProductFormProps) {
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [components, setComponents] = useState<ManufacturingComponent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCostConfirmation, setShowCostConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const itemsPerPage = 10;

  const { data: searchResults } = useProducts({
    search: searchQuery,
    limit: 10,
  });
  const { selectedBranch } = useBranchStore();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const currentBranchInventory = product?.inventories?.find(
    (inv) => inv.branchId === selectedBranch?.id
  );

  const [quantityInputs, setQuantityInputs] = useState<{
    [key: number]: string;
  }>({});
  const [inputModes, setInputModes] = useState<{
    [componentProductId: number]: "gram" | "quantity" | "piece" | "carton";
  }>({});
  const [formulas, setFormulas] = useState<FormulaDraft[]>([
    emptyFormula("new-0", "Công thức 1", true),
  ]);
  const [activeFormulaKey, setActiveFormulaKey] = useState("new-0");
  const formulaKeySeq = useRef(1);

  const getWeightInGrams = (comp: ManufacturingComponent): number => {
    const w = comp.componentProduct?.weight
      ? Number(comp.componentProduct.weight)
      : 0;
    const wu = comp.componentProduct?.weightUnit || "g";
    return wu === "kg" ? w * 1000 : w;
  };

  const { data: units = [] } = useUnits();
  const cartonUnitName =
    units.find((u) => u.code === CARTON_UNIT_CODE)?.name ?? "Thùng";

  // "Định lượng đóng gói" của nguyên liệu: 1 thùng = Q đơn vị tính.
  const getPackSize = (comp: ManufacturingComponent): number => {
    const q = Number(comp.componentProduct?.conversionValue ?? 1);
    return q >= 1 ? q : 1;
  };

  // Đơn vị tính đã là "Thùng" (đơn vị hệ thống CARTON trong danh mục) thì
  // lựa chọn "Thùng (N …)" trùng nghĩa → không hiện.
  const isCartonUnit = (comp: ManufacturingComponent): boolean =>
    normalizeUnitKey(comp.componentProduct?.unit) ===
    normalizeUnitKey(cartonUnitName);

  // Số đơn vị tính của nguyên liệu cho 1 thành phẩm, suy từ số đang lưu
  // (gram/quantity lưu theo gram; piece/carton lưu theo đơn vị tính).
  const getUnitsPerProduct = (
    comp: ManufacturingComponent,
    mode: InputMode
  ): number => {
    if (mode === "piece" || mode === "carton") return comp.quantity;
    const wg = getWeightInGrams(comp);
    return wg > 0 ? comp.quantity / wg : comp.quantity;
  };

  const toggleInputMode = (productId: number) => {
    const currentMode = inputModes[productId] ?? "gram";
    // piece/carton mode là cố định, không cho toggle
    if (currentMode === "piece" || currentMode === "carton") return;

    const comp = components.find((c) => c.componentProductId === productId);
    if (!comp) return;
    const wg = getWeightInGrams(comp);
    if (wg === 0) return;

    const newMode = currentMode === "gram" ? "quantity" : "gram";

    let newDisplay: string;
    if (newMode === "quantity") {
      newDisplay = (comp.quantity / wg).toFixed(4).replace(/\.?0+$/, "");
    } else {
      newDisplay = comp.quantity.toString();
    }

    setInputModes((prev) => ({ ...prev, [productId]: newMode }));
    setQuantityInputs((prev) => ({ ...prev, [productId]: newDisplay }));
  };
  void toggleInputMode;

  // Chuyển mode tường minh (dùng cho dropdown có lựa chọn "thùng").
  // Tính lại quantity lưu trữ + chuỗi hiển thị tương ứng với mode mới.
  const switchMode = (
    productId: number,
    newMode: "gram" | "quantity" | "piece" | "carton"
  ) => {
    const comp = components.find((c) => c.componentProductId === productId);
    if (!comp) return;
    const wg = getWeightInGrams(comp);
    const oldMode = inputModes[productId] ?? "gram";
    if (oldMode === newMode) return;

    let newQuantity = comp.quantity;
    let newDisplay = "";
    // Đổi cách nhập nhưng GIỮ NGUYÊN lượng nguyên liệu đang dùng cho 1 sp.
    const units = getUnitsPerProduct(comp, oldMode);
    const fmt = (v: number) => v.toFixed(4).replace(/\.?0+$/, "");

    if (newMode === "carton") {
      // Ô nhập = số thùng cho 1 thành phẩm; lưu theo đơn vị tính.
      newQuantity = units;
      newDisplay = fmt(units / getPackSize(comp));
    } else if (newMode === "gram") {
      // gram mode lưu theo gram
      newQuantity = wg > 0 ? units * wg : comp.quantity;
      newDisplay = fmt(newQuantity);
    } else if (newMode === "quantity") {
      // quantity mode hiển thị đơn vị tính nhưng lưu theo gram
      newQuantity = wg > 0 ? units * wg : units;
      newDisplay = fmt(units);
    } else {
      // piece
      newQuantity = units;
      newDisplay = fmt(units);
    }

    updateComponentQuantity(productId, newQuantity);
    setInputModes((prev) => ({ ...prev, [productId]: newMode }));
    setQuantityInputs((prev) => ({ ...prev, [productId]: newDisplay }));
  };

  const handleQuantityChange = (productId: number, inputValue: string) => {
    const cleaned = inputValue.replace(/[^\d.]/g, "");
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) return;

    setQuantityInputs((prev) => ({ ...prev, [productId]: cleaned }));

    if (cleaned === "" || cleaned === ".") {
      updateComponentQuantity(productId, 0);
      return;
    }

    const numValue = parseFloat(cleaned);
    if (!isNaN(numValue)) {
      const mode = inputModes[productId] ?? "gram";
      if (mode === "carton") {
        // Ô nhập = số thùng cho 1 thành phẩm. 1 thùng = Q đơn vị tính (theo
        // "Định lượng đóng gói") → lưu số đơn vị tính = số thùng × Q.
        const comp = components.find((c) => c.componentProductId === productId);
        const pack = comp ? getPackSize(comp) : 1;
        updateComponentQuantity(productId, numValue * pack);
      } else if (mode === "gram" || mode === "piece") {
        updateComponentQuantity(productId, numValue);
      } else {
        // quantity mode → convert sang gram
        const comp = components.find((c) => c.componentProductId === productId);
        const wg = getWeightInGrams(comp!);
        // ← THÊM guard: nếu wg = 0 thì lưu trực tiếp như piece mode
        updateComponentQuantity(productId, wg > 0 ? numValue * wg : numValue);
      }
    }
  };

  const basePrice = useFormattedNumber(product?.basePrice || 0);
  const weight = useFormattedNumber(product?.weight || 0);
  const shippingWeight = useFormattedNumber(product?.shippingWeight || 0);
  const stockQuantity = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.onHand) : 0
  );
  const minStockAlert = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.minQuality) : 0
  );
  const maxStockAlert = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.maxQuality) : 0
  );
  const purchasePrice = useFormattedNumber(
    currentBranchInventory ? Number(currentBranchInventory.cost) : 0
  );
  const costManuallyEdited = useRef(false);
  const justLoadedFromProduct = useRef(false);
  const hasLoadedFromProduct = useRef(false);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      code: product?.code || "",
      name: product?.name || "",
      description: product?.description || "",
      orderTemplate: product?.orderTemplate || "",
      parentName: product?.parentName || undefined,
      middleName: product?.middleName || undefined,
      childName: product?.childName || undefined,
      tradeMarkId: product?.tradeMarkId || undefined,
      weightUnit: product?.weightUnit || "kg",
      shippingWeightUnit: product?.shippingWeightUnit || "g",
      vat: product?.vat ?? 8,
      unit: product?.unit || "",
      conversionValue: product?.conversionValue ?? 1,
      isDirectSale: product?.isDirectSale || false,
      isActive: product?.isActive ?? true,
      allowsSale: product?.allowsSale ?? true,
      isRewardPoint: product?.isRewardPoint ?? false,
    },
  });

  const watchedUnit = watch("unit");
  const watchedWeightUnit = watch("weightUnit");

  const canLinkMisa = usePermission("products", "link_misa");
  const canEditPublication = usePermission("products", "edit_publication");
  const canViewCostPrice = usePermission("products", "view_cost_price");
  const canViewSalePrice = usePermission("products", "view_sale_price");
  // view_cost_price/view_sale_price chỉ ẩn ô giá trên UI, không quyết định
  // payload: ai có products:update thì lưu được đủ dữ liệu sản phẩm (gồm BOM).
  const [activeTab, setActiveTab] = useState<
    "info" | "description" | "publication"
  >("info");
  const pub = usePublication(product);

  // Liên kết với vật tư hàng hóa Misa (lưu mã + tên + đơn vị).
  const [misaMapping, setMisaMapping] = useState<{
    code: string;
    name: string;
    unit: string;
  }>({
    code: product?.misa_code || "",
    name: product?.misa_name || "",
    unit: product?.misa_unit || "",
  });

  useEffect(() => {
    setMisaMapping({
      code: product?.misa_code || "",
      name: product?.misa_name || "",
      unit: product?.misa_unit || "",
    });
  }, [product]);

  const hasCostChanged = (): boolean => {
    // Thiếu quyền xem giá vốn → giá vốn được derive từ dữ liệu đã bị strip
    // (NaN). Không coi là thay đổi để tránh bật modal sai + gửi NaN lên BE.
    if (!canViewCostPrice) return false;
    if (!product) return purchasePrice.value > 0;
    const currentCost =
      product.inventories?.find((inv) => inv.branchId === selectedBranch?.id)
        ?.cost || 0;
    return Number(currentCost) !== purchasePrice.value;
  };

  const submitProduct = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (product) {
        await updateProduct.mutateAsync(
          { id: product.id, data: formData },
          { onSuccess }
        );
      } else {
        await createProduct.mutateAsync(formData, { onSuccess });
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
      setPendingFormData(null);
    }
  };

  useEffect(() => {
    // Bỏ qua khi product tồn tại nhưng components chưa load (empty initial state)
    if (product && components.length === 0) return;

    // Bỏ qua ngay sau khi setComponents từ product load
    if (justLoadedFromProduct.current) {
      justLoadedFromProduct.current = false;
      return;
    }

    // Thiếu quyền giá vốn → calculateTotalPurchasePrice() ra NaN (cost bị strip).
    // Không reset để tránh NaN lan sang logic khác.
    if (!canViewCostPrice) return;
    // Không có công thức nội bộ mặc định (toàn công thức gửi đi) → không tự tính.
    const autoCost = calculateTotalPurchasePrice();
    if (autoCost != null && !costManuallyEdited.current) {
      purchasePrice.reset(autoCost);
    }
  }, [components, selectedBranch?.id]);

  // Dựng state bảng thành phần (components + ô nhập + mode) từ dữ liệu đã lưu.
  const buildFormulaState = (savedComponents: ProductComponent[]) => {
    const loadedComponents = savedComponents.map((comp) => ({
      id: comp.id,
      componentProductId: comp.componentProductId,
      componentProduct: comp.componentProduct,
      quantity: Number(comp.quantity),
    }));

    const initialInputs: { [key: number]: string } = {};
    const initialModes: {
      [key: number]: "gram" | "quantity" | "piece" | "carton";
    } = {};

    loadedComponents.forEach((comp) => {
      const savedMode =
        (savedComponents.find(
          (c) => c.componentProductId === comp.componentProductId
        )?.inputMode as "gram" | "quantity" | "piece" | "carton") ??
        (comp.componentProduct?.isPieceUnit ? "piece" : "gram");

      // ← THÊM: override về "piece" nếu sản phẩm isPieceUnit hoặc không có weight
      // (KHÔNG override "carton" — thùng cố ý weight=0 nhưng quy đổi theo 1/N)
      const wg = getWeightInGrams(comp);
      const effectiveMode: "gram" | "quantity" | "piece" | "carton" =
        (savedMode === "quantity" || savedMode === "gram") &&
        (comp.componentProduct?.isPieceUnit === true || wg === 0)
          ? "piece"
          : savedMode;

      initialModes[comp.componentProductId] = effectiveMode; // ← dùng effectiveMode thay savedMode

      if (effectiveMode === "carton") {
        // quantity lưu theo đơn vị tính → hiển thị lại số thùng cho 1 sp
        initialInputs[comp.componentProductId] = (
          comp.quantity / getPackSize(comp)
        )
          .toFixed(4)
          .replace(/\.?0+$/, "");
      } else if (effectiveMode === "quantity") {
        const displayCount = wg > 0 ? comp.quantity / wg : comp.quantity;
        initialInputs[comp.componentProductId] = displayCount
          .toFixed(4)
          .replace(/\.?0+$/, "");
      } else {
        initialInputs[comp.componentProductId] = comp.quantity.toString();
      }
    });

    return {
      components: loadedComponents,
      quantityInputs: initialInputs,
      inputModes: initialModes,
    };
  };

  useEffect(() => {
    if (
      (product?.formulas?.length || product?.comboComponents) &&
      !hasLoadedFromProduct.current
    ) {
      hasLoadedFromProduct.current = true;
      justLoadedFromProduct.current = true;
      costManuallyEdited.current = true;

      // Sản phẩm chưa có công thức (dữ liệu cũ) → coi comboComponents là
      // công thức mặc định.
      const drafts: FormulaDraft[] = product.formulas?.length
        ? product.formulas.map((f) => ({
            key: `id-${f.id}`,
            id: f.id,
            name: f.name,
            isDefault: !f.isExternal && f.isDefault,
            ...buildFormulaState(f.components),
            isExternal: !!f.isExternal,
            processingFeePerUnit: Number(f.processingFeePerUnit ?? 0),
            currency:
              f.currency === "CNY" ? ("CNY" as const) : ("VND" as const),
            nsxLines: nsxLinesFromFormula(f),
          }))
        : [
            {
              ...emptyFormula("new-0", "Công thức 1", true),
              ...buildFormulaState(product.comboComponents ?? []),
            },
          ];
      const active = drafts.find((f) => f.isDefault) ?? drafts[0];
      setFormulas(drafts);
      setActiveFormulaKey(active.key);
      setComponents(active.components);
      setQuantityInputs(active.quantityInputs);
      setInputModes(active.inputModes);
    }
  }, [product]);

  // Danh sách công thức với công thức đang mở được cập nhật theo bảng hiện tại.
  const syncedFormulas = (): FormulaDraft[] =>
    formulas.map((f) =>
      f.key === activeFormulaKey
        ? { ...f, components, quantityInputs, inputModes }
        : f
    );

  const openFormula = (draft: FormulaDraft) => {
    setActiveFormulaKey(draft.key);
    setComponents(draft.components);
    setQuantityInputs(draft.quantityInputs);
    setInputModes(draft.inputModes);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const switchFormula = (key: string) => {
    if (key === activeFormulaKey) return;
    const synced = syncedFormulas();
    setFormulas(synced);
    openFormula(synced.find((f) => f.key === key)!);
  };

  const addFormula = (copyCurrent: boolean) => {
    const synced = syncedFormulas();
    const names = new Set(synced.map((f) => f.name.trim().toLowerCase()));
    let n = synced.length + 1;
    while (names.has(`công thức ${n}`)) n++;
    const current = synced.find((f) => f.key === activeFormulaKey);
    const draft: FormulaDraft = {
      ...emptyFormula(
        `new-${formulaKeySeq.current++}`,
        `Công thức ${n}`,
        false
      ),
      ...(copyCurrent
        ? {
            components: components.map((c) => ({ ...c, id: undefined })),
            quantityInputs: { ...quantityInputs },
            inputModes: { ...inputModes },
            ...(current?.isExternal
              ? {
                  isExternal: true,
                  processingFeePerUnit: current.processingFeePerUnit,
                  currency: current.currency,
                  nsxLines: current.nsxLines.map((l) => ({ ...l })),
                }
              : {}),
          }
        : {}),
    };
    setFormulas([...synced, draft]);
    openFormula(draft);
  };

  const renameFormula = (key: string, name: string) => {
    setFormulas((prev) =>
      prev.map((f) => (f.key === key ? { ...f, name } : f))
    );
  };

  const setDefaultFormula = (key: string) => {
    setFormulas((prev) =>
      prev.map((f) => ({ ...f, isDefault: f.key === key && !f.isExternal }))
    );
  };

  // Luôn có đúng 1 mặc định trong số công thức nội bộ (nếu còn công thức nội bộ).
  const ensureInternalDefault = (list: FormulaDraft[]) => {
    if (list.some((f) => f.isDefault && !f.isExternal)) return list;
    const index = list.findIndex((f) => !f.isExternal);
    return index < 0
      ? list
      : list.map((f, i) => (i === index ? { ...f, isDefault: true } : f));
  };

  const updateFormula = (key: string, patch: Partial<FormulaDraft>) => {
    setFormulas((prev) =>
      prev.map((f) => (f.key === key ? { ...f, ...patch } : f))
    );
  };

  const toggleExternal = (key: string, on: boolean) => {
    const target = formulas.find((f) => f.key === key);
    if (!target) return;
    if (
      !on &&
      target.nsxLines.length > 0 &&
      !confirm(
        `Tắt "Dùng cho gửi đi sản xuất" sẽ xóa ${target.nsxLines.length} nguyên liệu NSX và phí gia công của công thức này. Tiếp tục?`
      )
    ) {
      return;
    }
    setFormulas((prev) =>
      ensureInternalDefault(
        prev.map((f) =>
          f.key !== key
            ? f
            : on
              ? { ...f, isExternal: true, isDefault: false }
              : {
                  ...f,
                  isExternal: false,
                  nsxLines: [],
                  processingFeePerUnit: 0,
                  currency: "VND",
                }
        )
      )
    );
  };

  const deleteFormula = (key: string) => {
    if (formulas.length <= 1) return;
    const target = formulas.find((f) => f.key === key);
    if (!target || !confirm(`Xóa "${target.name}"?`)) return;
    const remaining = ensureInternalDefault(
      syncedFormulas().filter((f) => f.key !== key)
    );
    setFormulas(remaining);
    if (key === activeFormulaKey) openFormula(remaining[0]);
  };

  useEffect(() => {
    if (product?.images) {
      setImages(toProductImageItems(product.images));
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      basePrice.reset(product.basePrice || 0);
      weight.reset(product.weight || 0);
      stockQuantity.reset(
        currentBranchInventory ? Number(currentBranchInventory.onHand) : 0
      );
      minStockAlert.reset(
        currentBranchInventory ? Number(currentBranchInventory.minQuality) : 0
      );
      maxStockAlert.reset(
        currentBranchInventory ? Number(currentBranchInventory.maxQuality) : 0
      );
    }
  }, [product, selectedBranch]);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_URL}/upload/image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Upload failed");
    }

    const result = await res.json();
    return result.url;
  };

  const addComponent = (selectedProduct: Product) => {
    const exists = components.find(
      (c) => c.componentProductId === selectedProduct.id
    );
    if (!exists) {
      const w = selectedProduct.weight ? Number(selectedProduct.weight) : 0;
      const wu = selectedProduct.weightUnit || "g";
      const wg = wu === "kg" ? w * 1000 : w;
      const defaultMode: "gram" | "piece" =
        selectedProduct.isPieceUnit === true || wg === 0 ? "piece" : "gram";

      setComponents([
        ...components,
        {
          componentProductId: selectedProduct.id,
          componentProduct: selectedProduct,
          quantity: 1,
        },
      ]);
      setInputModes((prev) => ({ ...prev, [selectedProduct.id]: defaultMode }));
      setQuantityInputs((prev) => ({ ...prev, [selectedProduct.id]: "1" }));
      setSearchQuery("");
      setShowSearchResults(false);
    }
  };

  const removeComponent = (productId: number) => {
    setComponents((prev) =>
      prev.filter((c) => c.componentProductId !== productId)
    );
  };

  const updateComponentQuantity = (productId: number, quantity: number) => {
    setComponents((prev) =>
      prev.map((c) =>
        c.componentProductId === productId ? { ...c, quantity } : c
      )
    );
  };

  const calculateComponentCostByQuantity = (
    comp: ManufacturingComponent,
    modes: { [componentProductId: number]: InputMode } = inputModes
  ): number => {
    const componentProduct = comp.componentProduct;
    if (!componentProduct) return 0;

    const inventory = componentProduct.inventories?.find(
      (inv) => inv.branchId === selectedBranch?.id
    );
    const cost = inventory ? Number(inventory.cost) : 0;
    const mode = modes[comp.componentProductId] ?? "gram";

    // Piece / Carton mode: cost = giá vốn/đơn-vị × quantity.
    // Carton: quantity = 1/N → mỗi thành phẩm gánh giá-thùng/N.
    if (mode === "piece" || mode === "carton") {
      return cost * comp.quantity;
    }

    const weight = componentProduct.weight
      ? Number(componentProduct.weight)
      : 0;
    if (weight === 0) return 0;

    const weightInGrams =
      componentProduct.weightUnit === "kg" ? weight * 1000 : weight;

    return (cost / weightInGrams) * comp.quantity;
  };

  const calculateFormulaCost = (draft: FormulaDraft) =>
    draft.components.reduce(
      (sum, comp) =>
        sum + calculateComponentCostByQuantity(comp, draft.inputModes),
      0
    );

  // Giá vốn sản phẩm tính theo công thức mặc định (nội bộ). Toàn công thức gửi
  // đi → null: giá vốn không tự tính, áp qua "Áp dụng giá vốn gia công".
  const calculateTotalPurchasePrice = (): number | null => {
    const def = syncedFormulas().find((f) => f.isDefault && !f.isExternal);
    return def ? calculateFormulaCost(def) : null;
  };

  // Tiền nguyên liệu NSX / 1 sp (theo tiền tệ của công thức).
  const nsxCostPerUnit = (draft: FormulaDraft) =>
    draft.nsxLines.reduce((sum, line) => sum + nsxRawAmount(line), 0);

  const onSubmit = async (data: any) => {
    const allFormulas = syncedFormulas();
    const emptyFormulaDraft = allFormulas.find(
      (f) => f.components.length === 0
    );
    if (emptyFormulaDraft) {
      toast.error("Hàng thành phần thiếu", {
        description: `"${emptyFormulaDraft.name}" chưa có hàng thành phần.`,
      });
      switchFormula(emptyFormulaDraft.key);
      return;
    }
    const badNsxFormula = allFormulas.find(
      (f) =>
        f.isExternal &&
        f.nsxLines.some(
          (l) =>
            !(Number(l.quantity) > 0) ||
            nsxPriceFactor(l.unit, l.priceUnit) == null
        )
    );
    if (badNsxFormula) {
      toast.error("Nguyên liệu NSX chưa hợp lệ", {
        description: `"${badNsxFormula.name}": nhập định lượng lớn hơn 0 và chọn đơn vị giá phù hợp.`,
      });
      switchFormula(badNsxFormula.key);
      return;
    }
    const formulaNames = allFormulas.map((f) => f.name.trim().toLowerCase());
    if (
      formulaNames.some((n) => !n) ||
      new Set(formulaNames).size !== formulaNames.length
    ) {
      toast.error("Tên công thức không được trống hoặc trùng nhau");
      return;
    }

    setIsSubmitting(true);
    try {
      const { imageUrls, primaryImageUrl } = await uploadProductImages(
        images,
        uploadFile
      );

      const publicationPayload = await pub.getPayload(canEditPublication);

      const formData: Record<string, any> = {
        code: data.code,
        name: data.name,
        type: 4,
        description: data.description || undefined,
        orderTemplate: data.orderTemplate || undefined,
        parentName: data.parentName || undefined,
        middleName: data.middleName || undefined,
        childName: data.childName || undefined,
        tradeMarkId: data.tradeMarkId ? Number(data.tradeMarkId) : undefined,
        ...(canLinkMisa
          ? {
              misa_code: misaMapping.code,
              misa_name: misaMapping.name,
              misa_unit: misaMapping.unit,
            }
          : {}),
        isDirectSale: data.isDirectSale || false,
        isActive: data.isActive ?? true,
        imageUrls,
        primaryImageUrl,
        ...publicationPayload,
        branchId: selectedBranch?.id,
      };

      Object.assign(formData, {
        ...(canViewSalePrice ? { basePrice: basePrice.value } : {}),
        ...(canViewCostPrice
          ? {
              purchasePrice: purchasePrice.value,
              manualCostOverride: costManuallyEdited.current,
            }
          : {}),
        stockQuantity: stockQuantity.value,
        minStockAlert: minStockAlert.value,
        maxStockAlert: maxStockAlert.value,
        weight: weight.value || undefined,
        weightUnit: data.weightUnit || "kg",
        shippingWeight: shippingWeight.value || undefined,
        shippingWeightUnit: data.shippingWeightUnit || "g",
        vat:
          data.vat != null && !isNaN(Number(data.vat)) ? Number(data.vat) : 8,
        unit: data.unit || undefined,
        conversionValue: Math.max(
          1,
          Math.floor(Number(data.conversionValue) || 1)
        ),
        formulas: allFormulas.map((f) => ({
          id: f.id,
          name: f.name.trim(),
          isDefault: f.isDefault && !f.isExternal,
          components: f.components.map((comp) => ({
            componentProductId: comp.componentProductId,
            quantity: comp.quantity,
            inputMode: f.inputModes[comp.componentProductId] ?? "gram",
          })),
          isExternal: f.isExternal,
          processingFeePerUnit: f.isExternal
            ? round6(f.processingFeePerUnit)
            : 0,
          currency: f.isExternal ? f.currency : "VND",
          // Map tường minh: server bật forbidNonWhitelisted.
          nsxLines: f.isExternal
            ? f.nsxLines.map((l) => ({
                productId: l.productId,
                quantity: round6(Number(l.quantity)),
                unit: l.unit,
                unitPrice: Number(l.unitPrice),
                priceUnit: l.priceUnit,
              }))
            : [],
        })),
      });

      if (hasCostChanged()) {
        setPendingFormData(formData);
        setShowCostConfirmation(true);
        setIsSubmitting(false);
        return;
      }

      await submitProduct(formData);
    } catch (error) {
      console.error("Submit error:", error);
      setIsSubmitting(false);
    }
  };

  const handleCostConfirm = async (
    scope: "all" | "specific",
    branchId?: number[]
  ) => {
    setShowCostConfirmation(false);

    if (!pendingFormData) return;

    const finalData = {
      ...pendingFormData,
      costScope: scope,
      costBranchIds: branchId,
    };

    await submitProduct(finalData);
  };

  const totalPages = Math.ceil((components.length || 0) / itemsPerPage);
  const paginatedComponents = components.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeDraft = formulas.find((f) => f.key === activeFormulaKey);
  const totalComponentGrams =
    components.reduce((sum, comp) => {
      const mode = inputModes[comp.componentProductId] ?? "gram";
      if (mode === "piece" || mode === "carton") return sum; // không tính chiếc/thùng vào gram
      return sum + comp.quantity;
    }, 0) +
    // Công thức gửi đi: nguyên liệu NSX tính theo g/kg cũng trộn vào thành phẩm.
    (activeDraft?.isExternal
      ? activeDraft.nsxLines.reduce((sum, line) => sum + nsxLineGrams(line), 0)
      : 0);
  const productWeightInGrams =
    weight.value * (watchedWeightUnit === "kg" ? 1000 : 1);
  const isWeightMatch =
    productWeightInGrams > 0 &&
    Math.abs(totalComponentGrams - productWeightInGrams) < 0.01;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="product-form bg-white w-full max-w-5xl h-[90vh] flex flex-col">
        <ProductFormHeader
          title={product ? "Sửa Hàng sản xuất" : "Tạo Hàng sản xuất"}
          productType={4}
          code={product?.code}
          name={product?.name}
          onClose={onClose}
        />

        <div className="pf-tabs">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`py-3 px-3 border-b-2 ${
              activeTab === "info"
                ? "border-brand text-brand font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Thông tin
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("description")}
            className={`py-3 px-3 border-b-2 ${
              activeTab === "description"
                ? "border-brand text-brand font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Mô tả
          </button>
          {canEditPublication && (
            <button
              type="button"
              onClick={() => setActiveTab("publication")}
              className={`py-3 px-3 border-b-2 ${
                activeTab === "publication"
                  ? "border-brand text-brand font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              Công bố
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="pf-body flex-1 overflow-y-auto">
          <div className={activeTab === "info" ? "p-6 space-y-5" : "hidden"}>
            <FormSection title="Thông tin chung" collapsible={false}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Mã hàng
                    </label>
                    <input
                      {...register("code")}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Tự động"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Tên hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register("name", { required: true })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Nhập tên hàng"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CategoryDropdown
                    type="parent"
                    label="Loại Hàng"
                    placeholder="Chọn loại hàng"
                    value={watch("parentName")}
                    onChange={(value) => setValue("parentName", value)}
                  />

                  <CategoryDropdown
                    type="middle"
                    label="Nguồn Gốc"
                    placeholder="Chọn nguồn gốc"
                    value={watch("middleName")}
                    onChange={(value) => setValue("middleName", value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CategoryDropdown
                    type="child"
                    label="Danh Mục"
                    placeholder="Chọn danh mục"
                    value={watch("childName")}
                    onChange={(value) => setValue("childName", value)}
                  />

                  <TrademarkDropdown
                    label="Thương hiệu"
                    placeholder="Chọn thương hiệu"
                    value={watch("tradeMarkId")}
                    onChange={(value) => setValue("tradeMarkId", value)}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title={
                <>
                  Hàng thành phần <span className="text-red-500">*</span>
                </>
              }
              collapsible={false}
              headerRight={
                components.length > 0 && (
                  <span className="text-sm text-gray-600">
                    Tổng: {components.length} sản phẩm
                  </span>
                )
              }>
              {/* Công thức: mỗi tab là 1 bộ thành phần riêng */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {formulas.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => switchFormula(f.key)}
                    className={`px-3 py-1.5 rounded-full border text-sm ${
                      f.key === activeFormulaKey
                        ? "border-brand bg-brand-soft text-brand font-medium"
                        : "border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {f.name || "(chưa đặt tên)"}
                    {f.isDefault && (
                      <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-brand text-white">
                        Mặc định
                      </span>
                    )}
                    {f.isExternal && (
                      <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                        Gửi SX
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addFormula(false)}
                  className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                  + Thêm công thức
                </button>
                {components.length > 0 && (
                  <button
                    type="button"
                    onClick={() => addFormula(true)}
                    className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                    Sao chép công thức này
                  </button>
                )}
              </div>
              {(() => {
                const active = formulas.find((f) => f.key === activeFormulaKey);
                if (!active) return null;
                return (
                  <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                    <label className="text-gray-600">Tên công thức</label>
                    <input
                      type="text"
                      value={active.name}
                      onChange={(e) =>
                        renameFormula(active.key, e.target.value)
                      }
                      className="border rounded px-2 py-1 w-56"
                    />
                    <label className="inline-flex items-center gap-1.5 text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active.isExternal}
                        onChange={(e) =>
                          toggleExternal(active.key, e.target.checked)
                        }
                      />
                      Dùng cho gửi đi sản xuất
                    </label>
                    {!active.isDefault && !active.isExternal && (
                      <button
                        type="button"
                        onClick={() => setDefaultFormula(active.key)}
                        className="text-brand hover:underline">
                        Đặt làm mặc định
                      </button>
                    )}
                    {formulas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteFormula(active.key)}
                        className="text-red-500 hover:underline">
                        Xóa công thức
                      </button>
                    )}
                    {canViewCostPrice &&
                      !active.isDefault &&
                      !active.isExternal && (
                        <span className="text-gray-500">
                          Giá vốn theo công thức này:{" "}
                          {calculateFormulaCost({
                            ...active,
                            components,
                            inputModes,
                          }).toLocaleString("vi-VN")}{" "}
                          đ
                        </span>
                      )}
                  </div>
                );
              })()}

              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Thêm hàng thành phần"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSearchResults(false), 200)
                  }
                  className="w-full border rounded px-3 py-2"
                />

                {showSearchResults && searchQuery && searchResults?.data && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto z-10">
                    {searchResults.data.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addComponent(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-sm text-gray-500">{p.code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {components.length > 0 && (
                <div className="border rounded">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Mã hàng
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Tên hàng
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Tồn kho
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Định lượng / 1 {watchedUnit || "sp"}
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium">
                          Giá vốn theo định lượng
                        </th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedComponents.map((comp) => {
                        const inventory =
                          comp.componentProduct?.inventories?.find(
                            (inv) => inv.branchId === selectedBranch?.id
                          );
                        const cost = inventory ? Number(inventory.cost) : 0;
                        const stock = inventory ? Number(inventory.onHand) : 0;
                        const costByQuantity =
                          calculateComponentCostByQuantity(comp);

                        return (
                          <tr
                            key={comp.componentProductId}
                            className="border-t">
                            <td className="px-3 py-2 text-sm">
                              {comp.componentProduct?.code}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              {comp.componentProduct?.name}
                            </td>

                            {/* ← Sửa cell tồn kho: thêm đơn vị */}
                            <td className="px-3 py-2 text-sm">
                              {stock.toLocaleString()}
                              {comp.componentProduct?.unit && (
                                <span className="text-gray-400 ml-1 text-xs">
                                  {comp.componentProduct.unit}
                                </span>
                              )}
                            </td>

                            {/* ← Sửa cell định lượng: thêm nhãn "g" */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={
                                    quantityInputs[comp.componentProductId] !==
                                    undefined
                                      ? quantityInputs[comp.componentProductId]
                                      : comp.quantity.toString()
                                  }
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      comp.componentProductId,
                                      e.target.value
                                    )
                                  }
                                  onBlur={() => {
                                    setQuantityInputs((prev) => {
                                      const currentVal =
                                        prev[comp.componentProductId];
                                      // Chỉ reset nếu field thực sự rỗng (user đã xóa hết)
                                      // prev là state mới nhất, không bị stale closure
                                      if (
                                        currentVal === "" ||
                                        currentVal === undefined
                                      ) {
                                        return {
                                          ...prev,
                                          [comp.componentProductId]: "",
                                        };
                                      }
                                      return prev; // Có giá trị → không reset
                                    });
                                  }}
                                  className="w-20 border rounded px-2 py-1 text-sm"
                                  placeholder="0"
                                />
                                {/* Mode selector (dropdown) — gồm cả "thùng" */}
                                {(() => {
                                  const mode =
                                    inputModes[comp.componentProductId] ??
                                    "gram";
                                  const wg = getWeightInGrams(comp);
                                  const unitLabel =
                                    comp.componentProduct?.unit || "đv";
                                  const productUnit = watchedUnit || "sp";
                                  const pack = getPackSize(comp);
                                  // Công thức cũ đang ở chế độ thùng thì vẫn hiện
                                  // để không mất giá trị đã chọn.
                                  const showCarton =
                                    !isCartonUnit(comp) || mode === "carton";
                                  return (
                                    <select
                                      value={mode}
                                      onChange={(e) =>
                                        switchMode(
                                          comp.componentProductId,
                                          e.target.value as
                                            | "gram"
                                            | "quantity"
                                            | "piece"
                                            | "carton"
                                        )
                                      }
                                      title={`Nhập lượng nguyên liệu dùng cho 1 ${productUnit}, theo đơn vị đã chọn${
                                        showCarton
                                          ? ` (1 thùng = ${pack} ${unitLabel})`
                                          : ""
                                      }`}
                                      className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                                        mode === "carton"
                                          ? "bg-blue-50 text-blue-600 border-blue-300"
                                          : mode === "piece"
                                            ? "bg-orange-50 text-orange-600 border-orange-300"
                                            : mode === "gram"
                                              ? "bg-gray-100 text-gray-600 border-gray-300"
                                              : "bg-brand-soft text-brand border-brand"
                                      }`}>
                                      {wg > 0 ? (
                                        <>
                                          <option value="gram">g</option>
                                          <option value="quantity">
                                            {unitLabel}
                                          </option>
                                        </>
                                      ) : (
                                        <option value="piece">
                                          {unitLabel}
                                        </option>
                                      )}
                                      {showCarton && (
                                        <option value="carton">
                                          {pack !== 1
                                            ? `Thùng (${pack} ${unitLabel})`
                                            : "Thùng"}
                                        </option>
                                      )}
                                    </select>
                                  );
                                })()}
                              </div>
                              {/* Câu giải thích: con số đang nhập nghĩa là gì */}
                              {(() => {
                                const wg = getWeightInGrams(comp);
                                const mode =
                                  inputModes[comp.componentProductId] ?? "gram";
                                const unitLabel =
                                  comp.componentProduct?.unit || "đv";
                                const units = getUnitsPerProduct(comp, mode);
                                const fmt = (v: number, digits = 3) =>
                                  v.toLocaleString("vi-VN", {
                                    maximumFractionDigits: digits,
                                  });
                                if (mode === "carton") {
                                  const cartons = units / getPackSize(comp);
                                  return (
                                    <div className="text-xs text-blue-500 mt-0.5">
                                      {fmt(cartons, 4)} thùng = {fmt(units, 4)}{" "}
                                      {unitLabel}
                                    </div>
                                  );
                                }
                                // Nhập theo đơn vị tính, không có gì để quy đổi.
                                if (mode === "piece" || wg === 0) return null;
                                return (
                                  <div className="text-xs text-gray-400 mt-0.5">
                                    {mode === "gram"
                                      ? `${fmt(comp.quantity, 1)} g = ${fmt(units, 4)} ${unitLabel}`
                                      : `${fmt(units, 4)} ${unitLabel} = ${fmt(comp.quantity, 1)} g`}
                                  </div>
                                );
                              })()}
                            </td>

                            <td className="px-3 py-2 text-sm">
                              {costByQuantity.toLocaleString()} đ
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  removeComponent(comp.componentProductId)
                                }
                                className="text-red-500 hover:text-red-700">
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* ← Thêm footer row tổng gram */}
                      {components.length > 0 && (
                        <tr className="border-t bg-gray-50">
                          <td
                            colSpan={3}
                            className="px-3 py-2 text-sm text-right text-gray-600 font-medium">
                            Tổng gram / {watchedUnit || "sp"}:
                          </td>
                          <td className="px-3 py-2 text-sm font-medium">
                            <span
                              className={
                                productWeightInGrams === 0
                                  ? "text-gray-700"
                                  : isWeightMatch
                                    ? "text-green-600"
                                    : "text-red-500"
                              }>
                              {totalComponentGrams.toLocaleString()} g
                              {productWeightInGrams > 0 && (
                                <span className="ml-2 text-xs font-normal">
                                  {isWeightMatch
                                    ? "✓ khớp trọng lượng"
                                    : `(cần ${productWeightInGrams.toLocaleString()} g)`}
                                </span>
                              )}
                            </span>
                          </td>
                          <td colSpan={2} />
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        className="px-3 py-1 border rounded disabled:opacity-50">
                        Trước
                      </button>
                      <span className="text-sm">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        className="px-3 py-1 border rounded disabled:opacity-50">
                        Sau
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const active = formulas.find((f) => f.key === activeFormulaKey);
                if (!active?.isExternal) return null;
                const outputUnit = watchedUnit || "sp";
                const ownCost = calculateFormulaCost({
                  ...active,
                  components,
                  inputModes,
                });
                const nsxCost = nsxCostPerUnit(active);
                const sym = currencySymbol(active.currency);
                return (
                  <div className="mt-5 space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <span className="block text-xs font-medium text-gray-600 mb-1">
                          Tiền tệ giá NSX
                        </span>
                        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                          {(["VND", "CNY"] as const).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() =>
                                updateFormula(active.key, { currency: c })
                              }
                              className={`px-3 py-1.5 rounded-md text-sm ${
                                active.currency === c
                                  ? "bg-brand text-white"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <label className="block">
                        <span className="block text-xs font-medium text-gray-600 mb-1">
                          Phí gia công / 1 {outputUnit} ({sym})
                        </span>
                        <NumericInput
                          className="w-44 rounded-lg border border-gray-200 bg-white px-3 py-2 text-right text-sm outline-none focus:border-brand"
                          value={active.processingFeePerUnit}
                          maxFractionDigits={6}
                          formatWhileTyping
                          onValueChange={(fee) =>
                            updateFormula(active.key, {
                              processingFeePerUnit: fee,
                            })
                          }
                        />
                      </label>
                      <p className="text-xs text-gray-500 pb-2">
                        Công thức này chỉ dùng khi tạo phiếu gửi đi sản xuất;
                        không dùng cho sản xuất nội bộ.
                      </p>
                    </div>
                    <ManufacturerMaterialsEditor
                      variant="formula"
                      value={active.nsxLines}
                      currency={active.currency}
                      outputUnit={outputUnit}
                      onChange={(nsxLines) =>
                        updateFormula(active.key, { nsxLines })
                      }
                    />
                    <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm text-gray-600">
                      {canViewCostPrice && (
                        <span>
                          Hàng mình / 1 {outputUnit}:{" "}
                          <b className="text-gray-800">
                            {ownCost.toLocaleString("vi-VN", {
                              maximumFractionDigits: 2,
                            })}{" "}
                            đ
                          </b>
                        </span>
                      )}
                      <span>
                        Nguyên liệu NSX / 1 {outputUnit}:{" "}
                        <b className="text-gray-800">
                          {nsxCost.toLocaleString("vi-VN", {
                            maximumFractionDigits: 4,
                          })}{" "}
                          {sym}
                        </b>
                      </span>
                      <span>
                        Phí gia công / 1 {outputUnit}:{" "}
                        <b className="text-gray-800">
                          {active.processingFeePerUnit.toLocaleString("vi-VN", {
                            maximumFractionDigits: 6,
                          })}{" "}
                          {sym}
                        </b>
                      </span>
                    </div>
                  </div>
                );
              })()}
              {formulas.length > 0 && formulas.every((f) => f.isExternal) && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  Sản phẩm chỉ có công thức gửi đi sản xuất: không sản xuất nội
                  bộ được và giá vốn không tự tính theo công thức.
                </p>
              )}
            </FormSection>

            {(canViewCostPrice || canViewSalePrice) && (
              <FormSection title="Giá vốn, giá bán">
                <div className="grid grid-cols-2 gap-4">
                  {canViewCostPrice && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Giá vốn
                      </label>
                      <span className="pf-suffix" data-suffix="đ">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={purchasePrice.displayValue}
                          onChange={(e) => {
                            costManuallyEdited.current = true;
                            purchasePrice.handleChange(e);
                          }}
                          onBlur={purchasePrice.handleBlur}
                          className="w-full border rounded px-3 py-2"
                          placeholder="0"
                        />
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {(() => {
                          const autoCost = calculateTotalPurchasePrice();
                          return autoCost == null
                            ? "Chưa có công thức nội bộ mặc định — giá vốn không tự tính"
                            : `Tự động tính (công thức mặc định): ${autoCost.toLocaleString("vi-VN")} đ`;
                        })()}
                      </p>
                    </div>
                  )}
                  {canViewSalePrice && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Giá bán
                      </label>
                      <span className="pf-suffix" data-suffix="đ">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatNumberInput(basePrice.displayValue)}
                          onChange={basePrice.handleChange}
                          onBlur={basePrice.handleBlur}
                          className="w-full border rounded px-3 py-2"
                          placeholder="0"
                        />
                      </span>
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            <FormSection title="Tồn kho">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tồn kho
                  </label>
                  <input
                    type="text"
                    value={stockQuantity.displayValue}
                    onChange={stockQuantity.handleChange}
                    onBlur={stockQuantity.handleBlur}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định mức tồn thấp nhất
                  </label>
                  <input
                    type="text"
                    value={minStockAlert.displayValue}
                    onChange={minStockAlert.handleChange}
                    onBlur={minStockAlert.handleBlur}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định mức tồn cao nhất
                  </label>
                  <input
                    type="text"
                    value={maxStockAlert.displayValue}
                    onChange={maxStockAlert.handleChange}
                    onBlur={maxStockAlert.handleBlur}
                    className="w-full border rounded px-3 py-2"
                    placeholder="0"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Vị trí, trọng lượng">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Khối lượng tịnh
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={weight.displayValue}
                      onChange={weight.handleChange}
                      onBlur={weight.handleBlur}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="0"
                    />
                    <select
                      {...register("weightUnit")}
                      className="border rounded px-3 py-2 w-24">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Trọng lượng vận chuyển
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shippingWeight.displayValue}
                      onChange={shippingWeight.handleChange}
                      onBlur={shippingWeight.handleBlur}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="0"
                    />
                    <select
                      {...register("shippingWeightUnit")}
                      className="border rounded px-3 py-2 w-24">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Đơn vị tính
                  </label>
                  <UnitSelect
                    value={watch("unit")}
                    onChange={(name) =>
                      setValue("unit", name, { shouldDirty: true })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Định lượng đóng gói
                  </label>
                  <input
                    {...register("conversionValue", { valueAsNumber: true })}
                    type="number"
                    min={1}
                    step={1}
                    className="w-full border rounded px-3 py-2"
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ví dụ: 12 nghĩa là 1 thùng gồm 12 đơn vị sản phẩm.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    VAT (%)
                  </label>
                  <span className="pf-suffix" data-suffix="%">
                    <input
                      {...register("vat", { valueAsNumber: true })}
                      type="number"
                      step="any"
                      min={0}
                      className="w-full border rounded px-3 py-2"
                      placeholder="8"
                    />
                  </span>
                </div>

                {canLinkMisa && (
                  <div>
                    <MisaItemDropdown
                      label="Liên kết Misa"
                      placeholder="Chọn vật tư hàng hóa Misa"
                      value={misaMapping.code || undefined}
                      valueName={misaMapping.name || undefined}
                      onChange={(item: MisaInventoryItem | null) =>
                        setMisaMapping({
                          code: item?.code || "",
                          name: item?.name || "",
                          unit: item?.unitName || "",
                        })
                      }
                    />
                    {misaMapping.code ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Đã liên kết: {misaMapping.code}
                        {misaMapping.name ? ` - ${misaMapping.name}` : ""}
                        {misaMapping.unit ? ` (${misaMapping.unit})` : ""}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </FormSection>

            <FormSection title="Hình ảnh">
              <ProductImageGallery images={images} onChange={setImages} />
            </FormSection>
          </div>

          {/* Tab Mô tả */}
          <div
            className={
              activeTab === "description" ? "p-6 space-y-5" : "hidden"
            }>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                {...register("description")}
                maxLength={1000}
                className="w-full border rounded px-3 py-2 h-40 bg-white"
                placeholder="Nhập mô tả sản phẩm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú đơn hàng
              </label>
              <textarea
                {...register("orderTemplate")}
                maxLength={1000}
                className="w-full border rounded px-3 py-2 h-40 bg-white"
                placeholder="Nhập ghi chú đơn hàng"
              />
            </div>
          </div>

          {/* Tab Công bố */}
          <div
            className={
              canEditPublication && activeTab === "publication"
                ? "p-6 space-y-5"
                : "hidden"
            }>
            <PublicationSection pub={pub} />
          </div>

          <div className="pf-footer sticky bottom-0">
            {/* Bán trực tiếp: luôn thấy ở footer */}
            <label className="pf-direct-sale">
              <input {...register("isDirectSale")} type="checkbox" />
              Bán trực tiếp
            </label>
            <div className="pf-footer-actions">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-50"
                disabled={isSubmitting}>
                Bỏ qua
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50">
                {isSubmitting ? "Đang lưu..." : product ? "Lưu" : "Tạo mới"}
              </button>
            </div>
          </div>
        </form>
      </div>
      {showCostConfirmation && (
        <CostConfirmationModal
          onConfirm={handleCostConfirm}
          onCancel={() => {
            setShowCostConfirmation(false);
            setPendingFormData(null);
            setIsSubmitting(false);
          }}
        />
      )}
    </div>
  );
}
