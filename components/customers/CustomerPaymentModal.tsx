"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";
import { cashflowsApi } from "@/lib/api/cashflows";
import { formatCurrency } from "@/lib/utils";
import { X, Calendar, Clock } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";

interface CustomerPaymentModalProps {
  customerId: number;
  customerDebt: number;
  onClose: () => void;
}

const formatNumberInput = (value: string): string => {
  const numericValue = value.replace(/,/g, "");
  if (!numericValue || isNaN(Number(numericValue))) return "";
  return Number(numericValue).toLocaleString("en-US");
};

const parseNumberInput = (value: string): number => {
  const numericValue = value.replace(/,/g, "");
  return Number(numericValue) || 0;
};

const getLocalISOString = (datetimeLocalValue: string): string => {
  if (!datetimeLocalValue) return new Date().toISOString();
  const localDate = new Date(datetimeLocalValue);
  return localDate.toISOString();
};

export function CustomerPaymentModal({
  customerId,
  customerDebt,
  onClose,
}: CustomerPaymentModalProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const localDateTime = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 16);

  const [transDate, setTransDate] = useState(localDateTime);
  const [method, setMethod] = useState("cash");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [invoicePayments, setInvoicePayments] = useState<
    Record<number, string>
  >({});
  const { selectedBranch } = useBranchStore();

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", "customer", customerId, "unpaid"],
    queryFn: () =>
      invoicesApi.getInvoices({
        customerIds: [customerId],
        limit: 100,
      }),
  });

  const createPayment = useMutation({
    mutationFn: cashflowsApi.createCustomerPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      alert("Thanh toán thành công!");
      onClose();
    },
    onError: (error: any) => {
      alert(error.message || "Có lỗi xảy ra khi thanh toán");
    },
  });

  const unpaidInvoices =
    invoicesData?.data.filter((invoice: any) => {
      return Number(invoice.debtAmount) > 0;
    }) || [];

  const handleTotalAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setTotalAmount(formatted);

    const numericAmount = parseNumberInput(value);
    if (numericAmount > 0 && unpaidInvoices.length > 0) {
      let remaining = numericAmount;
      const newPayments: Record<number, string> = {};

      for (const invoice of unpaidInvoices) {
        const debtAmount = Number(invoice.debtAmount);

        if (remaining <= 0) break;

        const paymentForThisInvoice = Math.min(remaining, debtAmount);
        newPayments[invoice.id] = formatNumberInput(
          paymentForThisInvoice.toString()
        );
        remaining -= paymentForThisInvoice;
      }

      setInvoicePayments(newPayments);
    } else {
      setInvoicePayments({});
    }
  };

  const handleInvoicePaymentChange = (invoiceId: number, value: string) => {
    const formatted = formatNumberInput(value);
    setInvoicePayments((prev) => ({
      ...prev,
      [invoiceId]: formatted,
    }));

    const actualTotal = Object.entries({
      ...invoicePayments,
      [invoiceId]: formatted,
    }).reduce((sum, [_, amount]) => sum + parseNumberInput(amount), 0);

    setTotalAmount(formatNumberInput(actualTotal.toString()));
  };

  const calculateActualTotal = () => {
    return Object.values(invoicePayments).reduce(
      (sum, amount) => sum + parseNumberInput(amount),
      0
    );
  };

  const calculateUnallocated = () => {
    const totalInput = parseNumberInput(totalAmount);
    const actualTotal = calculateActualTotal();
    return totalInput - actualTotal;
  };

  const handleSubmit = async () => {
    const invoicesToPay = Object.entries(invoicePayments)
      .filter(([_, amount]) => parseNumberInput(amount) > 0)
      .map(([invoiceId, amount]) => ({
        invoiceId: Number(invoiceId),
        amount: parseNumberInput(amount),
      }));

    if (invoicesToPay.length === 0) {
      alert("Vui lòng nhập số tiền thanh toán cho ít nhất một hóa đơn");
      return;
    }

    const actualTotal = calculateActualTotal();

    if (actualTotal <= 0) {
      alert("Tổng số tiền thanh toán phải lớn hơn 0");
      return;
    }

    if (!selectedBranch) {
      alert("Vui lòng chọn chi nhánh");
      return;
    }

    await createPayment.mutateAsync({
      customerId,
      totalAmount: actualTotal,
      branchId: selectedBranch.id,
      transDate: getLocalISOString(transDate),
      method,
      description,
      invoices: invoicesToPay,
    });
  };

  const methodLabels: Record<string, string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    wallet: "Thẻ",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Thanh toán</h3>
            <p className="text-sm text-gray-600">
              Nợ hiện tại: {formatCurrency(customerDebt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Thời gian
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-2 pointer-events-none">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <Clock className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Người thu
              </label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>admin</option>
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-2">
                Phương thức thanh toán
              </label>
              <button
                onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span>{methodLabels[method]}</span>
                <span>▼</span>
              </button>
              {showMethodDropdown && (
                <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-lg mt-1 z-10">
                  <button
                    onClick={() => {
                      setMethod("cash");
                      setShowMethodDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                    {method === "cash" && (
                      <span className="text-blue-600">✓</span>
                    )}
                    <span>Tiền mặt</span>
                  </button>
                  <button
                    onClick={() => {
                      setMethod("wallet");
                      setShowMethodDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                    {method === "wallet" && (
                      <span className="text-blue-600">✓</span>
                    )}
                    <span>Thẻ</span>
                  </button>
                  <button
                    onClick={() => {
                      setMethod("transfer");
                      setShowMethodDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2">
                    {method === "transfer" && (
                      <span className="text-blue-600">✓</span>
                    )}
                    <span>Chuyển khoản</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Số tiền</label>
              <input
                type="text"
                value={totalAmount}
                onChange={(e) => handleTotalAmountChange(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg text-right"
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                Nợ còn: {formatCurrency(customerDebt)}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập ghi chú"
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={3}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked readOnly className="w-4 h-4" />
              <label className="text-sm font-medium">Phân bổ vào hóa đơn</label>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Mã hóa đơn
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Giá trị hóa đơn
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Đã thu trước
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium">
                      Còn cần thu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium">
                      Tiền thu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        Đang tải...
                      </td>
                    </tr>
                  ) : unpaidInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-gray-500">
                        Không có hóa đơn nào cần thanh toán
                      </td>
                    </tr>
                  ) : (
                    unpaidInvoices.map((invoice: any) => {
                      const paymentAmount = parseNumberInput(
                        invoicePayments[invoice.id] || "0"
                      );
                      const willBeCompleted =
                        paymentAmount >= Number(invoice.debtAmount);

                      return (
                        <tr
                          key={invoice.id}
                          className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="text-blue-600">
                              {invoice.code}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {new Date(invoice.purchaseDate).toLocaleString(
                              "vi-VN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(invoice.grandTotal)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatCurrency(
                              Number(invoice.grandTotal) -
                                Number(invoice.debtAmount)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatCurrency(invoice.debtAmount)}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={invoicePayments[invoice.id] || ""}
                              onChange={(e) =>
                                handleInvoicePaymentChange(
                                  invoice.id,
                                  e.target.value
                                )
                              }
                              placeholder="0"
                              className="w-full px-2 py-1 border rounded text-right"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {calculateUnallocated() !== 0 && (
              <div className="mt-2 text-sm text-amber-600">
                ⚠️ Chưa phân bổ hết: {formatCurrency(calculateUnallocated())}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg hover:bg-gray-100">
            Bỏ qua
          </button>
          <div className="flex items-center gap-4">
            <button className="px-6 py-2 border rounded-lg hover:bg-gray-100">
              Tạo phiếu thu & In
            </button>
            <button
              onClick={handleSubmit}
              disabled={createPayment.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {createPayment.isPending ? "Đang xử lý..." : "Tạo phiếu thu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
