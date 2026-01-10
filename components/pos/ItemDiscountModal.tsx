"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ItemDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    productName: string;
    quantity: number;
    price: number;
    discount: number;
  };
  onSave: (discount: number) => void;
}

export function ItemDiscountModal({
  isOpen,
  onClose,
  item,
  onSave,
}: ItemDiscountModalProps) {
  const [discountType, setDiscountType] = useState<"amount" | "ratio">(
    "amount"
  );
  const [inputValue, setInputValue] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxAmount = item.quantity * item.price;

  useEffect(() => {
    if (isOpen) {
      if (item.discount > 0) {
        const discountPercent = (item.discount / maxAmount) * 100;
        if (
          discountPercent <= 100 &&
          discountPercent === Math.floor(discountPercent)
        ) {
          setDiscountType("ratio");
          setInputValue(discountPercent.toString());
        } else {
          setDiscountType("amount");
          setInputValue(item.discount.toLocaleString("en-US"));
        }
      } else {
        setInputValue("");
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, item.discount, maxAmount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatNumber = (value: number): string => {
    return value.toLocaleString("en-US");
  };

  const parseNumber = (value: string): number => {
    return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const onlyNumbers = value.replace(/[^\d]/g, "");

    if (onlyNumbers === "") {
      setInputValue("");
      return;
    }

    const numericValue = parseInt(onlyNumbers, 10);

    if (discountType === "amount") {
      const currentDisplayed = parseNumber(inputValue);

      if (currentDisplayed >= maxAmount && numericValue > currentDisplayed) {
        return;
      }

      if (numericValue >= maxAmount) {
        setInputValue(formatNumber(maxAmount));
      } else {
        setInputValue(formatNumber(numericValue));
      }
    } else {
      const currentDisplayed = parseNumber(inputValue);

      if (currentDisplayed >= 100 && numericValue > currentDisplayed) {
        return;
      }

      if (numericValue >= 100) {
        setInputValue("100");
      } else {
        setInputValue(numericValue.toString());
      }
    }
  };

  const handleTypeChange = (type: "amount" | "ratio") => {
    const currentDiscount = calculateDiscount();

    setDiscountType(type);

    if (currentDiscount === 0) {
      setInputValue("");
    } else {
      if (type === "amount") {
        setInputValue(formatNumber(currentDiscount));
      } else {
        const percent = Math.floor((currentDiscount / maxAmount) * 100);
        setInputValue(percent.toString());
      }
    }
  };

  const calculateDiscount = (): number => {
    if (!inputValue) return 0;

    const value = parseNumber(inputValue);

    if (discountType === "amount") {
      return Math.min(value, maxAmount);
    } else {
      const percent = Math.min(value, 100);
      return Math.floor((maxAmount * percent) / 100);
    }
  };

  const handleSave = () => {
    const discount = calculateDiscount();
    onSave(discount);
    onClose();
  };

  const calculatedDiscount = calculateDiscount();
  const finalPrice = maxAmount - calculatedDiscount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-[350px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-gray-800">
            Giảm giá sản phẩm
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Đơn giá</span>
            <span className="text-md font-medium text-gray-900">
              {formatNumber(maxAmount)}
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-gray-600">Giảm giá</label>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder={discountType === "amount" ? "0" : "0"}
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-md text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => handleTypeChange("amount")}
                  className={`px-3 py-2 text-sm rounded transition-colors ${
                    discountType === "amount"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}>
                  VNĐ
                </button>
                <button
                  onClick={() => handleTypeChange("ratio")}
                  className={`px-3 py-2 text-sm rounded transition-colors ${
                    discountType === "ratio"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}>
                  %
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-gray-600">Giá bán</span>
            <span className="text-md font-semibold text-blue-600">
              {formatNumber(finalPrice)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200">
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700">
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
