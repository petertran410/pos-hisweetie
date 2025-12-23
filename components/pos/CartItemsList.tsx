"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem } from "@/app/(dashboard)/ban-hang/page";

interface CartItemsListProps {
  cartItems: CartItem[];
  onUpdateItem: (productId: number, updates: Partial<CartItem>) => void;
  onRemoveItem: (productId: number) => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
}

export function CartItemsList({
  cartItems,
  onUpdateItem,
  onRemoveItem,
  discount,
  onDiscountChange,
}: CartItemsListProps) {
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);

  const calculateSubtotal = () => {
    return cartItems.reduce(
      (sum, item) => sum + item.quantity * item.price - item.discount,
      0
    );
  };

  const calculateTotal = () => {
    return calculateSubtotal() - discount;
  };

  if (cartItems.length === 0) {
    return (
      <div className="w-1/2 bg-white p-6 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🛒</div>
          <p>Chưa có sản phẩm trong giỏ hàng</p>
          <p className="text-sm mt-1">Tìm kiếm và thêm sản phẩm để bắt đầu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/2 bg-white flex flex-col pb-4">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.product.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              onMouseEnter={() => setHoveredItemId(item.product.id)}
              onMouseLeave={() => setHoveredItemId(null)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-md font-medium text-gray-600">
                      {item.product.code}
                    </span>
                    <span className="text-md font-semibold text-gray-900">
                      {item.product.name}
                    </span>
                  </div>

                  {item.note && (
                    <div className="text-xs text-gray-500 italic mb-2">
                      {item.note}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onUpdateItem(item.product.id, {
                          quantity: Math.max(1, item.quantity - 1),
                        })
                      }
                      className="p-1.5 hover:bg-gray-100 rounded border">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateItem(item.product.id, {
                          quantity: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-16 text-center border rounded px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() =>
                        onUpdateItem(item.product.id, {
                          quantity: item.quantity + 1,
                        })
                      }
                      className="p-1.5 hover:bg-gray-100 rounded border">
                      <Plus className="w-4 h-4" />
                    </button>

                    {hoveredItemId === item.product.id && (
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 rounded text-red-600 transition-colors ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-semibold text-blue-600">
                    {(item.quantity * item.price).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between text-md">
          <button className="text-gray-600 hover:text-gray-800 flex items-center gap-1">
            <span>✏️</span>
            <span>Ghi chú đơn hàng</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Tổng tiền hàng</span>
            <span className="font-semibold">
              {calculateSubtotal().toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-md">
          <span className="text-gray-600">Giảm giá</span>
          <input
            type="number"
            value={discount}
            onChange={(e) => onDiscountChange(Number(e.target.value))}
            className="w-32 text-right border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between text-md">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Thu khác</span>
            <button className="text-blue-600 hover:text-blue-700">ⓘ</button>
          </div>
          <span className="font-medium">0</span>
        </div>

        <div className="flex items-center justify-between font-semibold text-lg border-t pt-3">
          <span>Khách cần trả</span>
          <span className="text-blue-600">
            {calculateTotal().toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
