"use client";

import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { useProductPriceHistory } from "@/lib/hooks/useOrders";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ProductPriceHistoryProps {
  customerId?: number;
  productId: number;
}

export function ProductPriceHistory({
  customerId,
  productId,
}: ProductPriceHistoryProps) {
  const [showHistory, setShowHistory] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { data: history = [], isLoading } = useProductPriceHistory(
    customerId,
    productId
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setShowHistory(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!customerId) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
        title="Lịch sử giá">
        <Clock className="w-4 h-4" />
      </button>

      {showHistory && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border rounded-lg shadow-lg w-80">
          <div className="px-3 py-2 border-b bg-gray-50">
            <h4 className="font-semibold text-sm">
              Lịch sử giá 5 đơn gần nhất
            </h4>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Đang tải...
              </div>
            ) : history.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Chưa có lịch sử mua hàng
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium">
                      Mã
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium">
                      Ngày
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium">
                      Giá bán
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium">
                      SL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-1">
                          <span>{item.code}</span>
                          <span
                            className={`text-[10px] px-1 py-0.5 rounded ${
                              item.type === "order"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                            {item.type === "order" ? "ĐH" : "HĐ"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {format(new Date(item.date), "dd/MM/yyyy", {
                          locale: vi,
                        })}
                      </td>
                      <td className="px-3 py-2 text-xs text-right">
                        <div>
                          <div className="font-medium">
                            {formatCurrency(item.finalPrice)}
                          </div>
                          {item.discount > 0 && (
                            <div className="text-[10px] text-gray-500">
                              (-{formatCurrency(item.discount)})
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-right">
                        {item.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
