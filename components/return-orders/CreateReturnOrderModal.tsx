"use client";

import { useState, useRef, useEffect } from "react";
import { X, Search, ChevronDown, Camera } from "lucide-react";
import { useInvoicesForReturnOrder } from "@/lib/hooks/useInvoices";
import { useBranches } from "@/lib/hooks/useBranches";
import { useBranchStore } from "@/lib/store/branch";
import { formatCurrency, formatNumberInput } from "@/lib/utils";
import { invoicesApi } from "@/lib/api/invoices";
import { API_URL } from "@/lib/config/api";
import { useAuthStore } from "@/lib/store/auth";

interface CreateReturnOrderModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ReturnItem {
  invoiceId: number;
  invoiceCode: string;
  productId: number;
  productCode: string;
  productName: string;
  invoiceQuantity: number;
  invoicePrice: number;
  requestQuantity: number;
  returnPrice: number;
  note: string;
  saleGoodQuantity: number;
  saleDamagedQuantity: number;
  saleNearExpiryQuantity: number;
}

interface SelectedInvoice {
  id: number;
  code: string;
  customerId?: number;
  customer?: any;
  soldBy?: any;
  creator?: any;
  grandTotal: number;
  details: any[];
}

export function CreateReturnOrderModal({
  onClose,
  onSubmit,
}: CreateReturnOrderModalProps) {
  const { selectedBranch } = useBranchStore();
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState(selectedBranch?.id || 0);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoices, setSelectedInvoices] = useState<SelectedInvoice[]>(
    []
  );
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [note, setNote] = useState("");
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [branchSearchTerm, setBranchSearchTerm] = useState("");
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<
    { file?: File; preview: string; url?: string }[]
  >([]);
  const [displays, setDisplays] = useState<Record<string, string>>({});

  const { data: invoicesForReturn } = useInvoicesForReturnOrder({
    search: invoiceSearch,
    branchId: branchId > 0 ? branchId : undefined,
    limit: 20,
  });

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const token = useAuthStore.getState().token;
    const res = await fetch(`${API_URL}/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const result = await res.json();
    return result.url;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) continue; // skip > 10MB
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages((prev) => [
          ...prev,
          { file, preview: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const availableInvoices = (invoicesForReturn || []).filter(
    (inv: any) => !selectedInvoices.find((s) => s.id === inv.id)
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        invoiceDropdownRef.current &&
        !invoiceDropdownRef.current.contains(event.target as Node)
      ) {
        setShowInvoiceDropdown(false);
      }
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBranchDropdown(false);
        setBranchSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedBranchObj = (branches || []).find(
    (b: any) => b.id === branchId
  );
  const filteredBranches = (branches || []).filter((b: any) =>
    b.name.toLowerCase().includes(branchSearchTerm.toLowerCase())
  );

  const handleSelectInvoice = (invoice: any) => {
    const newSelected: SelectedInvoice = {
      id: invoice.id,
      code: invoice.code,
      customerId: invoice.customerId,
      customer: invoice.customer,
      soldBy: invoice.soldBy,
      creator: invoice.creator,
      grandTotal: Number(invoice.grandTotal),
      details: invoice.details || [],
    };

    setSelectedInvoices((prev) => [...prev, newSelected]);

    const newItems: ReturnItem[] = (invoice.details || []).map(
      (detail: any) => ({
        invoiceId: invoice.id,
        invoiceCode: invoice.code,
        productId: detail.productId,
        productCode: detail.productCode || detail.product?.code || "",
        productName: detail.productName || detail.product?.name || "",
        invoiceQuantity: Number(detail.remainingQuantity ?? detail.quantity),
        invoicePrice: Number(detail.price),
        requestQuantity: 0,
        returnPrice: Number(detail.price),
        note: "",
        saleGoodQuantity: 0,
        saleDamagedQuantity: 0,
        saleNearExpiryQuantity: 0,
      })
    );

    setReturnItems((prev) => [...prev, ...newItems]);
    setInvoiceSearch("");
    setShowInvoiceDropdown(false);
  };

  const handleRemoveInvoice = (invoiceId: number) => {
    setSelectedInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    setReturnItems((prev) =>
      prev.filter((item) => item.invoiceId !== invoiceId)
    );
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

        if (
          field === "saleGoodQuantity" ||
          field === "saleDamagedQuantity" ||
          field === "saleNearExpiryQuantity"
        ) {
          updated[field] = Math.max(0, Number(value));
          const total =
            updated.saleGoodQuantity +
            updated.saleDamagedQuantity +
            updated.saleNearExpiryQuantity;
          if (total > item.invoiceQuantity) return item;
          updated.requestQuantity = total;
        }

        return updated;
      })
    );
  };

  const totalReturnAmount = returnItems.reduce(
    (sum, item) => sum + item.returnPrice * item.requestQuantity,
    0
  );

  const getDisplay = (index: number, field: string, value: number): string => {
    const key = `${index}_${field}`;
    if (displays[key] !== undefined) return displays[key];
    return value === 0 ? "" : String(value);
  };

  const handleFieldChange = (
    index: number,
    field: keyof ReturnItem,
    rawValue: string
  ) => {
    const key = `${index}_${field}`;
    const onlyNumbers = rawValue.replace(/[^\d]/g, "");
    setDisplays((prev) => ({ ...prev, [key]: onlyNumbers }));
    const parsed = onlyNumbers === "" ? 0 : parseInt(onlyNumbers, 10);
    updateReturnItem(index, field, parsed);
  };

  const handleFieldBlur = (index: number, field: string) => {
    const key = `${index}_${field}`;
    setDisplays((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const buildSubmitData = async (isDraft: boolean) => {
    if (selectedInvoices.length === 0 || !branchId) return null;
    const validItems = returnItems.filter((item) => item.requestQuantity > 0);
    if (validItems.length === 0) return null;

    const uploadedUrls: string[] = [];
    for (const img of images) {
      if (img.file) {
        const url = await uploadFile(img.file);
        uploadedUrls.push(url);
      } else if (img.url) {
        uploadedUrls.push(img.url);
      }
    }

    return {
      invoiceIds: selectedInvoices.map((inv) => inv.id),
      branchId,
      customerId: selectedInvoices[0]?.customerId,
      note,
      isDraft,
      images: uploadedUrls.length > 0 ? uploadedUrls : undefined,
      details: validItems.map((item) => ({
        invoiceId: item.invoiceId,
        invoiceCode: item.invoiceCode,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        invoiceQuantity: item.invoiceQuantity,
        invoicePrice: item.invoicePrice,
        requestQuantity: item.requestQuantity,
        returnPrice: item.returnPrice,
        note: item.note,
        saleGoodQuantity: item.saleGoodQuantity,
        saleDamagedQuantity: item.saleDamagedQuantity,
        saleNearExpiryQuantity: item.saleNearExpiryQuantity,
      })),
    };
  };

  const handleSubmit = async () => {
    const data = await buildSubmitData(false);
    if (data) onSubmit(data);
  };

  const handleSaveDraft = async () => {
    const data = await buildSubmitData(true);
    if (data) onSubmit(data);
  };

  const groupedByInvoice = selectedInvoices.map((inv) => ({
    invoice: inv,
    items: returnItems.filter((item) => item.invoiceId === inv.id),
  }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[1100px] min-h-[70vh] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-lg font-semibold">Tạo phiếu trả hàng</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div ref={branchDropdownRef} className="relative">
              <label className="block text-sm font-medium mb-1">
                Chi nhánh nhận
              </label>
              <button
                type="button"
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className={`w-full border rounded-lg px-3 py-2 text-left flex items-center justify-between bg-white text-sm ${
                  showBranchDropdown ? "border-blue-500" : "border-gray-300"
                }`}>
                <span className={branchId ? "text-gray-900" : "text-gray-400"}>
                  {selectedBranchObj
                    ? selectedBranchObj.name
                    : "Chọn chi nhánh"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showBranchDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>
              {showBranchDropdown && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[300px] overflow-hidden">
                  <div className="p-2 border-b border-gray-200">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={branchSearchTerm}
                        onChange={(e) => setBranchSearchTerm(e.target.value)}
                        placeholder="Tìm chi nhánh..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[240px]">
                    {filteredBranches.length > 0 ? (
                      filteredBranches.map((branch: any) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => {
                            setBranchId(branch.id);
                            setShowBranchDropdown(false);
                            setBranchSearchTerm("");
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-blue-50 text-sm ${
                            branchId === branch.id
                              ? "bg-blue-100 text-blue-700"
                              : "text-gray-900"
                          }`}>
                          {branch.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-gray-500 text-center text-sm">
                        Không tìm thấy
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={invoiceDropdownRef} className="relative">
              <label className="block text-sm font-medium mb-1">
                Thêm hóa đơn
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm mã hóa đơn, tên KH..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setShowInvoiceDropdown(true);
                  }}
                  onFocus={() => setShowInvoiceDropdown(true)}
                  className="w-full px-3 py-2 border rounded-lg text-sm pr-8"
                />
                <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              {showInvoiceDropdown && availableInvoices.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
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

          {selectedInvoices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-sm">
                  <span className="font-medium">{inv.code}</span>
                  <button
                    onClick={() => handleRemoveInvoice(inv.id)}
                    className="ml-1 p-0.5 hover:bg-blue-100 rounded-full">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {groupedByInvoice.map(({ invoice, items }) => (
            <div key={invoice.id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{invoice.code}</span>
                  <span className="text-gray-500 ml-2">
                    {invoice.customer?.name || "Khách lẻ"}
                  </span>
                  <span className="text-gray-400 ml-2">
                    Người bán:{" "}
                    {invoice.soldBy?.name || invoice.creator?.name || "-"}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  Tổng HĐ: {formatCurrency(invoice.grandTotal)}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Sản phẩm</th>
                    <th className="px-2 py-2 text-right w-16">SL còn lại</th>
                    <th className="px-2 py-2 text-right w-16">Hàng tốt</th>
                    <th className="px-2 py-2 text-right w-16">Loại B</th>
                    <th className="px-2 py-2 text-right w-16">Cận date</th>
                    <th className="px-2 py-2 text-right w-20">SL trả</th>
                    <th className="px-2 py-2 text-right w-24">Giá nhập lại</th>
                    <th className="px-2 py-2 text-right w-28">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const globalIndex = returnItems.findIndex(
                      (ri) =>
                        ri.invoiceId === item.invoiceId &&
                        ri.productId === item.productId
                    );
                    const saleTotal =
                      item.saleGoodQuantity +
                      item.saleDamagedQuantity +
                      item.saleNearExpiryQuantity;
                    return (
                      <tr
                        key={`${item.invoiceId}-${item.productId}`}
                        className="border-t">
                        <td className="px-2 py-2">
                          <div className="font-medium text-sm">
                            {item.productName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.productCode}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right text-sm">
                          {item.invoiceQuantity}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="text"
                            value={getDisplay(
                              globalIndex,
                              "saleGoodQuantity",
                              item.saleGoodQuantity
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                globalIndex,
                                "saleGoodQuantity",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleFieldBlur(globalIndex, "saleGoodQuantity")
                            }
                            className="w-14 px-1 py-1 border rounded text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="text"
                            value={getDisplay(
                              globalIndex,
                              "saleDamagedQuantity",
                              item.saleDamagedQuantity
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                globalIndex,
                                "saleDamagedQuantity",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleFieldBlur(
                                globalIndex,
                                "saleDamagedQuantity"
                              )
                            }
                            className="w-14 px-1 py-1 border rounded text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="text"
                            value={getDisplay(
                              globalIndex,
                              "saleNearExpiryQuantity",
                              item.saleNearExpiryQuantity
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                globalIndex,
                                "saleNearExpiryQuantity",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleFieldBlur(
                                globalIndex,
                                "saleNearExpiryQuantity"
                              )
                            }
                            className="w-14 px-1 py-1 border rounded text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium">
                          {saleTotal || "-"}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <input
                            type="text"
                            value={formatNumberInput(
                              getDisplay(
                                globalIndex,
                                "returnPrice",
                                item.returnPrice
                              )
                            )}
                            onChange={(e) =>
                              handleFieldChange(
                                globalIndex,
                                "returnPrice",
                                e.target.value
                              )
                            }
                            onBlur={() =>
                              handleFieldBlur(globalIndex, "returnPrice")
                            }
                            className="w-20 px-1 py-1 border rounded text-right text-sm"
                          />
                        </td>
                        <td className="px-2 py-2 text-right text-sm font-medium">
                          {formatCurrency(item.returnPrice * saleTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t shrink-0">
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            maxLength={1000}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg resize-none"
            placeholder="Lý do trả hàng..."
          />
        </div>

        {/* Hình ảnh */}
        <div className="px-4 py-3 border-t shrink-0">
          <label className="block text-sm font-medium mb-2">
            Hình ảnh sản phẩm trả hàng
          </label>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20">
                <img
                  src={img.preview}
                  alt=""
                  className="w-full h-full object-cover rounded border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  ✕
                </button>
              </div>
            ))}
            <label className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-400">
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Camera className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Thêm ảnh</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50 shrink-0 rounded-b-xl">
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
              onClick={handleSaveDraft}
              disabled={
                selectedInvoices.length === 0 ||
                !branchId ||
                returnItems.filter((i) => i.requestQuantity > 0).length === 0
              }
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
              Lưu phiếu tạm
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                selectedInvoices.length === 0 ||
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
