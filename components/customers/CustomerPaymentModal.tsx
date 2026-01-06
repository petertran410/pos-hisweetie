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

export function CustomerPaymentModal({
  customerId,
  customerDebt,
  onClose,
}: CustomerPaymentModalProps) {
  const queryClient = useQueryClient();
  const [transDate, setTransDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
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
      alert(`Có lỗi xảy ra: ${error.message || "Không xác định"}`);
    },
  });

  const unpaidInvoices =
    invoicesData?.data.filter((inv: any) => Number(inv.debtAmount) > 0) || [];

  useEffect(() => {
    const amount = parseNumberInput(totalAmount);
    if (unpaidInvoices.length > 0 && amount > 0) {
      distributeAmount(amount);
    }
  }, [totalAmount]);

  const distributeAmount = (amount: number) => {
    let remainingAmount = amount;
    const newPayments: Record<number, string> = {};

    for (const invoice of unpaidInvoices) {
      if (remainingAmount <= 0) {
        newPayments[invoice.id] = "";
        continue;
      }

      const debtAmount = Number(invoice.debtAmount);
      const paymentAmount = Math.min(remainingAmount, debtAmount);

      newPayments[invoice.id] = formatNumberInput(paymentAmount.toString());
      remainingAmount -= paymentAmount;
    }

    if (remainingAmount > 0 && unpaidInvoices.length > 0) {
      const lastInvoiceId = unpaidInvoices[unpaidInvoices.length - 1].id;
      const lastPayment = parseNumberInput(newPayments[lastInvoiceId] || "0");
      newPayments[lastInvoiceId] = formatNumberInput(
        (lastPayment + remainingAmount).toString()
      );
    }

    setInvoicePayments(newPayments);
  };

  const handleTotalAmountChange = (value: string) => {
    const numericValue = value.replace(/,/g, "");
    if (numericValue === "" || /^\d+$/.test(numericValue)) {
      setTotalAmount(formatNumberInput(numericValue));
    }
  };

  const handleInvoicePaymentChange = (invoiceId: number, value: string) => {
    const numericValue = value.replace(/,/g, "");
    if (numericValue === "" || /^\d+$/.test(numericValue)) {
      setInvoicePayments((prev) => ({
        ...prev,
        [invoiceId]: formatNumberInput(numericValue),
      }));
    }
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
      transDate,
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

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Ghi chú</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập ghi chú"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg resize-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked
                readOnly
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">Phân bổ vào hóa đơn</span>
            </label>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left">Mã hóa đơn</th>
                    <th className="px-4 py-3 text-left">Thời gian</th>
                    <th className="px-4 py-3 text-right">Giá trị hóa đơn</th>
                    <th className="px-4 py-3 text-right">Đã thu trước</th>
                    <th className="px-4 py-3 text-right">Còn cần thu</th>
                    <th className="px-4 py-3 text-right">Tiền thu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-gray-100">
                    <td className="px-4 py-2" colSpan={5}></td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {formatCurrency(calculateActualTotal())}
                    </td>
                    <td className="px-4 py-2"></td>
                  </tr>
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

            {/* <div className="mt-4 text-sm text-right">
              <span className="text-gray-600">Tiền chưa phân bổ: </span>
              <span className="font-semibold">
                {formatCurrency(Math.max(0, calculateUnallocated()))}
              </span>
            </div> */}
          </div>
        </div>

        <div className="border-t p-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Bỏ qua
          </button>
          <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Tạo phiếu thu & In
          </button>
          <button
            onClick={handleSubmit}
            disabled={createPayment.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {createPayment.isPending ? "Đang lưu..." : "Tạo phiếu thu"}
          </button>
        </div>
      </div>
    </div>
  );
}
