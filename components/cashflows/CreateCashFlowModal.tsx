"use client";

import { useState, useRef, useEffect } from "react";
import { useCreateCashFlow } from "@/lib/hooks/useCashflows";
import { useCashFlowGroups } from "@/lib/hooks/useCashflowGroups";
import { useCustomers } from "@/lib/hooks/useCustomers";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
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

export function CreateCashFlowModal({
  isOpen,
  onClose,
  type,
  isReceipt,
}: CreateCashFlowModalProps) {
  const [code, setCode] = useState("");
  const [transDate, setTransDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [cashFlowGroupId, setCashFlowGroupId] = useState<string>("");
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [partnerType, setPartnerType] = useState("O");
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [usedForFinancialReporting, setUsedForFinancialReporting] =
    useState(true);

  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const partnerDropdownRef = useRef<HTMLDivElement>(null);

  const createCashFlow = useCreateCashFlow();
  const { data: cashFlowGroups } = useCashFlowGroups(isReceipt);
  const { data: customersData } = useCustomers({ pageSize: 100 });
  const { data: suppliersData } = useSuppliers({ pageSize: 100 });

  const groups = cashFlowGroups || [];
  const customers = customersData?.data || [];
  const suppliers = suppliersData?.data || [];

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const selectedGroup = groups.find(
    (g: any) => g.id === Number(cashFlowGroupId)
  );

  const getPartnerList = () => {
    if (partnerType === "C") return customers;
    if (partnerType === "S") return suppliers;
    return [];
  };

  const filteredPartners = getPartnerList().filter((p: any) =>
    p.name.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    try {
      await createCashFlow.mutateAsync({
        code: code || undefined,
        isReceipt,
        amount: Number(amount),
        transDate,
        method:
          type === "cash" ? "cash" : type === "bank" ? "transfer" : "ewallet",
        cashFlowGroupId: cashFlowGroupId ? Number(cashFlowGroupId) : undefined,
        partnerType,
        partnerId: selectedPartner?.id,
        partnerName: selectedPartner?.name || partnerSearch || undefined,
        description,
        usedForFinancialReporting: usedForFinancialReporting ? 1 : 0,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating cashflow:", error);
      alert("Có lỗi xảy ra khi tạo phiếu thu/chi");
    }
  };

  const resetForm = () => {
    setCode("");
    setTransDate(new Date().toISOString().slice(0, 16));
    setCashFlowGroupId("");
    setPartnerType("O");
    setPartnerSearch("");
    setSelectedPartner(null);
    setAmount("");
    setDescription("");
    setUsedForFinancialReporting(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[800px] max-h-[90vh] overflow-y-auto">
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
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Tự động"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

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

            <div className="relative" ref={groupDropdownRef}>
              <label className="block text-sm font-medium mb-2">
                {isReceipt ? "Loại thu" : "Loại chi"}
              </label>
              <button
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                className="w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between">
                <span className={selectedGroup ? "" : "text-gray-400"}>
                  {selectedGroup?.name || "Chọn loại thu"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showGroupDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <input
                      type="text"
                      placeholder="Tìm kiếm"
                      className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
                    />
                  </div>
                  <div className="py-1">
                    <div className="px-3 py-2 text-xs text-gray-500 font-medium">
                      Chọn loại thu
                    </div>
                    {groups.map((group: any) => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setCashFlowGroupId(String(group.id));
                          setShowGroupDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 flex items-center justify-between">
                        <span>{group.name}</span>
                        {cashFlowGroupId === String(group.id) && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowGroupDropdown(false);
                        setShowCreateGroupModal(true);
                      }}
                      className="w-full px-3 py-2 text-sm text-left text-blue-500 hover:bg-gray-50 flex items-center gap-2 border-t">
                      <span className="text-lg">+</span>
                      <span>Tạo mới</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {isReceipt ? "Người thu" : "Người chi"}
              </label>
              <select
                value={partnerType}
                onChange={(e) => {
                  setPartnerType(e.target.value);
                  setSelectedPartner(null);
                  setPartnerSearch("");
                }}
                className="w-full px-3 py-2 border rounded-lg">
                {PARTNER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 relative" ref={partnerDropdownRef}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Tên {isReceipt ? "người nộp" : "người nhận"}
                </label>
                {(partnerType === "C" || partnerType === "S") && (
                  <button className="text-sm text-blue-500 hover:underline">
                    Tạo mới
                  </button>
                )}
              </div>
              <input
                type="text"
                value={selectedPartner?.name || partnerSearch}
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
                placeholder={`Tìm ${isReceipt ? "người nộp" : "người nhận"}`}
                className="w-full px-3 py-2 border rounded-lg"
              />

              {showPartnerDropdown && filteredPartners.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {filteredPartners.map((partner: any) => (
                    <button
                      key={partner.id}
                      onClick={() => {
                        setSelectedPartner(partner);
                        setPartnerSearch(partner.name);
                        setShowPartnerDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50">
                      {partner.name}
                      {partner.code && (
                        <span className="text-gray-400 ml-2">
                          ({partner.code})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">Số tiền</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg text-right text-lg"
                min="0"
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

            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usedForFinancialReporting}
                  onChange={(e) =>
                    setUsedForFinancialReporting(e.target.checked)
                  }
                  className="cursor-pointer"
                />
                <span className="text-sm flex items-center gap-1">
                  Hạch toán kết quả kinh doanh
                  <span
                    className="text-gray-400 cursor-help"
                    title="Thông tin thêm">
                    ⓘ
                  </span>
                </span>
              </label>
            </div>
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
