"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { useReturnOrder } from "@/lib/hooks/useReturnOrders";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";
import { formatCurrency } from "@/lib/utils";

interface ConfirmRefundModalProps {
  returnOrderId: number;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
];

export function ConfirmRefundModal({
  returnOrderId,
  onClose,
  onSubmit,
}: ConfirmRefundModalProps) {
  const { data: returnOrder, isLoading } = useReturnOrder(returnOrderId);
  const { data: bankAccounts } = useBankAccountsForPayment();
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  const methodDropdownRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  const refundAmount = Number(returnOrder?.refundAmount || 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        methodDropdownRef.current &&
        !methodDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMethodDropdown(false);
      }
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAccountDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMethodLabel =
    METHOD_OPTIONS.find((m) => m.value === method)?.label || "Tiền mặt";

  const selectedAccount = bankAccounts?.find(
    (a: any) => a.id === selectedAccountId
  );

  const handleSubmit = () => {
    onSubmit({
      note,
      method,
      accountId: method === "transfer" ? selectedAccountId : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[900px] min-h-[75vh] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">
            Xác nhận hoàn tiền - {returnOrder?.code}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Hóa đơn:</span>{" "}
                {returnOrder?.invoice?.code ||
                  [
                    ...new Set(
                      (returnOrder?.details || []).map(
                        (d: any) => d.invoiceCode
                      )
                    ),
                  ].join(", ")}
              </div>
              <div>
                <span className="text-gray-500">Khách hàng:</span>{" "}
                {returnOrder?.customer?.name || "Khách lẻ"}
              </div>
            </div>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Sản phẩm</th>
                <th className="px-3 py-2 text-right">SL xác nhận</th>
                <th className="px-3 py-2 text-right">Giá nhập lại</th>
                <th className="px-3 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {(returnOrder?.details || []).map((d: any) => (
                <tr key={d.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{d.productName}</div>
                    <div className="text-xs text-gray-500">{d.productCode}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Number(d.confirmedQuantity)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(Number(d.returnPrice))}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatCurrency(
                      Number(d.confirmedQuantity) * Number(d.returnPrice)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">
              Số tiền hoàn cho khách {formatCurrency(refundAmount)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Số tiền này sẽ được cấn trừ công nợ và tạo phiếu chi tương ứng
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div ref={methodDropdownRef} className="relative">
              <label className="block text-sm font-medium mb-1">
                Phương thức hoàn tiền
              </label>
              <button
                type="button"
                onClick={() => setShowMethodDropdown(!showMethodDropdown)}
                className={`w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between bg-white text-sm ${
                  showMethodDropdown ? "border-blue-500" : "border-gray-300"
                }`}>
                <span>{selectedMethodLabel}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showMethodDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showMethodDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  {METHOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setMethod(opt.value);
                        setShowMethodDropdown(false);
                        if (opt.value === "cash") {
                          setSelectedAccountId(null);
                        }
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-blue-50 text-sm flex items-center gap-2 ${
                        method === opt.value
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-900"
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {method === "transfer" && (
              <div ref={accountDropdownRef} className="relative">
                <label className="block text-sm font-medium mb-1">
                  Tài khoản ngân hàng
                </label>
                <button
                  type="button"
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className={`w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between bg-white text-sm ${
                    showAccountDropdown ? "border-blue-500" : "border-gray-300"
                  }`}>
                  <span
                    className={
                      selectedAccount ? "text-gray-900" : "text-gray-400"
                    }>
                    {selectedAccount
                      ? `${selectedAccount.bankCode} - ${selectedAccount.accountNumber}`
                      : "Chọn tài khoản"}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showAccountDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showAccountDropdown && (
                  <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {bankAccounts && bankAccounts.length > 0 ? (
                      bankAccounts.map((account: any) => (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(account.id);
                            setShowAccountDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 ${
                            selectedAccountId === account.id
                              ? "bg-blue-100"
                              : ""
                          }`}>
                          <div className="font-medium text-sm">
                            {account.bankCode} - {account.accountNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {account.accountHolder}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        Chưa có tài khoản ngân hàng
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t shrink-0">
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 shrink-0 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            Xác nhận hoàn tiền & Hoàn thành
          </button>
        </div>
      </div>
    </div>
  );
}
