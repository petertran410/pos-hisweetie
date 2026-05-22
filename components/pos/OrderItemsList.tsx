"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Copy, Minus, Plus, Trash2 } from "lucide-react";
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
import { useBranchStore } from "@/lib/store/branch";
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";
import { ProductInventoryModal } from "./ProductInventoryModal";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ProductInventoryMobileSheet } from "./ProductInventoryMobileSheet";

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

  const isMobile = useIsMobile();

  const getItemOnHand = (item: CartItem): number | null => {
    if (!selectedBranch || !item.product.inventories) return null;
    const inv = item.product.inventories.find(
      (i: any) => i.branchId === selectedBranch.id
    );
    return inv ? Number(inv.onHand) : null;
  };

  const getStockWarning = (item: CartItem): string | null => {
    const onHand = getItemOnHand(item);
    if (onHand === null) return null;
    if (onHand < 0) return `Tồn kho âm (${onHand})`;
    if (item.quantity > onHand) return `Vượt tồn kho (tồn: ${onHand})`;
    return null;
  };

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

  useEffect(() => {
    if (discountRatio > 0) {
      setDiscountType("ratio");
      setDiscountValue(discountRatio);
      setDisplayValue(formatNumber(discountRatio));
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

  const formatNumber = (value: number): string => {
    if (!value) return "";
    return value.toLocaleString("en-US");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const onlyNumbers = inputValue.replace(/[^\d]/g, "");

    if (onlyNumbers === "") {
      setDisplayValue("");
      setDiscountValue(0);
      if (discountType === "amount") {
        onDiscountChange(0);
        onDiscountRatioChange(0);
      } else {
        onDiscountChange(0);
        onDiscountRatioChange(0);
      }
      return;
    }

    const numericValue = parseInt(onlyNumbers, 10);
    setDiscountValue(numericValue);
    setDisplayValue(formatNumber(numericValue));

    if (discountType === "amount") {
      onDiscountChange(numericValue);
      onDiscountRatioChange(0);
    } else {
      onDiscountChange(0);
      onDiscountRatioChange(numericValue);
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

  const handleDiscountTypeChange = (type: "amount" | "ratio") => {
    setDiscountType(type);
    setDiscountValue(0);
    setDisplayValue("");
    onDiscountChange(0);
    onDiscountRatioChange(0);
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
                  </div>

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
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                  {canViewInventory && (
                    <button
                      onClick={() => setSelectedItemForInventory(item)}
                      className="p-1 hover:bg-blue-50 rounded transition-colors"
                      title="Xem tồn kho tất cả chi nhánh">
                      <AlertCircle className="w-4 h-4 text-blue-400" />
                    </button>
                  )}
                  {canEditPrice && (
                    <ProductPriceHistory
                      customerId={selectedCustomerId}
                      productId={item.product.id}
                      documentType="order"
                    />
                  )}
                  <button
                    onClick={() => onDuplicateItem(item)}
                    className="p-1 hover:bg-green-50 rounded transition-colors"
                    title="Thêm dòng mới cho sản phẩm này">
                    <Copy className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.rowId)}
                    className="p-1 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
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
                      className="w-9 h-5 text-center border border-gray-300 rounded px-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-20 h-6 text-right border border-gray-300 rounded px-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="ml-auto text-xs text-blue-600 font-medium">
                      Giảm giá
                    </button>
                  )}
                </div>
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
                    className="w-14 h-9 text-center border border-gray-300 rounded px-2 py-1 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="text-blue-600 hover:text-blue-700 text-md font-medium">
                      Giảm giá
                    </button>
                  </div>
                  <div className="flex flex-col items-end min-w-[60px]">
                    <span className="text-xs lg:text-md text-gray-400 mb-0.5">
                      Chiết khấu
                    </span>
                    <span
                      className={`text-md ${canEditDiscount ? "cursor-pointer hover:text-blue-600" : ""} ${item.discount > 0 ? "text-red-500" : "text-gray-400"}`}
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
                        className="w-24 h-6 text-right border border-gray-300 rounded px-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
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
            className="w-full border rounded-xl px-3 py-1.5 lg:py-2 text-sm lg:text-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
              {discountType === "ratio" && ` (${discountValue}%)`}
            </span>
          </div>
          {canEditDiscount ? (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder={
                  discountType === "amount" ? "Nhập số tiền" : "Nhập %"
                }
                className="flex-1 min-w-0 text-center border rounded-xl px-2 lg:px-3 py-1 lg:py-1.5 text-sm lg:text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDiscountTypeChange("amount")}
                  className={`px-2 lg:px-3 py-0.5 lg:py-1 text-sm lg:text-md rounded transition-colors ${
                    discountType === "amount"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}>
                  Số tiền
                </button>
                <button
                  onClick={() => handleDiscountTypeChange("ratio")}
                  className={`px-2 lg:px-3 py-0.5 lg:py-1 text-sm lg:text-md rounded transition-colors ${
                    discountType === "ratio"
                      ? "bg-blue-600 text-white"
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
          <span className="text-blue-600 text-base lg:text-lg">
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
