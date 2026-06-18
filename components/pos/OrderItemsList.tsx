"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Copy,
  Gift,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { CartItem } from "@/app/(dashboard)/ban-hang/page";
import { NoteTemplate } from "@/lib/api/note-templates";
import {
  useNoteTemplates,
  useCreateNoteTemplate,
  useUpdateNoteTemplate,
  useDeleteNoteTemplate,
} from "@/lib/hooks/useNoteTemplates";
import { NoteDropdown } from "./NoteDropdown";
import { NoteTemplateModal } from "./NoteTemplateModal";
import { ItemDiscountModal } from "./ItemDiscountModal";
import { ProductPriceHistory } from "./ProductPriceHistory";
import { PriceMismatchNote } from "./PriceMismatchNote";
import { CodeLink } from "../shared/CodeLink";
import type { PriceWarning } from "@/lib/utils/price-warning";
import { useBranchStore } from "@/lib/store/branch";
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";
import { ProductInventoryModal } from "./ProductInventoryModal";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ProductInventoryMobileSheet } from "./ProductInventoryMobileSheet";
import {
  getItemOnHand as getItemOnHandHelper,
  getStockWarning as getStockWarningHelper,
} from "@/lib/utils/inventory";

interface CartItemsListProps {
  cartItems: CartItem[];
  onUpdateItem: (rowId: string, updates: Partial<CartItem>) => void;
  onRemoveItem: (rowId: string) => void;
  discount: number;
  onDuplicateItem: (item: CartItem) => void;
  onDiscountChange: (discount: number) => void;
  discountRatio: number;
  onDiscountRatioChange: (ratio: number) => void;
  orderNote: string;
  onOrderNoteChange: (note: string) => void;
  selectedCustomerId?: number;
  canEditPrice?: boolean;
  canEditDiscount?: boolean;
  canViewInventory?: boolean;
  priceWarnings?: Record<string, PriceWarning | null>;
  documentType?: "order" | "invoice" | "consignment";
  className?: string;
}

