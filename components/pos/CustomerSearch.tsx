"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PriceBookDropdown } from "./PriceBookDropdown";
import { CustomerDetailModal } from "./CustomerDetailModal";
import { CustomerForm } from "../customers/CustomerForm";
import { useBranchStore } from "@/lib/store/branch";
import { useAuthStore } from "@/lib/store/auth";
import { canCustomerUsePriceBook } from "@/lib/utils/price-book-scope";
import { toast } from "sonner";

interface CustomerSearchProps {
  selectedCustomer: any;
  onSelectCustomer: (customer: any) => void;
  selectedPriceBookId: number | null;
  selectedPriceBookName?: string | null;
  onSelectPriceBook: (
    priceBookId: number | null,
    priceBookName: string | null,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { selectedBranch } = useBranchStore();
  const { user } = useAuthStore();

  // Chỉ tìm khách dùng được với bảng giá đang chọn (0 = Bảng giá chung:
  // ẩn khách đã gắn bảng giá riêng).
  const { data: customersData, isFetching: isFetchingCustomers } =
    useSearchCustomers(searchDebounced || undefined, {
      priceBookId: selectedPriceBookId ?? 0,
      branchId: selectedBranch?.id,
    });
  const customers = customersData?.data || [];
  // Tab khôi phục từ localStorage có thể chỉ có id, chưa có tên bảng giá.
  const priceBookLabel =
    selectedPriceBookId && selectedPriceBookId > 0
      ? selectedPriceBookName
        ? `bảng giá "${selectedPriceBookName}"`
        : "bảng giá đang chọn"
      : `bảng giá "Bảng giá chung"`;
  const showNoResult =
    showDropdown &&
    !selectedCustomer &&
    !!search &&
    search === searchDebounced &&
    !isFetchingCustomers &&
    !!customersData &&
    customers.length === 0;

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

  // F4: đưa con trỏ vào ô tìm khách (chỉ ô đang hiển thị — 2 giỏ Đơn/Hóa đơn
  // có thể cùng được mount nhưng chỉ 1 giỏ hiện).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "F4") return;
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      e.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
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

  const isSearching =
    !!search && (search !== searchDebounced || isFetchingCustomers);

  return (
    <>
      <div className="flex items-center gap-1.5 lg:gap-2">
        <div className="relative min-w-0 flex-1" ref={dropdownRef}>
          {!selectedCustomer ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputRef}
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
                      Math.min(i + 1, customers.length - 1),
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
                className="h-8 w-full rounded-lg border bg-white pl-8 pr-8 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand focus:shadow-[0_0_0_3px_var(--dt-color-primary-ring)] focus:outline-none lg:h-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>
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
              title="Xem chi tiết khách hàng"
              className="group flex min-h-8 w-full cursor-pointer select-none items-center gap-2 rounded-lg border border-brand-border bg-brand-soft py-1 pl-2 pr-1 transition-colors hover:border-brand lg:min-h-10">
              <div className="min-w-0 flex-1 leading-tight">
                <div
                  className={`line-clamp-2 break-words text-sm font-semibold group-hover:underline ${
                    Number(selectedCustomer.totalDebt) > 0
                      ? "text-red-600"
                      : "text-brand"
                  }`}>
                  {selectedCustomer.name}
                </div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                aria-label="Bỏ chọn khách hàng"
                className="flex-shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-white hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {showDropdown && customers.length > 0 && !selectedCustomer && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border bg-white py-1 shadow-lg [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              {customers.map((customer, index) => {
                const debt = Number((customer as any).totalDebt) || 0;
                return (
                  <button
                    key={customer.id}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    onClick={() => handleSelect(customer)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex w-full items-start gap-3 px-3 py-2 text-left transition-colors ${
                      index === highlightedIndex ? "bg-brand-soft" : ""
                    }`}>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 break-words text-sm font-medium text-gray-900">
                        {customer.name}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {customer.code || "Chưa có mã"}
                        {" · "}
                        <span className="text-brand">
                          {customer.contactNumber || "Chưa có SĐT"}
                        </span>
                      </div>
                      {(customer as any).parent && (
                        <div className="mt-0.5 truncate text-xs text-orange-600">
                          Thuộc {(customer as any).parent.code} –{" "}
                          {(customer as any).parent.name}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right leading-tight">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">
                        Nợ
                      </div>
                      <div
                        className={`text-xs font-semibold tabular-nums ${
                          debt > 0 ? "text-red-600" : "text-gray-400"
                        }`}>
                        {formatCurrency(debt)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {showNoResult && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-white px-4 py-3 text-sm text-gray-500 shadow-lg">
              {`Không tìm thấy khách hàng trong ${priceBookLabel}`}
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  setShowCreateModal(true);
                }}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                <UserPlus className="h-4 w-4" />
                Tạo khách hàng mới
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          title="Tạo khách hàng mới"
          aria-label="Tạo khách hàng mới"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border bg-white text-gray-600 transition-colors hover:border-brand hover:text-brand lg:h-10 lg:w-10">
          <UserPlus className="h-4 w-4" />
        </button>
        <PriceBookDropdown
          selectedPriceBookId={selectedPriceBookId}
          selectedPriceBookName={selectedPriceBookName}
          onSelectPriceBook={onSelectPriceBook}
          cartItems={cartItems}
          selectedCustomerId={selectedCustomer?.id}
          selectedCustomerName={selectedCustomer?.name}
        />
      </div>

      {showCreateModal && (
        <CustomerForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={async (createdCustomer) => {
            setShowCreateModal(false);
            if (!createdCustomer) return;
            // Khách mới phải dùng được bảng giá đang chọn mới gắn vào đơn.
            try {
              const { allowed } = await canCustomerUsePriceBook({
                customerId: createdCustomer.id,
                priceBookId: selectedPriceBookId,
                branchId: selectedBranch?.id,
                userId: user?.id,
              });
              if (!allowed) {
                toast.error(
                  `Đã tạo khách hàng "${createdCustomer.name}" nhưng khách không thuộc ${priceBookLabel}.`,
                );
                return;
              }
            } catch {
              toast.error("Không thể kiểm tra bảng giá của khách hàng.");
              return;
            }
            onSelectCustomer(createdCustomer);
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
