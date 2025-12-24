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

                  {item.note && (
                    <div className="text-xs text-gray-500 italic mb-1">
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
                      className="p-1 hover:bg-gray-100 rounded border">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateItem(item.product.id, {
                          quantity: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="w-14 text-center border rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() =>
                        onUpdateItem(item.product.id, {
                          quantity: item.quantity + 1,
                        })
                      }
                      className="p-1 hover:bg-gray-100 rounded border">
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {hoveredItemId === item.product.id && (
                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="p-1 bg-red-100 hover:bg-red-200 rounded text-red-600 transition-colors ml-2">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* <div className="">
                  <div className="text-lg font-semibold text-blue-600">
                    {item.price.toLocaleString()}
                  </div>
                </div> */}

                <div className="text-right flex gap-60">
                  <div className="text-lg">{item.price.toLocaleString()}</div>
                  <div className="text-lg font-extrabold">
                    {(item.quantity * item.price).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 pb-10 space-y-2">
        <div className="flex items-center justify-between">
          <button className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-md">
            <span>Ghi chú đơn hàng</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-gray-600 text-md">Tổng tiền hàng</span>
            <span className="font-semibold">
              {calculateSubtotal().toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-md">Giảm giá</span>
          <input
            type="number"
            value={discount}
            onChange={(e) => onDiscountChange(Number(e.target.value))}
            className="w-28 text-right border rounded px-2 py-1 text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-gray-600 text-md">Thu khác</span>
            <button className="text-blue-600 hover:text-blue-700 text-md">
              ⓘ
            </button>
          </div>
          <span className="font-medium">0</span>
        </div>

        <div className="flex items-center justify-between font-semibold text-lg">
          <span>Khách cần trả</span>
          <span className="text-blue-600 text-lg">
            {calculateTotal().toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
