"use client";

import { useState, useEffect, useRef } from "react";
import {
  useParentCustomers,
  useChildCustomers,
} from "@/lib/hooks/useCustomers";
import { Plus, X, ChevronDown } from "lucide-react";
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
  const [parentSearch, setParentSearch] = useState("");
  const [parentSearchDebounced, setParentSearchDebounced] = useState("");
  const [childSearch, setChildSearch] = useState("");
  const [childSearchDebounced, setChildSearchDebounced] = useState("");
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [modalCustomerId, setModalCustomerId] = useState<number | null>(null);

  const parentDropdownRef = useRef<HTMLDivElement>(null);
  const childDropdownRef = useRef<HTMLDivElement>(null);

  const { data: parentCustomersData } = useParentCustomers(
    parentSearchDebounced || undefined
  );
  const { data: childCustomersData } = useChildCustomers(
    selectedParent?.id || null,
    childSearchDebounced || undefined
  );

  const parentCustomers = parentCustomersData?.data || [];
  const childCustomers = childCustomersData?.data || [];

  useEffect(() => {
    if (!selectedParent && selectedCustomer) {
      if (selectedCustomer.parent) {
        setSelectedParent(selectedCustomer.parent);
      } else if (!selectedCustomer.parentId) {
        setSelectedParent(selectedCustomer);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParentSearchDebounced(parentSearch);
      if (parentSearch) {
        setShowParentDropdown(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [parentSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChildSearchDebounced(childSearch);
      if (childSearch) {
        setShowChildDropdown(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [childSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        parentDropdownRef.current &&
        !parentDropdownRef.current.contains(event.target as Node)
      ) {
        setShowParentDropdown(false);
      }
      if (
        childDropdownRef.current &&
        !childDropdownRef.current.contains(event.target as Node)
      ) {
        setShowChildDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectParent = (parent: any) => {
    setSelectedParent(parent);
    setParentSearch("");
    setShowParentDropdown(false);

    if (parent._count?.children > 0) {
      setChildSearch("");
      setShowChildDropdown(false);
    } else {
      onSelectCustomer(parent);
    }
  };

  const handleSelectChild = (child: any) => {
    onSelectCustomer({ ...child, parent: selectedParent });
    setChildSearch("");
    setShowChildDropdown(false);
  };

  const handleClearParent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedParent(null);
    onSelectCustomer(null);
    setChildSearch("");
  };

  const handleClearChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectCustomer(null);
  };

  const handleOpenParentModal = () => {
    if (selectedParent) {
      setModalCustomerId(selectedParent.id);
      setShowDetailModal(true);
    }
  };

  const handleOpenChildModal = () => {
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

  const hasChildren = selectedParent?._count?.children > 0;
  const isParentOnlySelected = selectedParent && !selectedCustomer;
  const isChildSelected = selectedCustomer && selectedParent;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative" ref={parentDropdownRef}>
            {!selectedParent ? (
              <input
                type="text"
                placeholder="Tìm khách hàng cha (F4)"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                onFocus={() => parentSearch && setShowParentDropdown(true)}
                className="w-full border rounded-xl px-3 py-2"
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenParentModal}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleOpenParentModal();
                  }
                }}
                className="w-full border rounded-xl px-3 py-2 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer">
                <span className="text-blue-600 hover:underline">
                  {selectedParent.name} {selectedParent.contactNumber}
                </span>
                <button
                  onClick={handleClearParent}
                  className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {showParentDropdown &&
              parentCustomers.length > 0 &&
              !selectedParent && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-80 overflow-y-auto z-50">
                  {parentCustomers.map((parent) => (
                    <button
                      key={parent.id}
                      onClick={() => handleSelectParent(parent)}
                      className="w-full px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0">
                      <div className="font-medium text-sm">{parent.name}</div>
                      <div className="text-xs text-gray-600">
                        Mã: {parent.code || "Chưa có mã"}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-blue-600">
                          {parent.contactNumber || "Chưa có SĐT"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>

          {!selectedParent && (
            <>
              <button className="p-2 border rounded-md hover:bg-gray-50">
                <Plus className="w-4 h-4" />
              </button>
              <PriceBookDropdown
                selectedPriceBookId={selectedPriceBookId}
                onSelectPriceBook={onSelectPriceBook}
              />
            </>
          )}
        </div>

        {hasChildren && (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative" ref={childDropdownRef}>
              {!selectedCustomer ? (
                <input
                  type="text"
                  placeholder="Chọn khách hàng con..."
                  value={childSearch}
                  onChange={(e) => setChildSearch(e.target.value)}
                  onFocus={() => childSearch && setShowChildDropdown(true)}
                  className="w-full border rounded-xl px-3 py-2 bg-blue-50"
                />
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenChildModal}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleOpenChildModal();
                    }
                  }}
                  className="w-full border rounded-xl px-3 py-2 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer">
                  <span className="text-blue-600 hover:underline">
                    {selectedCustomer.name} {selectedCustomer.contactNumber}
                  </span>
                  <button
                    onClick={handleClearChild}
                    className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}

              {showChildDropdown &&
                childCustomers.length > 0 &&
                !selectedCustomer && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-80 overflow-y-auto z-50">
                    {childCustomers.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleSelectChild(child)}
                        className="w-full px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0">
                        <div className="font-medium text-sm">{child.name}</div>
                        <div className="text-xs text-gray-600">
                          Mã: {child.code || "Chưa có mã"}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-blue-600">
                            {child.contactNumber || "Chưa có SĐT"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 border rounded-md hover:bg-gray-50">
                <Plus className="w-4 h-4" />
              </button>
              <PriceBookDropdown
                selectedPriceBookId={selectedPriceBookId}
                onSelectPriceBook={onSelectPriceBook}
              />
            </div>
          </div>
        )}

        {isParentOnlySelected && !hasChildren && (
          <div className="flex items-center gap-2 justify-end">
            <button className="p-2 border rounded-md hover:bg-gray-50">
              <Plus className="w-4 h-4" />
            </button>
            <PriceBookDropdown
              selectedPriceBookId={selectedPriceBookId}
              onSelectPriceBook={onSelectPriceBook}
            />
          </div>
        )}
      </div>

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