export function OrderItemsList({
  cartItems,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  discount,
  onDiscountChange,
  discountRatio,
  onDiscountRatioChange,
  orderNote,
  onOrderNoteChange,
  selectedCustomerId,
  canEditPrice = true,
  canEditDiscount = true,
  canViewInventory = true,
  priceWarnings,
  documentType,
  className,
}: CartItemsListProps) {
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [quantityDisplays, setQuantityDisplays] = useState<
    Record<string, string>
  >({});
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [discountType, setDiscountType] = useState<"amount" | "ratio">(
    "amount"
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [displayValue, setDisplayValue] = useState("");
  const { data: noteTemplates = [] } = useNoteTemplates();
  const createNoteTemplate = useCreateNoteTemplate();
  const updateNoteTemplate = useUpdateNoteTemplate();
  const deleteNoteTemplate = useDeleteNoteTemplate();
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] =
    useState<CartItem | null>(null);
  const [selectedItemForInventory, setSelectedItemForInventory] =
    useState<CartItem | null>(null);
  const { selectedBranch } = useBranchStore();

  const [openNsxRowId, setOpenNsxRowId] = useState<string | null>(null);
  const nsxPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openNsxRowId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        nsxPickerRef.current &&
        !nsxPickerRef.current.contains(e.target as Node)
      ) {
        setOpenNsxRowId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openNsxRowId]);

  const isMobile = useIsMobile();

  const getItemOnHand = (item: CartItem): number | null =>
    getItemOnHandHelper(item, selectedBranch?.id);

  const getStockWarning = (item: CartItem): string | null =>
    getStockWarningHelper(item, selectedBranch?.id);

  const getCartItemKey = (item: CartItem): string => item.rowId;

  const getQuantityDisplay = (item: CartItem): string => {
    return quantityDisplays[getCartItemKey(item)] ?? String(item.quantity);
  };

  const handleQuantityChange = (item: CartItem, value: string) => {
    const key = getCartItemKey(item);
    const onlyNumbers = value.replace(/[^\d]/g, "");
    setQuantityDisplays((prev) => ({ ...prev, [key]: onlyNumbers }));
    if (onlyNumbers !== "" && onlyNumbers !== "0") {
      const parsed = parseInt(onlyNumbers, 10);
      onUpdateItem(item.rowId, { quantity: parsed });
    }
  };

  const handleQuantityBlur = (item: CartItem) => {
    const key = getCartItemKey(item);
    const display = quantityDisplays[key];
    if (display === undefined) return;
    const parsed = parseInt(display, 10);
    const validQty =
      !display || isNaN(parsed) || parsed < 1
        ? item.quantity
        : Math.max(1, parsed);
    onUpdateItem(item.rowId, { quantity: validQty });
    setQuantityDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearQuantityDisplay = (item: CartItem) => {
    const key = getCartItemKey(item);
    setQuantityDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getPriceInputValue = (item: CartItem): string => {
    const key = getCartItemKey(item);
    // Đang edit → trả raw digits; không edit → format đẹp
    return priceInputs[key] ?? formatCurrency(item.price - item.discount);
  };

  const handlePriceChange = (item: CartItem, value: string) => {
    const key = getCartItemKey(item);
    setPriceInputs((prev) => ({ ...prev, [key]: formatNumberInput(value) }));
  };

  const handlePriceBlur = (item: CartItem) => {
    const key = getCartItemKey(item);
    const raw = priceInputs[key];

    setPriceInputs((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (raw === undefined) return;
    const newEffective = parseNumberInput(raw); // dùng utils
    if (newEffective <= 0) return;

    if (newEffective < item.price) {
      onUpdateItem(item.rowId, { discount: item.price - newEffective });
    } else {
      onUpdateItem(item.rowId, { price: newEffective, discount: 0 });
    }
  };

  const handleOpenDiscountModal = (item: CartItem) => {
    setSelectedItemForDiscount(item);
    setShowDiscountModal(true);
  };

  const handleSaveItemDiscount = (discount: number) => {
    if (selectedItemForDiscount) {
      onUpdateItem(selectedItemForDiscount.rowId, { discount });
    }
  };

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteModalMode, setNoteModalMode] = useState<"create" | "edit">(
    "create"
  );
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(
    null
  );

  const handleCreateTemplate = () => {
    setNoteModalMode("create");
    setEditingTemplate(null);
    setShowNoteModal(true);
  };

  const handleEditTemplate = (template: NoteTemplate) => {
    setNoteModalMode("edit");
    setEditingTemplate(template);
    setShowNoteModal(true);
  };

  const handleSaveTemplate = (content: string) => {
    if (noteModalMode === "create") {
      createNoteTemplate.mutate({ content });
    } else if (editingTemplate) {
      updateNoteTemplate.mutate({ id: editingTemplate.id, data: { content } });
    }
  };

  const handleDeleteTemplate = () => {
    if (editingTemplate) {
      deleteNoteTemplate.mutate(editingTemplate.id);
    }
  };

  // Ghi nhớ cặp giá trị ta vừa đẩy lên parent để tránh effect hydrate ghi đè khi đang gõ.
  const lastPushedRef = useRef<{ discount: number; ratio: number } | null>(
    null
  );

  const roundRatio = (ratio: number): number =>
    Math.round((ratio + Number.EPSILON) * 100) / 100;

  const approxEq = (a: number, b: number): boolean => Math.abs(a - b) < 0.01;

  const formatNumber = (value: number): string => {
    if (!value) return "";
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  };

  // Hiển thị % theo đúng những gì lưu (cho phép thập phân, vd 8.33)
  const formatRatio = (value: number): string => {
    if (!value) return "";
    return String(value);
  };

  // Đẩy đồng thời cả số tiền và % lên parent để lưu cùng lúc.
  const pushDiscount = (discountAmt: number, ratioPct: number) => {
    lastPushedRef.current = { discount: discountAmt, ratio: ratioPct };
    onDiscountChange(discountAmt);
    onDiscountRatioChange(ratioPct);
  };

  // Hydrate state từ parent (load đơn/hóa đơn, đổi tab, copy...).
  // Ưu tiên hiển thị mode % nếu có discountRatio. Bỏ qua nếu props chính là
  // giá trị ta vừa đẩy lên (tránh nhảy mode khi đang gõ).
  useEffect(() => {
    if (
      lastPushedRef.current &&
      lastPushedRef.current.discount === discount &&
      lastPushedRef.current.ratio === discountRatio
    ) {
      return;
    }
    lastPushedRef.current = { discount, ratio: discountRatio };
    if (discountRatio > 0) {
      setDiscountType("ratio");
      setDiscountValue(discountRatio);
      setDisplayValue(formatRatio(discountRatio));
    } else if (discount > 0) {
      setDiscountType("amount");
      setDiscountValue(discount);
      setDisplayValue(formatNumber(discount));
    } else {
      setDiscountType("amount");
      setDiscountValue(0);
      setDisplayValue("");
    }
  }, [discount, discountRatio]);

  // Giữ 2 field đồng bộ với tổng tiền hàng khi giỏ thay đổi.
  // amount mode: số tiền cố định → tính lại %. ratio mode: % cố định → tính lại số tiền.
  useEffect(() => {
    if (discountValue <= 0) return;
    const subtotal = calculateSubtotal();
    if (discountType === "ratio") {
      const amount = (subtotal * discountValue) / 100;
      if (!approxEq(amount, discount)) pushDiscount(amount, discountValue);
    } else {
      const ratio =
        subtotal > 0 ? roundRatio((discountValue / subtotal) * 100) : 0;
      if (!approxEq(ratio, discountRatio)) pushDiscount(discountValue, ratio);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subtotal = calculateSubtotal();

    if (discountType === "amount") {
      const onlyNumbers = e.target.value.replace(/[^\d]/g, "");
      if (onlyNumbers === "") {
        setDisplayValue("");
        setDiscountValue(0);
        pushDiscount(0, 0);
        return;
      }
      const amount = parseInt(onlyNumbers, 10);
      setDiscountValue(amount);
      setDisplayValue(formatNumber(amount));
      const ratio = subtotal > 0 ? roundRatio((amount / subtotal) * 100) : 0;
      pushDiscount(amount, ratio);
    } else {
      // % cho phép thập phân (vd 8.33)
      let cleaned = e.target.value.replace(/[^\d.]/g, "");
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned =
          cleaned.slice(0, firstDot + 1) +
          cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
      if (cleaned === "" || cleaned === ".") {
        setDisplayValue(cleaned);
        setDiscountValue(0);
        pushDiscount(0, 0);
        return;
      }
      let ratio = parseFloat(cleaned);
      if (ratio > 100) {
        ratio = 100;
        cleaned = "100";
      }
      setDiscountValue(ratio);
      setDisplayValue(cleaned);
      const amount = (subtotal * ratio) / 100;
      pushDiscount(amount, ratio);
    }
  };

  const handleInputBlur = () => {
    if (discountValue === 0) {
      setDisplayValue("");
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + (item.price - item.discount) * item.quantity,
      0
    );
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === "ratio") {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount();
  };

  // Đổi mode: GIỮ giá trị giảm và convert sang đơn vị tương ứng (không reset).
  const handleDiscountTypeChange = (type: "amount" | "ratio") => {
    if (type === discountType) return;
    const subtotal = calculateSubtotal();
    setDiscountType(type);

    if (discountValue <= 0) {
      setDisplayValue("");
      pushDiscount(0, 0);
      return;
    }

    if (type === "ratio") {
      // đang là số tiền → quy ra %
      const ratio =
        subtotal > 0 ? roundRatio((discountValue / subtotal) * 100) : 0;
      setDiscountValue(ratio);
      setDisplayValue(formatRatio(ratio));
      pushDiscount(discountValue, ratio);
    } else {
      // đang là % → quy ra số tiền
      const amount = (subtotal * discountValue) / 100;
      setDiscountValue(amount);
      setDisplayValue(formatNumber(amount));
      pushDiscount(amount, discountValue);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div
        className={`${
          className ?? "w-[60%] bg-white flex flex-col"
        } items-center justify-center`}>
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-base">Chưa có sản phẩm trong giỏ hàng</p>
          <p className="text-sm mt-1">Tìm kiếm và thêm sản phẩm để bắt đầu</p>
        </div>
      </div>
    );
  }

  const getConditionLabel = (conditionType?: string) => {
    switch (conditionType) {
      case "damaged":
        return {
          text: "Bục rách",
          className: "bg-red-50 text-red-600 border-red-200",
        };
      case "near_expiry":
        return {
          text: "Cận date",
          className: "bg-amber-50 text-amber-600 border-amber-200",
        };
      default:
        return null;
    }
  };

  // Nhóm items: cùng productId sẽ không có gap
  const isFirstOfGroup = (index: number) => {
    if (index === 0) return true;
    return cartItems[index].product.id !== cartItems[index - 1].product.id;
  };

  const isLastOfGroup = (index: number) => {
    if (index === cartItems.length - 1) return true;
    return cartItems[index].product.id !== cartItems[index + 1].product.id;
  };

  return (
    <div className={className ?? "w-[60%] bg-white flex flex-col"}>
      <div className="flex-1 p-3 overflow-y-auto">
        <div>
          {cartItems.map((item, index) => (
            <div
              key={`${item.product.id}_${item.conditionType || "normal"}_${index}`}
              className={`border p-2 lg:p-3 hover:shadow-md transition-shadow ${
                isFirstOfGroup(index) ? "rounded-t-lg mt-2" : "border-t-0"
              } ${isLastOfGroup(index) ? "rounded-b-lg" : ""} ${
                isFirstOfGroup(index) && index === 0 ? "mt-0" : ""
              } ${getStockWarning(item) ? "border-red-400 bg-red-50/30" : ""}`}
              onMouseEnter={() => setHoveredItemId(item.product.id)}
              onMouseLeave={() => setHoveredItemId(null)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1.5 lg:gap-2 mb-0.5 lg:mb-1">
                    <span className="hidden lg:inline text-sm lg:text-base font-medium text-gray-600">
                      {item.product.code}
                    </span>
                    <span className="text-sm lg:text-md font-semibold text-gray-900">
                      {item.product.name}
                    </span>
                    {(() => {
                      const label = getConditionLabel(item.conditionType);
                      if (!label) return null;
                      return (
                        <span
                          className={`px-1.5 py-0.5 text-xs rounded-full border ${label.className}`}>
                          {label.text}
                        </span>
                      );
                    })()}
                    {item.isPromoGift && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full border border-pink-300 bg-pink-50 text-pink-700 font-medium">
                        KM
                      </span>
                    )}
                    {/* Dòng X: badge mã KM đang áp (opt-in) → link chi tiết KM */}
                    {!item.isPromoGift &&
                      item.eligiblePromos
                        ?.filter(
                          (p) =>
                            (item.promoEnabledIds || []).includes(
                              p.promotionId
                            ) && p.code
                        )
                        .map((p) => (
                          <CodeLink
                            key={p.promotionId}
                            entity="promotion"
                            code={p.code}
                            label={p.code}
                            className="px-1.5 py-0.5 text-xs rounded-full border border-pink-300 bg-pink-50 text-pink-700 font-medium hover:bg-pink-100"
                          />
                        ))}
                  </div>
                  {item.isPromoGift && item.promotionName && (
                    <div className="text-xs text-blue-600 font-medium">
                      🎁 {item.promotionName}
                    </div>
                  )}
                  {item.isPromoGift &&
                    item.rewardOptions &&
                    item.rewardOptions.length > 1 && (
                      <select
                        className="mt-1 w-full max-w-xs rounded border border-gray-300 px-2 py-1 text-xs"
                        value={item.product?.id || ""}
                        onChange={(e) => {
                          const opt = item.rewardOptions!.find(
                            (o) => o.productId === Number(e.target.value)
                          );
                          if (opt) {
                            onUpdateItem(item.rowId, {
                              product: {
                                id: opt.productId,
                                name: opt.productName,
                                code: opt.productCode || "",
                                basePrice: 0,
                              },
                              requiresChoice: false,
                            });
                          }
                        }}>
                        <option value="">-- Chọn quà tặng --</option>
                        {item.rewardOptions.map((o) => (
                          <option key={o.productId} value={o.productId}>
                            {o.productName || `SP#${o.productId}`} (tồn{" "}
                            {o.availableStock})
                          </option>
                        ))}
                      </select>
                    )}

                  {canViewInventory &&
                    (() => {
                      const warning = getStockWarning(item);
                      if (!warning) return null;
                      return (
                        <div className="text-xs text-red-600 font-medium mt-0.5">
                          ⚠ {warning}
                        </div>
                      );
                    })()}

                  <NoteDropdown
                    value={item.note || ""}
                    onChange={(note) => onUpdateItem(item.rowId, { note })}
                    templates={noteTemplates}
                    onCreateTemplate={handleCreateTemplate}
                    onEditTemplate={handleEditTemplate}
                  />

                  {documentType === "consignment" && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-gray-500">NSX</span>
                      <div
                        className="relative"
                        ref={
                          openNsxRowId === item.rowId ? nsxPickerRef : undefined
                        }>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenNsxRowId((prev) =>
                              prev === item.rowId ? null : item.rowId
                            )
                          }
                          className="border rounded-lg px-2 py-1 text-xs flex items-center gap-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span
                            className={
                              item.manufactureDate
                                ? "text-gray-900"
                                : "text-gray-400"
                            }>
                            {item.manufactureDate
                              ? item.manufactureDate
                                  .split("-")
                                  .reverse()
                                  .join("/")
                              : "Chọn ngày"}
                          </span>
                        </button>
                        {openNsxRowId === item.rowId && (
                          <div className="absolute z-50 left-0 top-full w-72">
                            <MiniCalendar
                              value={item.manufactureDate || ""}
                              onChange={(d) =>
                                onUpdateItem(item.rowId, {
                                  manufactureDate: d || undefined,
                                })
                              }
                              onClose={() => setOpenNsxRowId(null)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                  {item.isPromoGift ? null : (
                    <>
                      {canViewInventory && (
                        <button
                          onClick={() => setSelectedItemForInventory(item)}
                          className="p-1 hover:bg-brand-soft rounded transition-colors"
                          title="Xem tồn kho tất cả chi nhánh">
                          <AlertCircle className="w-4 h-4 text-brand" />
                        </button>
                      )}
                      {canEditPrice && (
                        <ProductPriceHistory
                          customerId={selectedCustomerId}
                          productId={item.product.id}
                          documentType="invoice"
                          branchId={selectedBranch?.id}
                        />
                      )}
                      <button
                        onClick={() => onDuplicateItem(item)}
                        className="p-1 hover:bg-green-50 rounded transition-colors"
                        title="Thêm dòng mới cho sản phẩm này">
                        <Copy className="w-4 h-4 text-green-600" />
                      </button>
                      {item.eligiblePromos && item.eligiblePromos.length > 0 && (
                        (() => {
                          const enabled = item.promoEnabledIds || [];
                          const applied = item.eligiblePromos.some(
                            (p) => enabled.includes(p.promotionId)
                          );
                          const colorCls = applied
                            ? "text-pink-600 group-hover:text-gray-400"
                            : "text-gray-400 group-hover:text-pink-600";
                          return (
                            <button
                              onClick={() => {
                                onUpdateItem(item.rowId, {
                                  promoEnabledIds: applied
                                    ? []
                                    : item.eligiblePromos!.map(
                                        (p) => p.promotionId
                                      ),
                                });
                              }}
                              className={`group flex items-center gap-1 px-1.5 py-1 rounded transition-colors ${
                                applied
                                  ? "bg-pink-100 hover:bg-gray-100"
                                  : "bg-gray-100 hover:bg-pink-100"
                              }`}
                              title={
                                applied
                                  ? "Bỏ áp dụng khuyến mãi cho dòng này"
                                  : "Đủ điều kiện khuyến mãi — bấm để tặng quà"
                              }>
                              <Gift className={`w-4 h-4 ${colorCls}`} />
                              <span className={`text-xs font-medium ${colorCls}`}>
                                Khuyến Mãi
                              </span>
                            </button>
                          );
                        })()
                      )}
                      <button
                        onClick={() => onRemoveItem(item.rowId)}
                        className="p-1 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── MOBILE LAYOUT ── lg:hidden ───────────────── */}
              <div className="lg:hidden mt-1.5 space-y-1.5">
                {/* Row 1: Quantity controls + Thành tiền */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onUpdateItem(item.rowId, {
                          quantity: Math.max(1, item.quantity - 1),
                        });
                        clearQuantityDisplay(item);
                      }}
                      className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="text"
                      value={getQuantityDisplay(item)}
                      onChange={(e) =>
                        handleQuantityChange(item, e.target.value)
                      }
                      onBlur={() => handleQuantityBlur(item)}
                      className="w-9 h-5 text-center border border-gray-300 rounded px-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                      min="1"
                    />
                    <button
                      onClick={() => {
                        onUpdateItem(item.rowId, {
                          quantity: item.quantity + 1,
                        });
                        clearQuantityDisplay(item);
                      }}
                      className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {(
                      (item.price - item.discount) *
                      item.quantity
                    ).toLocaleString()}
                  </span>
                </div>

                {/* Row 2: Đơn giá + Chiết khấu + Giảm giá */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Đơn giá:</span>
                  {canEditPrice ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      value={getPriceInputValue(item)}
                      onChange={(e) => handlePriceChange(item, e.target.value)}
                      onBlur={() => handlePriceBlur(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="w-20 h-6 text-right border border-gray-300 rounded px-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  ) : (
                    <span className="text-xs text-gray-700">
                      {item.price.toLocaleString()}
                    </span>
                  )}
                  {item.discount > 0 && (
                    <span className="text-xs text-red-500">
                      -{item.discount.toLocaleString()}
                    </span>
                  )}
                  {canEditDiscount && (
                    <button
                      onClick={() => handleOpenDiscountModal(item)}
                      className="ml-auto text-xs text-brand font-medium">
                      Giảm giá
                    </button>
                  )}
                </div>

                {/* Cảnh báo lệch giá so với giá bán gần nhất */}
                <PriceMismatchNote warning={priceWarnings?.[item.rowId]} />
              </div>

              {/* ── DESKTOP LAYOUT ── hidden lg:flex ──────────── */}
              <div className="hidden lg:flex flex-wrap items-center mt-2 gap-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onUpdateItem(item.rowId, {
                        quantity: Math.max(1, item.quantity - 1),
                      });
                      clearQuantityDisplay(item);
                    }}
                    className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    value={getQuantityDisplay(item)}
                    onChange={(e) => handleQuantityChange(item, e.target.value)}
                    onBlur={() => handleQuantityBlur(item)}
                    className="w-14 h-9 text-center border border-gray-300 rounded px-2 py-1 text-md focus:outline-none focus:ring-2 focus:ring-brand"
                    min="1"
                  />
                  <button
                    onClick={() => {
                      onUpdateItem(item.rowId, {
                        quantity: Math.max(1, item.quantity + 1),
                      });
                      clearQuantityDisplay(item);
                    }}
                    className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-end gap-3 ml-auto">
                  <div className="flex flex-col items-end min-w-[60px]">
                    <span className="mb-0.5"></span>
                    <button
                      onClick={() => handleOpenDiscountModal(item)}
                      className="text-brand hover:text-brand-dark text-md font-medium">
                      Giảm giá
                    </button>
                  </div>
                  <div className="flex flex-col items-end min-w-[60px]">
                    <span className="text-xs lg:text-md text-gray-400 mb-0.5">
                      Chiết khấu
                    </span>
                    <span
                      className={`text-md ${canEditDiscount ? "cursor-pointer hover:text-brand" : ""} ${item.discount > 0 ? "text-red-500" : "text-gray-400"}`}
                      onClick={
                        canEditDiscount
                          ? () => handleOpenDiscountModal(item)
                          : undefined
                      }>
                      {item.discount > 0
                        ? `-${item.discount.toLocaleString()}`
                        : "0"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end min-w-[60px]">
                    <span className="text-xs lg:text-md text-gray-400 mb-0.5">
                      Đơn giá
                    </span>
                    {canEditPrice ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={getPriceInputValue(item)}
                        onChange={(e) =>
                          handlePriceChange(item, e.target.value)
                        }
                        onBlur={() => handlePriceBlur(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        className="w-24 h-6 text-right border border-gray-300 rounded px-2 text-md focus:outline-none focus:ring-2 focus:ring-brand text-gray-700"
                      />
                    ) : (
                      <span className="text-md text-gray-500">
                        {(item.price - item.discount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end min-w-[60px]">
                    <span className="text-xs lg:text-md text-gray-400 mb-0.5">
                      Thành tiền
                    </span>
                    <span className="text-md font-medium">
                      {(
                        (item.price - item.discount) *
                        item.quantity
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Cảnh báo lệch giá so với giá bán gần nhất */}
                {priceWarnings?.[item.rowId] && (
                  <div className="w-full flex justify-end">
                    <PriceMismatchNote warning={priceWarnings[item.rowId]} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="m-2 lg:m-3 border p-2 lg:p-3 flex-shrink-0 space-y-2 lg:space-y-2.5 rounded-xl shadow-xl">
        <div>
          <label className="block text-sm lg:text-md text-gray-600 mb-0.5 lg:mb-1">
            Ghi chú đơn hàng
          </label>
          <textarea
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value.slice(0, 1000))}
            maxLength={1000}
            placeholder="Nhập ghi chú cho đơn hàng..."
            className="w-full border rounded-xl px-3 py-1.5 lg:py-2 text-sm lg:text-md focus:outline-none focus:ring-2 focus:ring-brand resize-none"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm lg:text-md">
            Tổng tiền hàng
          </span>
          <span className="font-semibold text-sm lg:text-md">
            {calculateSubtotal().toLocaleString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm lg:text-md">Giảm giá</span>
            <span className="text-sm lg:text-md font-medium text-red-600 min-w-[100px] text-right">
              - {calculateDiscountAmount().toLocaleString()}
              {(() => {
                const subtotal = calculateSubtotal();
                const amount = calculateDiscountAmount();
                if (amount <= 0 || subtotal <= 0) return null;
                const pct = roundRatio((amount / subtotal) * 100);
                return ` (${pct}%)`;
              })()}
            </span>
          </div>
          {canEditDiscount ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder={
                  discountType === "amount" ? "Nhập số tiền" : "Nhập %"
                }
                className="flex-1 min-w-0 text-center border rounded-xl px-2 lg:px-3 py-1 lg:py-1.5 text-sm lg:text-md focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDiscountTypeChange("amount")}
                  className={`px-2 lg:px-3 py-0.5 lg:py-1 text-sm lg:text-md rounded transition-colors ${
                    discountType === "amount"
                      ? "bg-brand text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}>
                  Số tiền
                </button>
                <button
                  onClick={() => handleDiscountTypeChange("ratio")}
                  className={`px-2 lg:px-3 py-0.5 lg:py-1 text-sm lg:text-md rounded transition-colors ${
                    discountType === "ratio"
                      ? "bg-brand text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}>
                  %
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between font-semibold text-base lg:text-lg pt-1 border-t">
          <span>Khách cần trả</span>
          <span className="text-brand text-base lg:text-lg">
            {calculateTotal().toLocaleString()}
          </span>
        </div>
      </div>
      <NoteTemplateModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSave={handleSaveTemplate}
        onDelete={noteModalMode === "edit" ? handleDeleteTemplate : undefined}
        initialValue={editingTemplate?.content || ""}
        mode={noteModalMode}
      />
      {selectedItemForDiscount && canEditDiscount && (
        <ItemDiscountModal
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          item={{
            productName: selectedItemForDiscount.product.name,
            quantity: selectedItemForDiscount.quantity,
            price: selectedItemForDiscount.price,
            discount: selectedItemForDiscount.discount,
          }}
          onSave={handleSaveItemDiscount}
        />
      )}
      {selectedItemForInventory &&
        (isMobile ? (
          <ProductInventoryMobileSheet
            product={selectedItemForInventory.product}
            onClose={() => setSelectedItemForInventory(null)}
          />
        ) : (
          <ProductInventoryModal
            product={selectedItemForInventory.product}
            onClose={() => setSelectedItemForInventory(null)}
          />
        ))}
    </div>
  );
}
