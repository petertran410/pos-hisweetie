"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api/invoices";
import { cashflowsApi } from "@/lib/api/cashflows";
import { useUsers } from "@/lib/hooks/useUsers";
import { useAuthStore } from "@/lib/store/auth";
import { formatCurrency } from "@/lib/utils";
import { X, Calendar, Clock, ChevronDown } from "lucide-react";
import { useBranchStore } from "@/lib/store/branch";

interface CustomerPaymentModalProps {
  customerId: number;
  customerDebt: number;
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

const formatDateTime = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const parseDateTime = (value: string) => {
  const parts = value.trim().split(" ");
  if (parts.length !== 2) return new Date();

  const dateParts = parts[0].split("/");
  const timeParts = parts[1].split(":");

  if (dateParts.length !== 3 || timeParts.length !== 2) return new Date();

  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = parseInt(dateParts[2]);
  const hours = parseInt(timeParts[0]);
  const minutes = parseInt(timeParts[1]);

  return new Date(year, month, day, hours, minutes);
};

export function CustomerPaymentModal({
  customerId,
  customerDebt,
  onClose,
}: CustomerPaymentModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const [transDate, setTransDate] = useState("");
  const [transDateTime, setTransDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [collectorUserId, setCollectorUserId] = useState<string>("");
  const [showCollectorDropdown, setShowCollectorDropdown] = useState(false);
  const [method, setMethod] = useState("cash");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [allocateToInvoices, setAllocateToInvoices] = useState(true);
  const [invoicePayments, setInvoicePayments] = useState<
    Record<number, string>
  >({});

  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  const collectorDropdownRef = useRef<HTMLDivElement>(null);

  const { data: usersData } = useUsers();
  const users = usersData || [];

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

  useEffect(() => {
    if (user?.id) {
      setCollectorUserId(user.id.toString());
      setTransDateTime(new Date());
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        collectorDropdownRef.current &&
        !collectorDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCollectorDropdown(false);
      }
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target as Node)
      ) {
        setShowDatePicker(false);
      }
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target as Node)
      ) {
        setShowTimePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unpaidInvoices =
    invoicesData?.data
      .filter((invoice: any) => Number(invoice.debtAmount) > 0)
      .sort(
        (a: any, b: any) =>
          new Date(a.purchaseDate).getTime() -
          new Date(b.purchaseDate).getTime()
      ) || [];

  const handleDateSelect = (date: Date) => {
    const newDateTime = new Date(transDateTime);
    newDateTime.setFullYear(date.getFullYear());
    newDateTime.setMonth(date.getMonth());
    newDateTime.setDate(date.getDate());
    setTransDateTime(newDateTime);
    setShowDatePicker(false);
  };

  const handleTimeSelect = (hours: number, minutes: number) => {
    const newDateTime = new Date(transDateTime);
    newDateTime.setHours(hours);
    newDateTime.setMinutes(minutes);
    setTransDateTime(newDateTime);
    setShowTimePicker(false);
  };

  const handleTransDateInput = (value: string) => {
    setTransDate(value);
  };

  const handleTotalAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setTotalAmount(formatted);

    if (allocateToInvoices && unpaidInvoices.length > 0) {
      const numericAmount = parseNumberInput(value);
      if (numericAmount > 0) {
        let remaining = numericAmount;
        const newPayments: Record<number, string> = {};

        for (const invoice of unpaidInvoices) {
          if (remaining <= 0) break;

          const debtAmount = Number(invoice.debtAmount);
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
    }
  };

  const handleInvoicePaymentChange = (invoiceId: number, value: string) => {
    const invoice = unpaidInvoices.find((inv: any) => inv.id === invoiceId);
    if (!invoice) return;

    const maxAmount = Number(invoice.debtAmount);
    const numericValue = parseNumberInput(value);
    const limitedValue = Math.min(numericValue, maxAmount);

    const formatted = formatNumberInput(limitedValue.toString());
    setInvoicePayments((prev) => ({
      ...prev,
      [invoiceId]: formatted,
    }));
  };

  const handleSubmit = async () => {
    const numericTotalAmount = parseNumberInput(totalAmount);

    if (numericTotalAmount <= 0) {
      alert("Vui lòng nhập số tiền thanh toán");
      return;
    }

    if (!selectedBranch) {
      alert("Vui lòng chọn chi nhánh");
      return;
    }

    if (!collectorUserId) {
      alert("Vui lòng chọn người thu");
      return;
    }

    let finalTransDate = transDateTime;
    if (transDate) {
      finalTransDate = parseDateTime(transDate);
    }

    let invoicesToPay: Array<{ invoiceId: number; amount: number }> = [];

    if (allocateToInvoices) {
      invoicesToPay = Object.entries(invoicePayments)
        .filter(([_, amount]) => parseNumberInput(amount) > 0)
        .map(([invoiceId, amount]) => ({
          invoiceId: Number(invoiceId),
          amount: parseNumberInput(amount),
        }));
    }

    await createPayment.mutateAsync({
      customerId,
      totalAmount: numericTotalAmount,
      branchId: selectedBranch.id,
      transDate: finalTransDate.toISOString(),
      method,
      collectorUserId: Number(collectorUserId),
      description,
      allocateToInvoices,
      invoices: invoicesToPay.length > 0 ? invoicesToPay : undefined,
    });
  };

  const selectedCollector = users.find(
    (u: any) => u.id === Number(collectorUserId)
  );

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
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Thời gian
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={transDate}
                  onChange={(e) => handleTransDateInput(e.target.value)}
                  placeholder={formatDateTime(transDateTime)}
                  className="w-full px-3 py-2 border rounded-lg pr-20"
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    type="button">
                    <Calendar className="w-4 h-4 text-gray-400 cursor-pointer" />
                  </button>
                  <button
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    type="button">
                    <Clock className="w-4 h-4 text-gray-400 cursor-pointer" />
                  </button>
                </div>

                {showDatePicker && (
                  <div
                    ref={datePickerRef}
                    className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50">
                    <div className="text-center mb-2">
                      <select
                        value={transDateTime.getMonth()}
                        onChange={(e) => {
                          const newDate = new Date(transDateTime);
                          newDate.setMonth(Number(e.target.value));
                          setTransDateTime(newDate);
                        }}
                        className="border rounded px-2 py-1 mr-2">
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            Tháng {i + 1}
                          </option>
                        ))}
                      </select>
                      <select
                        value={transDateTime.getFullYear()}
                        onChange={(e) => {
                          const newDate = new Date(transDateTime);
                          newDate.setFullYear(Number(e.target.value));
                          setTransDateTime(newDate);
                        }}
                        className="border rounded px-2 py-1">
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 42 }, (_, i) => {
                        const firstDay = new Date(
                          transDateTime.getFullYear(),
                          transDateTime.getMonth(),
                          1
                        );
                        const startDay = firstDay.getDay();
                        const dayNumber = i - startDay + 1;
                        const daysInMonth = new Date(
                          transDateTime.getFullYear(),
                          transDateTime.getMonth() + 1,
                          0
                        ).getDate();

                        if (dayNumber < 1 || dayNumber > daysInMonth) {
                          return <div key={i} className="w-8 h-8" />;
                        }

                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newDate = new Date(
                                transDateTime.getFullYear(),
                                transDateTime.getMonth(),
                                dayNumber
                              );
                              handleDateSelect(newDate);
                            }}
                            className={`w-8 h-8 rounded hover:bg-blue-100 ${
                              dayNumber === transDateTime.getDate()
                                ? "bg-blue-500 text-white"
                                : ""
                            }`}>
                            {dayNumber}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {showTimePicker && (
                  <div
                    ref={timePickerRef}
                    className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-50 w-64">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Giờ</label>
                        <div className="h-40 overflow-y-auto border rounded">
                          {Array.from({ length: 24 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                handleTimeSelect(i, transDateTime.getMinutes())
                              }
                              className={`w-full px-2 py-1 text-left hover:bg-blue-100 ${
                                i === transDateTime.getHours()
                                  ? "bg-blue-500 text-white"
                                  : ""
                              }`}>
                              {String(i).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Phút</label>
                        <div className="h-40 overflow-y-auto border rounded">
                          {Array.from({ length: 60 }, (_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() =>
                                handleTimeSelect(transDateTime.getHours(), i)
                              }
                              className={`w-full px-2 py-1 text-left hover:bg-blue-100 ${
                                i === transDateTime.getMinutes()
                                  ? "bg-blue-500 text-white"
                                  : ""
                              }`}>
                              {String(i).padStart(2, "0")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative" ref={collectorDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                Người thu
              </label>
              <button
                onClick={() => setShowCollectorDropdown(!showCollectorDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span className={selectedCollector ? "" : "text-gray-400"}>
                  {selectedCollector
                    ? selectedCollector.name
                    : "Chọn người thu"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showCollectorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {users.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setCollectorUserId(u.id.toString());
                        setShowCollectorDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100">
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập ghi chú"
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allocateToInvoices}
                onChange={(e) => {
                  setAllocateToInvoices(e.target.checked);
                  if (!e.target.checked) {
                    setInvoicePayments({});
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Phân bổ vào hóa đơn</span>
            </label>
          </div>

          {allocateToInvoices && (
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
                      <td colSpan={6} className="px-4 py-8 text-center">
                        Đang tải...
                      </td>
                    </tr>
                  ) : unpaidInvoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-gray-500">
                        Không có hóa đơn nào cần thanh toán
                      </td>
                    </tr>
                  ) : (
                    unpaidInvoices.map((invoice: any) => (
                      <tr
                        key={invoice.id}
                        className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-blue-600">{invoice.code}</span>
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
                    ))
                  )}
                </tbody>
              </table>
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
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
            {createPayment.isPending ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
