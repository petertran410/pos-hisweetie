"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { Plus, X } from "lucide-react";
import { PriceBookDropdown } from "./PriceBookDropdown";
import { CustomerDetailModal } from "./CustomerDetailModal";
import { CustomerForm } from "../customers/CustomerForm";

interface CustomerSearchProps {
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  selectedPriceBookId: number | null;
  selectedPriceBookName?: string | null;
  onSelectPriceBook: (
    priceBookId: number | null,
    priceBookName: string | null
  ) => void;
  cartItems?: any[];
}

export function CustomerSearch({
  selectedCustomer,
  onSelectCustomer,
  selectedPriceBookId,
  selectedPriceBookName,
  onSelectPriceBook,
  cartItems,
}: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalCustomerId, setModalCustomerId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { data: customersData } = useSearchCustomers(
    searchDebounced || undefined
  );
  const customers = customersData?.data || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      if (search) {
        setShowDropdown(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchDebounced, customers.length]);

  useEffect(() => {
    if (showDropdown && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, showDropdown]);

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

  const handleSelect = (customer: any) => {
    onSelectCustomer(customer);
    setSearch("");
    setShowDropdown(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
  };

  const handleOpenModal = () => {
    if (selectedCustomer) {
      setModalCustomerId(selectedCustomer.id);
      setShowDetailModal(true);
    }
  };

  const handleCustomerUpdate = (updatedCustomer: any) => {
    if (modalCustomerId === selectedCustomer?.id) {
      onSelectCustomer(updatedCustomer);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-1 lg:gap-2">
          <div className="flex-1 relative" ref={dropdownRef}>
            {!selectedCustomer ? (
              <input
                type="text"
                placeholder="Tìm khách hàng (F4)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => search && setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (!showDropdown || customers.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightedIndex((i) =>
                      Math.min(i + 1, customers.length - 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (customers[highlightedIndex]) {
                      handleSelect(customers[highlightedIndex]);
                    }
                  } else if (e.key === "Escape") {
                    setShowDropdown(false);
                  }
                }}
                className="w-full border rounded-xl px-2 lg:px-3 py-1 lg:py-2 text-sm lg:text-base"
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenModal}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleOpenModal();
                  }
                }}
                className="w-full flex items-start lg:items-center justify-between gap-1 lg:gap-2 border rounded-lg px-1 py-0.5 lg:py-1 cursor-pointer transition-colors select-none bg-white">
                {/* MOBILE: tách 2 dòng, cho phép wrap */}
                <div className="lg:hidden flex-1 min-w-0 pl-1">
                  <div
                    className={`text-sm hover:underline break-words ${Number(selectedCustomer.totalDebt) > 0 ? "text-red-600" : "text-brand"}`}>
                    {selectedCustomer.name}
                  </div>
                  {selectedCustomer.contactNumber && (
                    <div
                      className={`text-xs hover:underline break-words ${Number(selectedCustomer.totalDebt) > 0 ? "text-red-600" : "text-brand"}`}>
                      {selectedCustomer.contactNumber}
                    </div>
                  )}
                </div>

                {/* DESKTOP: giữ NGUYÊN logic cũ */}
                <span
                  className={`hidden lg:inline hover:underline text-md pl-1 ${Number(selectedCustomer.totalDebt) > 0 ? "text-red-600" : "text-brand"}`}>
                  {selectedCustomer.name} {selectedCustomer.contactNumber}
                </span>

                <button
                  onClick={handleClear}
                  className="ml-1 lg:ml-2 p-0.5 lg:p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0 mt-0.5 lg:mt-0">
                  <X className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-500" />
                </button>
              </div>
            )}

            {showDropdown && customers.length > 0 && !selectedCustomer && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-80 overflow-y-auto z-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {customers.map((customer, index) => (
                  <button
                    key={customer.id}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    onClick={() => handleSelect(customer)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full px-4 py-3 text-left border-b last:border-b-0 ${
                      index === highlightedIndex ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}>
                    <div className="font-medium text-sm">{customer.name}</div>
                    <div className="text-xs text-gray-600">
                      Mã: {customer.code || "Chưa có mã"}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-brand">
                        {customer.contactNumber || "Chưa có SĐT"}
                      </span>
                    </div>
                    {(customer as any).parent && (
                      <div className="text-xs text-orange-600 mt-1">
                        thuộc: {(customer as any).parent.code} -{" "}
                        {(customer as any).parent.name}
                      </div>
                    )}
                    <div className="text-xs text-red-600 mt-1 font-medium">
                      Nợ:{" "}
                      {Number((customer as any).totalDebt).toLocaleString(
                        "vi-VN"
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            title="Tạo khách hàng mới"
            className="p-1 lg:p-2 border rounded-md hover:bg-gray-50 flex-shrink-0">
            <Plus className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
          </button>
          <PriceBookDropdown
            selectedPriceBookId={selectedPriceBookId}
            selectedPriceBookName={selectedPriceBookName}
            onSelectPriceBook={onSelectPriceBook}
            cartItems={cartItems}
            selectedCustomerId={selectedCustomer?.id}
          />
        </div>
      </div>

      {showCreateModal && (
        <CustomerForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={(createdCustomer) => {
            setShowCreateModal(false);
            if (createdCustomer) {
              onSelectCustomer(createdCustomer);
            }
          }}
        />
      )}

      {showDetailModal && modalCustomerId && (
        <CustomerDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setModalCustomerId(null);
          }}
          customerId={modalCustomerId}
          onCustomerUpdate={handleCustomerUpdate}
        />
      )}
    </>
  );
}
