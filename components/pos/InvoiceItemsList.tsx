"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
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

interface InvoiceItemsListProps {
  cartItems: CartItem[];
  onUpdateItem: (productId: number, updates: Partial<CartItem>) => void;
  onRemoveItem: (productId: number) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  discountRatio: number;
  onDiscountRatioChange: (ratio: number) => void;
  orderNote: string;
  onOrderNoteChange: (note: string) => void;
}

export function InvoiceItemsList({
  cartItems,
  onUpdateItem,
  onRemoveItem,
  discount,
  onDiscountChange,
  discountRatio,
  onDiscountRatioChange,
  orderNote,
  onOrderNoteChange,
}: InvoiceItemsListProps) {
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
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

  const handleOpenDiscountModal = (item: CartItem) => {
    setSelectedItemForDiscount(item);
    setShowDiscountModal(true);
  };

  const handleSaveItemDiscount = (discount: number) => {
    if (selectedItemForDiscount) {
      onUpdateItem(selectedItemForDiscount.product.id, { discount });
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
      (sum, item) => sum + item.quantity * item.price - item.discount,
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
      <div className="w-[70%] bg-white p-8 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-base">Chưa có sản phẩm trong giỏ hàng</p>
          <p className="text-sm mt-1">Tìm kiếm và thêm sản phẩm để bắt đầu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[60%] bg-white flex flex-col">
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-2">
          {cartItems.map((item) => (
            <div
              key={item.product.id}
              className="border rounded-lg p-3 hover:shadow-md transition-shadow"
              onMouseEnter={() => setHoveredItemId(item.product.id)}
              onMouseLeave={() => setHoveredItemId(null)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-md font-medium text-gray-600">
                      {item.product.code}
                    </span>
                    <span className="text-md font-semibold text-gray-900">
                      {item.product.name}
                    </span>
                  </div>

                  <NoteDropdown
                    value={item.note || ""}
                    onChange={(note) => onUpdateItem(item.product.id, { note })}
                    templates={noteTemplates}
                    onCreateTemplate={handleCreateTemplate}
                    onEditTemplate={handleEditTemplate}
                  />
                </div>

                {hoveredItemId === item.product.id && (
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateItem(item.product.id, {
                        quantity: Math.max(1, item.quantity - 1),
                      })
                    }
                    className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdateItem(item.product.id, {
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-9 h-9 text-center border border-gray-300 rounded px-2 py-1 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <button
                    onClick={() =>
                      onUpdateItem(item.product.id, {
                        quantity: item.quantity + 1,
                      })
                    }
                    className="w-9 h-9 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleOpenDiscountModal(item)}
                    className="text-blue-600 hover:text-blue-700 text-md font-medium">
                    Giảm giá
                  </button>
                  <div className="text-md text-gray-500">
                    {item.price.toLocaleString()}
                  </div>
                  <div className="text-md font-medium">
                    {(
                      item.quantity * item.price -
                      item.discount
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="m-3 border p-3 flex-shrink-0 space-y-2.5 rounded-xl shadow-xl">
        <div>
          <label className="block text-md text-gray-600 mb-1">
            Ghi chú hóa đơn
          </label>
          <textarea
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value)}
            placeholder="Nhập ghi chú cho hóa đơn..."
            className="w-full border rounded-xl px-3 py-2 text-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-md">Tổng tiền hàng</span>
          <span className="font-semibold text-md">
            {calculateSubtotal().toLocaleString()}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-md">Giảm giá</span>
            <span className="text-md font-medium text-red-600 min-w-[100px] text-right">
              - {calculateDiscountAmount().toLocaleString()}
              {discountType === "ratio" && ` (${discountValue}%)`}
            </span>
          </div>

          <div className="flex items-center justify-between w-full">
            <input
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder={
                discountType === "amount" ? "Nhập số tiền" : "Nhập %"
              }
              className="text-center border rounded-xl px-3 py-1.5 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDiscountTypeChange("amount")}
                className={`px-3 py-1 text-md rounded transition-colors ${
                  discountType === "amount"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}>
                Số tiền
              </button>
              <button
                onClick={() => handleDiscountTypeChange("ratio")}
                className={`px-3 py-1 text-md rounded transition-colors ${
                  discountType === "ratio"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}>
                %
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between font-semibold text-lg pt-1 border-t">
          <span>Khách cần trả</span>
          <span className="text-blue-600 text-lg">
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
      {selectedItemForDiscount && (
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
    </div>
  );
}
