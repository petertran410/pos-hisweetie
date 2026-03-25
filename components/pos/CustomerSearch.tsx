"use client";

import { useState, useEffect, useRef } from "react";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { Plus, X } from "lucide-react";
import { PriceBookDropdown } from "./PriceBookDropdown";
import { CustomerDetailModal } from "./CustomerDetailModal";

interface CustomerSearchProps {
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  selectedPriceBookId: number | null;
  onSelectPriceBook: (priceBookId: number | null) => void;
}

export function CustomerSearch({
  selectedCustomer,
  onSelectCustomer,
  selectedPriceBookId,
  onSelectPriceBook,
}: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: customersData } = useCustomers(
    searchDebounced
      ? {
          name: searchDebounced,
          pageSize: 10,
        }
      : undefined
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

  const handleSelectCustomer = (customer: any) => {
    onSelectCustomer(customer);
    setSearch("");
    setShowDropdown(false);
  };

  const handleClearCustomer = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
  };

  const handleOpenModal = () => {
    if (selectedCustomer) {
      setShowDetailModal(true);
    }
  };

  const handleCustomerUpdate = (updatedCustomer: any) => {
    onSelectCustomer(updatedCustomer);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          {!selectedCustomer ? (
            <input
              type="text"
              placeholder="Tìm khách hàng (F4)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => search && setShowDropdown(true)}
              className="flex-1 border rounded-xl px-3 py-2"
            />
          ) : (
            <button
              onClick={handleOpenModal}
              className="flex-1 border rounded-xl px-3 py-2 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between group">
              <span className="text-blue-600 hover:underline">
                {selectedCustomer.name} {selectedCustomer.contactNumber}
              </span>
              <button
                onClick={handleClearCustomer}
                className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </button>
          )}

          <button className="p-2 border rounded-md hover:bg-gray-50">
            <Plus className="w-4 h-4" />
          </button>
          <PriceBookDropdown
            selectedPriceBookId={selectedPriceBookId}
            onSelectPriceBook={onSelectPriceBook}
          />
        </div>

        {showDropdown && customers.length > 0 && !selectedCustomer && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-80 overflow-y-auto z-50">
            {customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="w-full px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0">
                <div className="font-medium text-sm">{customer.name}</div>
                <div className="text-xs text-gray-600">
                  Mã: {customer.code || "Chưa có mã"}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-blue-600">
                    {customer.contactNumber || "Chưa có SĐT"}
                  </span>
                  {customer.address && (
                    <>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs text-gray-600">
                        {customer.address.substring(0, 30)}...
                      </span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          customerId={selectedCustomer.id}
          onCustomerUpdate={handleCustomerUpdate}
        />
      )}
    </>
  );
}
