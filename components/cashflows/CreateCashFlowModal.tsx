"use client";

import { useState, useRef, useEffect } from "react";
import { useCreateCashFlow } from "@/lib/hooks/useCashflows";
import { useCashFlowGroups } from "@/lib/hooks/useCashflowGroups";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useUsers } from "@/lib/hooks/useUsers";
import { useUnpaidInvoicesByPartner } from "@/lib/hooks/useInvoices";
import { CreateCashFlowGroupModal } from "./CreateCashFlowGroupModal";
import { X, ChevronDown, Calendar, Clock } from "lucide-react";

interface CreateCashFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "cash" | "bank" | "ewallet";
  isReceipt: boolean;
}

const TYPE_LABELS = {
  cash: "Tạo phiếu thu tiền mặt",
  bank: "Tạo phiếu thu ngân hàng",
  ewallet: "Tạo phiếu thu ví điện tử",
};

const PARTNER_TYPES = [
  { value: "C", label: "Khách hàng" },
  { value: "S", label: "Nhà cung cấp" },
  { value: "O", label: "Đối tác giao dịch" },
];

const formatNumberInput = (value: string) => {
  const number = value.replace(/\D/g, "");
  return new Intl.NumberFormat("en-US").format(Number(number) || 0);
};

const parseNumberInput = (value: string) => {
  return Number(value.replace(/,/g, "")) || 0;
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

export function CreateCashFlowModal({
  isOpen,
  onClose,
  type,
  isReceipt,
}: CreateCashFlowModalProps) {
  const [transDate, setTransDate] = useState("");
  const [transDateTime, setTransDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [cashFlowGroupId, setCashFlowGroupId] = useState<string>("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [partnerType, setPartnerType] = useState("O");
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [collectorUserId, setCollectorUserId] = useState<string>("");
  const [showCollectorDropdown, setShowCollectorDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [usedForFinancialReporting, setUsedForFinancialReporting] =
    useState(false);
  const [affectDebt, setAffectDebt] = useState(true);
  const [allocateToInvoices, setAllocateToInvoices] = useState(true);
  const [invoicePayments, setInvoicePayments] = useState<
    Record<number, string>
  >({});

  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);
  const collectorDropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  const createCashFlow = useCreateCashFlow();
  const { data: cashFlowGroups } = useCashFlowGroups(isReceipt);
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const { data: suppliersData } = useSuppliers({ pageSize: 100 });
  const { data: usersData } = useUsers();
  const { data: unpaidInvoicesData } = useUnpaidInvoicesByPartner(
    selectedPartner?.id || null,
    partnerType
  );

  const groups = cashFlowGroups || [];
  const customers = customersData?.data || [];
  const suppliers = suppliersData?.data || [];
  const users = usersData || [];
  const unpaidInvoices = unpaidInvoicesData?.data || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        groupDropdownRef.current &&
        !groupDropdownRef.current.contains(event.target as Node)
      ) {
        setShowGroupDropdown(false);
      }
      if (
        partnerDropdownRef.current &&
        !partnerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPartnerDropdown(false);
      }
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

  useEffect(() => {
    if (isOpen) {
      setTransDateTime(new Date());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedGroup = groups.find(
    (g: any) => g.id === Number(cashFlowGroupId)
  );

  const selectedCollector = users.find(
    (u: any) => u.id === Number(collectorUserId)
  );

  const getPartnerList = () => {
    if (partnerType === "C") return customers;
    if (partnerType === "S") return suppliers;
    return [];
  };

  const filteredPartners = getPartnerList().filter((p: any) =>
    p.name.toLowerCase().includes(partnerSearch.toLowerCase())
  );

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

  const handleAmountChange = (value: string) => {
    const formatted = formatNumberInput(value);
    setAmount(formatted);

    if (allocateToInvoices && unpaidInvoices.length > 0) {
      const numericAmount = parseNumberInput(value);
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

    setAmount(formatNumberInput(actualTotal.toString()));
  };

  const handleSubmit = async () => {
    const numericAmount = parseNumberInput(amount);
    if (!numericAmount || numericAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
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

    const invoiceAllocations = allocateToInvoices
      ? Object.entries(invoicePayments)
          .filter(([_, amount]) => parseNumberInput(amount) > 0)
          .map(([invoiceId, amount]) => ({
            invoiceId: Number(invoiceId),
            amount: parseNumberInput(amount),
          }))
      : undefined;

    try {
      await createCashFlow.mutateAsync({
        isReceipt,
        amount: numericAmount,
        transDate: finalTransDate.toISOString(),
        method:
          type === "cash" ? "cash" : type === "bank" ? "transfer" : "ewallet",
        cashFlowGroupId: cashFlowGroupId ? Number(cashFlowGroupId) : undefined,
        partnerType,
        partnerId: selectedPartner?.id,
        partnerName: selectedPartner?.name || partnerSearch || undefined,
        description,
        usedForFinancialReporting: usedForFinancialReporting ? 1 : 0,
        collectorUserId: Number(collectorUserId),
        affectDebt,
        allocateToInvoices: affectDebt ? allocateToInvoices : false,
        invoiceAllocations:
          affectDebt && allocateToInvoices ? invoiceAllocations : undefined,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating cashflow:", error);
      alert("Có lỗi xảy ra khi tạo phiếu thu/chi");
    }
  };

  const resetForm = () => {
    setTransDate("");
    setTransDateTime(new Date());
    setCashFlowGroupId("");
    setPartnerType("O");
    setPartnerSearch("");
    setSelectedPartner(null);
    setCollectorUserId("");
    setAmount("");
    setDescription("");
    setUsedForFinancialReporting(false);
    setAffectDebt(true);
    setAllocateToInvoices(true);
    setInvoicePayments({});
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[900px] max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">
              {isReceipt
                ? TYPE_LABELS[type]
                : TYPE_LABELS[type].replace("thu", "chi")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Mã phiếu</label>
              <input
                type="text"
                placeholder="Tự động"
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              />
            </div>

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
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    type="button">
                    <Clock className="w-4 h-4 text-gray-400" />
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

            <div className="relative" ref={groupDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                {isReceipt ? "Loại thu" : "Loại chi"}
              </label>
              <button
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span className={selectedGroup ? "" : "text-gray-400"}>
                  {selectedGroup ? selectedGroup.name : "Chọn loại thu"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showGroupDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {groups.map((group: any) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setCashFlowGroupId(group.id.toString());
                        setShowGroupDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100">
                      {group.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowCreateGroupModal(true);
                      setShowGroupDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-blue-500 hover:bg-gray-100 border-t">
                    + Thêm loại thu/chi
                  </button>
                </div>
              )}
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
                  {users.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setCollectorUserId(user.id.toString());
                        setShowCollectorDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-100">
                      {user.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Đối tượng nộp
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {PARTNER_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => {
                      setPartnerType(pt.value);
                      setSelectedPartner(null);
                      setPartnerSearch("");
                    }}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      partnerType === pt.value
                        ? "bg-blue-500 text-white"
                        : "border"
                    }`}>
                    {pt.label}
                  </button>
                ))}
              </div>

              <div className="relative" ref={partnerDropdownRef}>
                <input
                  type="text"
                  value={selectedPartner ? selectedPartner.name : partnerSearch}
                  onChange={(e) => {
                    setPartnerSearch(e.target.value);
                    setSelectedPartner(null);
                    if (partnerType !== "O") {
                      setShowPartnerDropdown(true);
                    }
                  }}
                  onFocus={() => {
                    if (partnerType !== "O") {
                      setShowPartnerDropdown(true);
                    }
                  }}
                  placeholder="Tên người nộp"
                  className="w-full px-3 py-2 border rounded-lg"
                />

                {showPartnerDropdown && partnerType !== "O" && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredPartners.length > 0 ? (
                      filteredPartners.map((partner: any) => (
                        <button
                          key={partner.id}
                          onClick={() => {
                            setSelectedPartner(partner);
                            setPartnerSearch("");
                            setShowPartnerDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100">
                          <div>{partner.name}</div>
                          <div className="text-sm text-gray-500">
                            {partner.code} - {partner.contactNumber}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500">
                        Không tìm thấy kết quả
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Số tiền</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg text-right text-lg"
              />
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

            {partnerType === "C" && selectedPartner && (
              <div className="col-span-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={affectDebt}
                    onChange={(e) => {
                      setAffectDebt(e.target.checked);
                      if (!e.target.checked) {
                        setAllocateToInvoices(false);
                        setInvoicePayments({});
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <span className="text-sm font-medium">Tính vào công nợ</span>
                </label>

                {affectDebt && (
                  <div className="ml-6 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={allocateToInvoices}
                        onChange={() => setAllocateToInvoices(true)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">Phân bổ vào hóa đơn</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!allocateToInvoices}
                        onChange={() => {
                          setAllocateToInvoices(false);
                          setInvoicePayments({});
                        }}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">
                        Chỉ trừ vào công nợ, không phân bổ hóa đơn
                      </span>
                    </label>

                    {allocateToInvoices && unpaidInvoices.length > 0 && (
                      <div className="border rounded-lg overflow-hidden mt-2">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="px-3 py-2 text-left">
                                Mã hóa đơn
                              </th>
                              <th className="px-3 py-2 text-left">Thời gian</th>
                              <th className="px-3 py-2 text-right">
                                Giá trị hóa đơn
                              </th>
                              <th className="px-3 py-2 text-right">
                                Đã thu trước
                              </th>
                              <th className="px-3 py-2 text-right">
                                Còn cần thu
                              </th>
                              <th className="px-3 py-2 text-right">Tiền thu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unpaidInvoices.map((invoice: any) => (
                              <tr key={invoice.id} className="border-b">
                                <td className="px-3 py-2">{invoice.code}</td>
                                <td className="px-3 py-2">
                                  {new Date(
                                    invoice.purchaseDate
                                  ).toLocaleDateString("vi-VN")}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatNumberInput(
                                    invoice.grandTotal.toString()
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatNumberInput(
                                    invoice.paidAmount.toString()
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatNumberInput(
                                    invoice.debtAmount.toString()
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={invoicePayments[invoice.id] || "0"}
                                    onChange={(e) =>
                                      handleInvoicePaymentChange(
                                        invoice.id,
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1 border rounded text-right"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {allocateToInvoices && unpaidInvoices.length === 0 && (
                      <div className="text-sm text-gray-500 italic">
                        Khách hàng không có hóa đơn nợ
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Bỏ qua
            </button>
            <button
              onClick={handleSubmit}
              disabled={createCashFlow.isPending}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {createCashFlow.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      <CreateCashFlowGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        isReceipt={isReceipt}
      />
    </>
  );
}
