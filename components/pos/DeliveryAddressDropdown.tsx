"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { CustomerAddress } from "@/lib/types/customer";
import { formatAddressFull } from "@/lib/utils/customer-address";

interface DeliveryAddressDropdownProps {
  addresses: CustomerAddress[];
  selectedAddressId?: number | null;
  onSelect: (address: CustomerAddress) => void;
}

export function DeliveryAddressDropdown({
  addresses,
  selectedAddressId,
  onSelect,
}: DeliveryAddressDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected =
    addresses.find((a) => a.id === selectedAddressId) ||
    addresses.find((a) => a.isDefault) ||
    addresses[0];

  const handleSelect = (addr: CustomerAddress) => {
    onSelect(addr);
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full border rounded-xl px-2 py-2 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span className="text-sm text-blue-600 truncate">
            {selected
              ? selected.label ||
                selected.receiver ||
                formatAddressFull(selected)
              : "Chọn địa chỉ giao hàng"}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            showDropdown ? "rotate-180" : ""
          }`}
        />
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-80 overflow-y-auto z-50">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              type="button"
              onClick={() => handleSelect(addr)}
              className={`w-full px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0 ${
                selected?.id === addr.id ? "bg-blue-50" : ""
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {addr.label || addr.receiver || "Địa chỉ"}
                </span>
                {addr.isDefault && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded">
                    Mặc định
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {formatAddressFull(addr)}
              </div>
              {addr.contactNumber && (
                <div className="text-xs text-blue-600 mt-1">
                  {addr.contactNumber}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
