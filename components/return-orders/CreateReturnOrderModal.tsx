"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency } from "@/lib/utils";
import { invoicesApi } from "@/lib/api/invoices";

interface CreateReturnOrderModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ReturnItem {
  productId: number;
  productCode: string;
  productName: string;
  invoiceQuantity: number;
  invoicePrice: number;
  requestQuantity: number;
  returnPrice: number;
  note: string;
}

export function CreateReturnOrderModal({
  onClose,
  onSubmit,
}: CreateReturnOrderModalProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState(selectedBranch?.id || 0);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [note, setNote] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  const { data: invoicesData } = useInvoices({
    search: invoiceSearch,
    limit: 20,
    status: 1,
  });

  const availableInvoices = invoicesData?.data || [];

  const handleSelectInvoice = async (invoice: any) => {
    try {
      const fullInvoice = await invoicesApi.getInvoice(invoice.id);
      setSelectedInvoice(fullInvoice);

      const items: ReturnItem[] = (fullInvoice.details || []).map(
        (detail: any) => ({
          productId: detail.productId,
          productCode: detail.productCode || detail.product?.code || "",
          productName: detail.productName || detail.product?.name || "",
          invoiceQuantity: Number(detail.quantity),
          invoicePrice: Number(detail.price),
          requestQuantity: Number(detail.quantity),
          returnPrice: Number(detail.price),
          note: "",
        })
      );

      setReturnItems(items);
      setShowInvoiceDropdown(false);
      setInvoiceSearch("");
    } catch (error) {
      console.error("Error loading invoice:", error);
    }
  };

  const updateReturnItem = (
    index: number,
    field: keyof ReturnItem,
    value: any
  ) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;

        const updated = { ...item, [field]: value };

        if (field === "requestQuantity") {
          const qty = Math.min(
            Math.max(0, Number(value)),
            item.invoiceQuantity
          );
          updated.requestQuantity = qty;
        }

        return updated;
      })
    );
  };

  const totalReturnAmount = returnItems.reduce(
    (sum, item) => sum + item.returnPrice * item.requestQuantity,
    0
  );

  const handleSubmit = () => {
    if (!selectedInvoice) return;

    const validItems = returnItems.filter((item) => item.requestQuantity > 0);
    if (validItems.length === 0) return;

    onSubmit({
      invoiceId: selectedInvoice.id,
      branchId,
      note,
      details: validItems.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        invoiceQuantity: item.invoiceQuantity,
        invoicePrice: item.invoicePrice,
        requestQuantity: item.requestQuantity,
        returnPrice: item.returnPrice,
        note: item.note,
      })),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[900px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Tạo phiếu trả hàng</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Chi nhánh nhận
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value={0}>Chọn chi nhánh</option>
                {(branches || []).map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-1">
                Chọn hóa đơn
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm mã hóa đơn..."
                  value={
                    selectedInvoice
                      ? `${selectedInvoice.code} - ${selectedInvoice.customer?.name || "Khách lẻ"}`
                      : invoiceSearch
                  }
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setSelectedInvoice(null);
                    setShowInvoiceDropdown(true);
                  }}
                  onFocus={() => setShowInvoiceDropdown(true)}
                  className="w-full px-3 py-2 border rounded-lg text-sm pr-8"
                />
                <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              {showInvoiceDropdown && availableInvoices.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {availableInvoices.map((inv: any) => (
                    <button
                      key={inv.id}
                      onClick={() => handleSelectInvoice(inv)}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-gray-50 border-b last:border-0">
                      <div className="font-medium">{inv.code}</div>
                      <div className="text-xs text-gray-500">
                        {inv.customer?.name || "Khách lẻ"} -{" "}
                        {formatCurrency(Number(inv.grandTotal))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedInvoice && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-500">Khách hàng:</span>{" "}
                  {selectedInvoice.customer?.name || "Khách lẻ"}
                </div>
                <div>
                  <span className="text-gray-500">Người bán:</span>{" "}
                  {selectedInvoice.soldBy?.name ||
                    selectedInvoice.creator?.name}
                </div>
                <div>
                  <span className="text-gray-500">Tổng HĐ:</span>{" "}
                  {formatCurrency(Number(selectedInvoice.grandTotal))}
                </div>
              </div>
            </div>
          )}

          {returnItems.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">
                Sản phẩm trả ({returnItems.length})
              </h3>
              <table className="w-full text-sm border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Sản phẩm</th>
                    <th className="px-3 py-2 text-right w-24">SL trên HĐ</th>
                    <th className="px-3 py-2 text-right w-24">SL trả</th>
                    <th className="px-3 py-2 text-right w-32">Giá trên HĐ</th>
                    <th className="px-3 py-2 text-right w-32">Giá nhập lại</th>
                    <th className="px-3 py-2 text-right w-32">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {returnItems.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-gray-500">
                          {item.productCode}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.invoiceQuantity}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={item.invoiceQuantity}
                          value={item.requestQuantity}
                          onChange={(e) =>
                            updateReturnItem(
                              idx,
                              "requestQuantity",
                              Number(e.target.value)
                            )
                          }
                          className="w-20 px-2 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(item.invoicePrice)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          value={item.returnPrice}
                          onChange={(e) =>
                            updateReturnItem(
                              idx,
                              "returnPrice",
                              Number(e.target.value)
                            )
                          }
                          className="w-28 px-2 py-1 border rounded text-right text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(
                          item.returnPrice * item.requestQuantity
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Lý do trả hàng..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm">
            <span className="text-gray-500">Tổng tiền trả: </span>
            <span className="text-lg font-bold text-red-600">
              {formatCurrency(totalReturnAmount)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                !selectedInvoice ||
                !branchId ||
                returnItems.filter((i) => i.requestQuantity > 0).length === 0
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              Tạo phiếu trả hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
