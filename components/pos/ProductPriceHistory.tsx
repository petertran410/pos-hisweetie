"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { useProductPriceHistory } from "@/lib/hooks/useOrders";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

interface ProductPriceHistoryProps {
  customerId?: number;
  productId: number;
  documentType: "order" | "invoice";
}

const POPUP_WIDTH = 320;

export function ProductPriceHistory({
  customerId,
  productId,
  documentType,
}: ProductPriceHistoryProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const { data: history = [], isLoading } = useProductPriceHistory(
    customerId,
    productId,
    documentType
  );

  // Đảm bảo portal chỉ render sau khi client mount — tránh hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsidePopup = !popupRef.current?.contains(target);
      const outsideButton = !buttonRef.current?.contains(target);
      if (outsidePopup && outsideButton) setShowHistory(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!buttonRef.current) return;

    if (!showHistory) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Luôn align sát phải: right edge của popup = right edge của button
      setPopupStyle({
        position: "fixed",
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        width: POPUP_WIDTH,
        zIndex: 9999,
      });
    }

    setShowHistory((prev) => !prev);
  };

  if (!customerId) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
        title="Lịch sử giá">
        <Clock className="w-4 h-4" />
      </button>

      {mounted &&
        showHistory &&
        createPortal(
          <div
            ref={popupRef}
            style={popupStyle}
            className="bg-white border rounded-lg shadow-lg">
            <div className="px-3 py-2 border-b bg-gray-50">
              <h4 className="font-semibold text-sm">
                Lịch sử giá 5{" "}
                {documentType === "order" ? "đơn hàng" : "hóa đơn"} gần nhất
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
                          {/* <span>{item.code}</span> */}
                          {documentType === "order" ? (
                            <Link
                              href={`/don-hang/dat-hang?Code=${item.code}`}
                              target="_blank"
                              className="text-blue-600 hover:underline">
                              {item.code}
                            </Link>
                          ) : (
                            <Link
                              href={`/don-hang/hoa-don?Code=${item.code}`}
                              target="_blank"
                              className="text-blue-600 hover:underline">
                              {item.code}
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {format(new Date(item.date), "dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          <div className="font-medium">
                            {formatCurrency(item.finalPrice)}
                          </div>
                          {item.discount > 0 && (
                            <div className="text-[10px] text-gray-500">
                              (-{formatCurrency(item.discount)})
                            </div>
                          )}
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
          </div>,
          document.body
        )}
    </>
  );
}
