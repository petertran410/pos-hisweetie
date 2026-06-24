"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseOrdersApi } from "@/lib/api/purchase-orders";
import { cashflowsApi } from "@/lib/api/cashflows";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";
import {
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { createPortal } from "react-dom";

/**
 * Modal "Trả tiền NCC" bulk multi-PN. Mirror chính xác `CustomerPaymentModal`
 * nhưng đối xứng:
 *   - "Thu tiền KH" → "Trả tiền NCC"
 *   - "Hóa đơn" (Invoice) → "Phiếu nhập" (PurchaseOrder)
 *   - allocateToInvoices → allocateToPurchaseOrders
 *   - method gửi BE: createSupplierPayment
 *
 * debtOffsets (cấn trừ tiền trả thừa NCC) đã được hỗ trợ — đối xứng phía bán:
 * khi đã trả NCC dư, phần dư cấn trừ vào các PN còn nợ qua cột "Cấn trừ".
 */
interface SupplierPaymentBulkModalProps {
  supplierId: number;
  supplierDebt: number;
  onClose: () => void;
}

const formatNumberInput = (value: string): string => {
  const numericValue = value.replace(/,/g, "");
  if (!numericValue || isNaN(Number(numericValue))) return "0";
  return Number(numericValue).toLocaleString("en-US");
};

const parseNumberInput = (value: string): number => {
  const numericValue = value.replace(/,/g, "");
  return Number(numericValue) || 0;
};

export function SupplierPaymentBulkModal({
  supplierId,
  supplierDebt,
  onClose,
}: SupplierPaymentBulkModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const [method, setMethod] = useState("cash");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [allocateToPurchaseOrders, setAllocateToPurchaseOrders] = useState(true);
  const [purchaseOrderPayments, setPurchaseOrderPayments] = useState<
    Record<number, string>
  >({});
  // Cấn trừ tiền trả thừa NCC vào PN còn nợ — đối xứng invoiceDebtOffsets bên KH.
  const [purchaseOrderDebtOffsets, setPurchaseOrderDebtOffsets] = useState<
    Record<number, string>
  >({});
  const debtOffsetsInitialized = useRef(false);

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [mounted, setMounted] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const { data: bankAccountsData } = useBankAccountsForPayment();
  const bankAccounts = bankAccountsData || [];

  const { data: poData, isLoading } = useQuery({
    queryKey: ["purchase-orders", "supplier", supplierId, "unpaid"],
    queryFn: () =>
      purchaseOrdersApi.getAll({
        supplierId,
        pageSize: 1000,
      }),
    enabled: !!supplierId,
  });

  const createPayment = useMutation({
    mutationFn: cashflowsApi.createSupplierPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-debt-timeline"] });
      alert("Trả tiền nhà cung cấp thành công!");
      onClose();
    },
    onError: (error: any) => {
      alert(error.message || "Có lỗi xảy ra khi trả tiền");
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unpaidPurchaseOrders = useMemo(() => {
    return (
      (poData as any)?.data
        ?.filter((po: any) => {
          const debtAmount = Number(po.debtAmount);
          if (debtAmount <= 0) return false;
          if (po.isDraft) return false;
          if (po.status === 2) return false; // CANCELLED
          return true;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a.purchaseDate).getTime() -
            new Date(b.purchaseDate).getTime()
        ) || []
    );
  }, [poData]);

  const totalPages = Math.ceil(unpaidPurchaseOrders.length / pageSize);
  const paginatedPOs = unpaidPurchaseOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Credit = phần chênh giữa tổng debtAmount các PN và supplierDebt thực tế.
  // Xảy ra khi đã trả thừa NCC / trả hàng nhập làm giảm supplierDebt nhưng PN
  // chưa được phân bổ. Đối xứng `availableCredit` của CustomerPaymentModal.
  const availableCredit = useMemo(() => {
    const totalUnpaid = unpaidPurchaseOrders.reduce(
      (sum: number, po: any) => sum + Number(po.debtAmount),
      0
    );
    return Math.max(0, totalUnpaid - supplierDebt);
  }, [unpaidPurchaseOrders, supplierDebt]);

  useEffect(() => {
    if (debtOffsetsInitialized.current || unpaidPurchaseOrders.length === 0)
      return;
    debtOffsetsInitialized.current = true;

    if (availableCredit <= 0) return;

    const oldestPO = unpaidPurchaseOrders[0];
    const defaultOffset = Math.min(
      availableCredit,
      Number(oldestPO.debtAmount)
    );
    if (defaultOffset > 0) {
      setPurchaseOrderDebtOffsets({
        [oldestPO.id]: formatNumberInput(defaultOffset.toString()),
      });
    }
  }, [unpaidPurchaseOrders, availableCredit]);

  const handlePODebtOffsetChange = (poId: number, value: string) => {
    const po = unpaidPurchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;

    const otherTotal = Object.entries(purchaseOrderDebtOffsets)
      .filter(([id]) => Number(id) !== poId)
      .reduce((sum, [, amt]) => sum + parseNumberInput(amt), 0);

    const remaining = Math.max(0, availableCredit - otherTotal);
    const maxAmount = Math.min(Number(po.debtAmount), remaining);
    const numericValue = parseNumberInput(value);
    const limitedValue = Math.min(numericValue, maxAmount);
    const formatted = formatNumberInput(limitedValue.toString());
    setPurchaseOrderDebtOffsets((prev) => ({
      ...prev,
      [poId]: formatted,
    }));

    // Cap lại tiền trả nếu vượt phần còn lại sau cấn trừ
    const currentPayment = parseNumberInput(
      purchaseOrderPayments[poId] || "0"
    );
    const maxPayment = Math.max(0, Number(po.debtAmount) - limitedValue);
    if (currentPayment > maxPayment) {
      setPurchaseOrderPayments((prev) => ({
        ...prev,
        [poId]: formatNumberInput(maxPayment.toString()),
      }));
    }
  };

  const handleTotalAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setTotalAmount(formatted);

    if (allocateToPurchaseOrders && unpaidPurchaseOrders.length > 0) {
      const numericAmount = parseNumberInput(value);
      if (numericAmount > 0) {
        let remaining = numericAmount;
        const newPayments: Record<number, string> = {};

        for (const po of unpaidPurchaseOrders) {
          if (remaining <= 0) break;

          const debtAmount = Number(po.debtAmount);
          const debtOffsetForPO = parseNumberInput(
            purchaseOrderDebtOffsets[po.id] || "0"
          );
          const maxForPO = Math.max(0, debtAmount - debtOffsetForPO);
          const paymentForThisPO = Math.min(remaining, maxForPO);
          newPayments[po.id] = formatNumberInput(
            paymentForThisPO.toString()
          );
          remaining -= paymentForThisPO;
        }

        setPurchaseOrderPayments(newPayments);
      } else {
        setPurchaseOrderPayments({});
      }
    }
  };

  const handlePOPaymentChange = (poId: number, value: string) => {
    const po = unpaidPurchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;

    const debtOffsetForPO = parseNumberInput(
      purchaseOrderDebtOffsets[poId] || "0"
    );
    const maxAmount = Math.max(
      0,
      Number(po.debtAmount) - debtOffsetForPO
    );
    const numericValue = parseNumberInput(value);
    const limitedValue = Math.min(numericValue, maxAmount);

    const formatted = formatNumberInput(limitedValue.toString());
    setPurchaseOrderPayments((prev) => ({
      ...prev,
      [poId]: formatted,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedBranch) {
      alert("Vui lòng chọn chi nhánh");
      return;
    }

    // Tính trước debtOffsetsToApply để dùng cho cả validate (bỏ qua check tài
    // khoản ngân hàng khi chỉ cấn trừ nợ) và payload gửi BE.
    const debtOffsetsToApply = Object.entries(purchaseOrderDebtOffsets)
      .filter(([_, amount]) => parseNumberInput(amount) > 0)
      .map(([poId, amount]) => ({
        purchaseOrderId: Number(poId),
        amount: parseNumberInput(amount),
      }));
    const hasDebtOffsets = debtOffsetsToApply.length > 0;

    if (
      method === "transfer" &&
      !selectedAccountId &&
      (parseNumberInput(totalAmount) > 0 ||
        Object.values(purchaseOrderPayments).some(
          (v) => parseNumberInput(v) > 0
        ))
    ) {
      alert("Vui lòng chọn tài khoản ngân hàng");
      return;
    }

    const totalDebtOffset = debtOffsetsToApply.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    if (totalDebtOffset > availableCredit) {
      alert(
        `Tổng cấn trừ nợ (${formatCurrency(totalDebtOffset)}) vượt quá giới hạn cho phép (${formatCurrency(availableCredit)})`
      );
      return;
    }

    let purchaseOrdersToPay: Array<{ purchaseOrderId: number; amount: number }> =
      [];
    let finalTotalAmount = parseNumberInput(totalAmount);

    if (allocateToPurchaseOrders) {
      purchaseOrdersToPay = Object.entries(purchaseOrderPayments)
        .filter(([_, amount]) => parseNumberInput(amount) > 0)
        .map(([poId, amount]) => ({
          purchaseOrderId: Number(poId),
          amount: parseNumberInput(amount),
        }));

      if (
        finalTotalAmount <= 0 &&
        purchaseOrdersToPay.length === 0 &&
        !hasDebtOffsets
      ) {
        alert("Vui lòng nhập số tiền thanh toán hoặc cấn trừ nợ");
        return;
      }

      if (finalTotalAmount <= 0 && purchaseOrdersToPay.length > 0) {
        finalTotalAmount = purchaseOrdersToPay.reduce(
          (sum, p) => sum + p.amount,
          0
        );
      }
    } else {
      if (finalTotalAmount <= 0 && !hasDebtOffsets) {
        alert("Vui lòng nhập số tiền thanh toán");
        return;
      }
    }

    await createPayment.mutateAsync({
      supplierId,
      totalAmount: finalTotalAmount,
      branchId: selectedBranch.id,
      method,
      description,
      allocateToPurchaseOrders,
      purchaseOrders:
        purchaseOrdersToPay.length > 0 ? purchaseOrdersToPay : undefined,
      debtOffsets: debtOffsetsToApply.length > 0 ? debtOffsetsToApply : undefined,
      accountId: selectedAccountId || undefined,
    });
  };

  const methodLabels: Record<string, string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
      <div className="bg-white rounded-lg w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Trả tiền nhà cung cấp</h3>
            <p className="text-sm text-gray-600">
              Nợ hiện tại: {formatCurrency(supplierDebt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Phương thức thanh toán
                </label>
                <button
                  onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                  <span>{methodLabels[method]}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showMethodDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
                    <button
                      onClick={() => {
                        setMethod("cash");
                        setSelectedAccountId(null);
                        setShowMethodDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      {method === "cash" && (
                        <span className="text-brand">✓</span>
                      )}
                      <span>Tiền mặt</span>
                    </button>
                    <button
                      onClick={() => {
                        setMethod("transfer");
                        setShowMethodDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                      {method === "transfer" && (
                        <span className="text-brand">✓</span>
                      )}
                      <span>Chuyển khoản</span>
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Số tiền
                </label>
                <input
                  type="text"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border rounded-lg text-right"
                />
              </div>
            </div>

            {method === "transfer" && (
              <div className="relative" ref={accountDropdownRef}>
                <label className="block text-sm font-medium mb-2">
                  Tài khoản ngân hàng
                </label>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                  <span className={selectedAccountId ? "" : "text-gray-400"}>
                    {selectedAccountId
                      ? (() => {
                          const account = bankAccounts.find(
                            (a: any) => a.id === selectedAccountId
                          );
                          return account
                            ? `${account.bankCode} - ${account.accountNumber}`
                            : "Chọn tài khoản";
                        })()
                      : "Chọn tài khoản"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showAccountDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {bankAccounts.length > 0 ? (
                      bankAccounts.map((account: any) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setShowAccountDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100">
                          <div className="font-medium text-sm">
                            {account.bankCode} - {account.accountNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account.accountHolder}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-gray-500 text-center">
                        Chưa có tài khoản ngân hàng
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              maxLength={1000}
              placeholder="Nhập ghi chú"
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allocateToPurchaseOrders}
                onChange={(e) => {
                  setAllocateToPurchaseOrders(e.target.checked);
                  if (!e.target.checked) {
                    setPurchaseOrderPayments({});
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                Phân bổ vào phiếu nhập
              </span>
            </label>
          </div>

          {allocateToPurchaseOrders && (
            <div className="border rounded-lg overflow-hidden">
              {availableCredit > 0 && (
                <div className="px-4 py-2 bg-brand-soft border-b text-xs text-brand-dark">
                  Có thể cấn trừ tối đa{" "}
                  <span className="font-semibold">
                    {formatCurrency(availableCredit)}
                  </span>{" "}
                  từ credit hiện có của nhà cung cấp
                </div>
              )}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Mã phiếu nhập
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Giá trị phiếu
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Đã trả
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Còn cần trả
                    </th>
                    {availableCredit > 0 && (
                      <th className="px-4 py-3 text-left text-xs font-medium">
                        Cấn trừ nợ
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Tiền trả
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidPurchaseOrders.length > 0 && (
                    <tr className="bg-gray-50 border-t font-semibold">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-right text-xs text-gray-600">
                        Tổng còn cần trả
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-red-600">
                        {formatCurrency(
                          unpaidPurchaseOrders.reduce(
                            (sum: number, po: any) =>
                              sum + Number(po.debtAmount),
                            0
                          )
                        )}
                      </td>
                      {availableCredit > 0 && <td />}
                      <td />
                    </tr>
                  )}
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={availableCredit > 0 ? 7 : 6}
                        className="px-4 py-8 text-center">
                        Đang tải...
                      </td>
                    </tr>
                  ) : unpaidPurchaseOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={availableCredit > 0 ? 7 : 6}
                        className="px-4 py-8 text-center text-gray-500">
                        Không có phiếu nhập nào cần thanh toán
                      </td>
                    </tr>
                  ) : (
                    paginatedPOs.map((po: any) => (
                      <tr key={po.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-brand">{po.code}</span>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(po.purchaseDate).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(po.subTotal || po.total)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatCurrency(Number(po.paidAmount || 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatCurrency(po.debtAmount)}
                        </td>
                        {availableCredit > 0 && (
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={purchaseOrderDebtOffsets[po.id] || ""}
                              onChange={(e) =>
                                handlePODebtOffsetChange(po.id, e.target.value)
                              }
                              placeholder="0"
                              className="w-full px-2 py-1 border rounded text-right"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={purchaseOrderPayments[po.id] || ""}
                            onChange={(e) =>
                              handlePOPaymentChange(po.id, e.target.value)
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 border rounded text-right"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Hiển thị {paginatedPOs.length} /{" "}
                    {unpaidPurchaseOrders.length} phiếu nhập (Trang{" "}
                    {currentPage} / {totalPages})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                      <ChevronLeft className="w-4 h-4" />
                      Trước
                    </button>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                      Sau
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            onClick={handleSubmit}
            disabled={createPayment.isPending}
            className="px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50">
            {createPayment.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
