"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Camera, Upload, ChevronDown, FileText, QrCode } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useInvoicesForPacking } from "@/lib/hooks/useInvoices";
import {
  uploadPackingSlipImages,
  uploadPackingSlipExpenseFiles,
  type UploadedExpenseFile,
} from "@/lib/hooks/usePackingSlips";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { QrUploadModal } from "@/components/shared/QrUploadModal";
import { formatCurrency } from "@/lib/utils";
import type { PackingSlip } from "@/lib/types/packing-slip";
import { toast } from "sonner";

interface PackingSlipFormProps {
  packingSlip?: PackingSlip;
  onClose: () => void;
  onSubmit: (data: any) => void;
  preselectedInvoiceIds?: number[];
  preselectedBranchId?: number | null;
}

export function PackingSlipForm({
  packingSlip,
  onClose,
  onSubmit,
  preselectedInvoiceIds = [],
  preselectedBranchId = null,
}: PackingSlipFormProps) {
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState(
    packingSlip?.branchId || preselectedBranchId || 0
  );
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>(
    packingSlip?.invoices?.map((i) => i.invoiceId) || preselectedInvoiceIds
  );

  // Cache thông tin các hóa đơn đã chọn để chip hiển thị bền vững
  // khi server filter theo search trả về list khác
  type InvoiceLite = {
    id: number;
    code: string;
    grandTotal: number;
    customer?: { id: number; name: string } | null;
  };
  const [selectedInvoiceCache, setSelectedInvoiceCache] = useState<
    Record<number, InvoiceLite>
  >(() => {
    const init: Record<number, InvoiceLite> = {};
    packingSlip?.invoices?.forEach((i) => {
      if (i.invoice) {
        init[i.invoiceId] = {
          id: i.invoice.id,
          code: i.invoice.code,
          grandTotal: i.invoice.grandTotal,
          customer: i.invoice.customer ?? null,
        };
      }
    });
    return init;
  });
  const [numberOfPackages, setNumberOfPackages] = useState(
    packingSlip?.numberOfPackages || 0
  );
  const [paymentMethod, setPaymentMethod] = useState(
    packingSlip?.paymentMethod || "transfer"
  );
  const [cashAmount, setCashAmount] = useState(
    Number(packingSlip?.cashAmount) || 0
  );
  const [note, setNote] = useState(packingSlip?.note || "");

  const [hasFeeGuiBen, setHasFeeGuiBen] = useState(
    packingSlip?.hasFeeGuiBen || false
  );
  const [feeGuiBen, setFeeGuiBen] = useState(
    Number(packingSlip?.feeGuiBen) || 0
  );
  const [hasFeeGrab, setHasFeeGrab] = useState(
    packingSlip?.hasFeeGrab || false
  );
  const [feeGrab, setFeeGrab] = useState(Number(packingSlip?.feeGrab) || 0);
  const [hasCuocGuiHang, setHasCuocGuiHang] = useState(
    packingSlip?.hasCuocGuiHang || false
  );
  const [cuocGuiHang, setCuocGuiHang] = useState(
    Number(packingSlip?.cuocGuiHang) || 0
  );

  // Người chi tiền (optional, single-select, có search)
  const [expensePayerId, setExpensePayerId] = useState<number | null>(
    packingSlip?.expensePayerId ?? null
  );
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);
  const [payerSearch, setPayerSearch] = useState("");
  const payerDropdownRef = useRef<HTMLDivElement>(null);
  const { data: users } = useUsersForFilter();
  const selectedPayer = useMemo(
    () => users?.find((u) => u.id === expensePayerId) || null,
    [users, expensePayerId]
  );
  const filteredUsers = useMemo(() => {
    const list = users || [];
    const q = payerSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, payerSearch]);

  // Chứng từ chi phí (image / pdf / doc / xls / ...)
  const [expenseFiles, setExpenseFiles] = useState<UploadedExpenseFile[]>(
    packingSlip?.expenseFiles?.map((f) => ({
      fileUrl: f.fileUrl,
      fileName: f.fileName ?? "",
      fileType: f.fileType ?? "",
      fileSize: f.fileSize ?? 0,
    })) || []
  );
  const [isUploadingExpense, setIsUploadingExpense] = useState(false);
  const [showExpenseQrModal, setShowExpenseQrModal] = useState(false);

  const handleExpenseQrUploaded = (urls: string[]) => {
    if (urls.length === 0) return;
    const mapped: UploadedExpenseFile[] = urls.map((url) => ({
      fileUrl: url,
      fileName: url.split("/").pop() || "",
      fileType: "image/*",
      fileSize: 0,
    }));
    setExpenseFiles((prev) => [...prev, ...mapped]);
  };

  const hasAnyFee = hasFeeGuiBen || hasFeeGrab || hasCuocGuiHang;

  const isImageFile = (file: UploadedExpenseFile) => {
    if (file.fileType?.startsWith("image/")) return true;
    return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.fileUrl);
  };

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, "")) || 0;
  };

  const [images, setImages] = useState<string[]>(
    packingSlip?.images?.map((img) => img.imageUrl) || []
  );
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleQrUploaded = (urls: string[]) => {
    if (urls.length > 0) {
      setImages((prev) => [...prev, ...urls]);
    }
  };

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [debouncedInvoiceSearch, setDebouncedInvoiceSearch] = useState("");
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInvoiceSearch(invoiceSearch), 300);
    return () => clearTimeout(t);
  }, [invoiceSearch]);

  const { data: invoicesData } = useInvoicesForPacking({
    branchId: branchId || undefined,
    pageSize: 100,
    search: debouncedInvoiceSearch || undefined,
  });

  const availableInvoices = invoicesData?.data || [];
  const selectedBranch = branches?.find((b) => b.id === branchId);
  const activeBranches = useMemo(
    () => (branches || []).filter((b) => b.isActive),
    [branches]
  );

  // Backfill cache cho các hóa đơn được chọn sẵn (preselect) nhưng chưa có
  // thông tin để hiển thị chip. Lấy từ list server trả về theo branch.
  useEffect(() => {
    const missing = selectedInvoiceIds.filter((id) => !selectedInvoiceCache[id]);
    if (missing.length === 0 || availableInvoices.length === 0) return;
    const found: Record<number, InvoiceLite> = {};
    for (const id of missing) {
      const inv = availableInvoices.find((i) => i.id === id);
      if (inv) {
        found[id] = {
          id: inv.id,
          code: inv.code,
          grandTotal: inv.grandTotal,
          customer: inv.customer ?? null,
        };
      }
    }
    if (Object.keys(found).length > 0) {
      setSelectedInvoiceCache((prev) => ({ ...prev, ...found }));
    }
  }, [selectedInvoiceIds, selectedInvoiceCache, availableInvoices]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBranchDropdown(false);
      }
      if (
        invoiceDropdownRef.current &&
        !invoiceDropdownRef.current.contains(event.target as Node)
      ) {
        setShowInvoiceDropdown(false);
      }
      if (
        payerDropdownRef.current &&
        !payerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPayerDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    // Reset input ngay để user có thể chọn lại cùng file nếu cần
    e.target.value = "";
    setIsUploading(true);
    try {
      const { urls, errors } = await uploadPackingSlipImages(fileList);
      if (urls.length > 0) {
        setImages((prev) => [...prev, ...urls]);
      }
      if (errors.length === 0) {
        toast.success(`Upload ${urls.length} hình thành công`);
      } else if (urls.length > 0) {
        toast.success(
          `Upload ${urls.length}/${fileList.length} hình thành công`
        );
      } else {
        toast.error("Upload hình thất bại");
      }
    } catch {
      toast.error("Upload hình thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleExpenseFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    e.target.value = "";
    setIsUploadingExpense(true);
    try {
      const { files: uploaded, errors } = await uploadPackingSlipExpenseFiles(
        fileList
      );
      if (uploaded.length > 0) {
        setExpenseFiles((prev) => [...prev, ...uploaded]);
      }
      if (errors.length === 0) {
        toast.success(`Upload ${uploaded.length} file thành công`);
      } else if (uploaded.length > 0) {
        toast.success(
          `Upload ${uploaded.length}/${fileList.length} file thành công`
        );
        // Hiển thị thông báo lỗi đầu tiên cho dễ debug
        toast.error(`${errors[0].originalname}: ${errors[0].reason}`);
      } else {
        toast.error(errors[0]?.reason || "Upload file thất bại");
      }
    } catch {
      toast.error("Upload file thất bại");
    } finally {
      setIsUploadingExpense(false);
    }
  };

  const removeExpenseFile = (index: number) => {
    setExpenseFiles(expenseFiles.filter((_, i) => i !== index));
  };

  const toggleInvoice = (invoiceId: number) => {
    if (selectedInvoiceIds.includes(invoiceId)) {
      setSelectedInvoiceIds(
        selectedInvoiceIds.filter((id) => id !== invoiceId)
      );
    } else {
      const inv = availableInvoices.find((i) => i.id === invoiceId);
      if (inv) {
        setSelectedInvoiceCache((prev) => ({
          ...prev,
          [invoiceId]: {
            id: inv.id,
            code: inv.code,
            grandTotal: inv.grandTotal,
            customer: inv.customer ?? null,
          },
        }));
      }
      setSelectedInvoiceIds([...selectedInvoiceIds, invoiceId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh");
      return;
    }

    if (selectedInvoiceIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 hóa đơn");
      return;
    }

    if (numberOfPackages <= 0) {
      toast.error("Số kiện phải lớn hơn 0");
      return;
    }

    if (paymentMethod === "cash" && cashAmount <= 0) {
      toast.error("Vui lòng nhập số tiền thanh toán");
      return;
    }

    const data = {
      branchId,
      invoiceIds: selectedInvoiceIds,
      numberOfPackages,
      paymentMethod,
      cashAmount: paymentMethod === "cash" ? cashAmount : 0,
      hasFeeGuiBen,
      feeGuiBen: hasFeeGuiBen ? feeGuiBen : 0,
      hasFeeGrab,
      feeGrab: hasFeeGrab ? feeGrab : 0,
      hasCuocGuiHang,
      cuocGuiHang: hasCuocGuiHang ? cuocGuiHang : 0,
      expensePayerId: hasAnyFee ? expensePayerId : null,
      expenseFiles: hasAnyFee ? expenseFiles : [],
      note,
      imageUrls: images,
    };

    onSubmit(data);
  };

  const selectedInvoices = selectedInvoiceIds
    .map((id) => selectedInvoiceCache[id])
    .filter(Boolean);

  // Server đã filter theo search; client không cần filter lại
  const filteredInvoices = availableInvoices;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 sm:p-6 border-b">
          <h2 className="text-xl font-semibold">
            {packingSlip ? "Cập nhật báo đơn" : "Tạo báo đơn"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mã báo đơn
                </label>
                <input
                  type="text"
                  value={packingSlip?.code || "Tự động tạo"}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div ref={branchDropdownRef}>
                <label className="block text-sm font-medium mb-2">
                  Chi nhánh <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                    className="w-full border rounded px-3 py-2 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className={!selectedBranch ? "text-gray-400" : ""}>
                      {selectedBranch ? selectedBranch.name : "Chọn chi nhánh"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {showBranchDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {activeBranches?.map((branch) => (
                        <div
                          key={branch.id}
                          onClick={() => {
                            setBranchId(branch.id);
                            setSelectedInvoiceIds([]);
                            setSelectedInvoiceCache({});
                            setShowBranchDropdown(false);
                          }}
                          className={`px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${
                            branchId === branch.id ? "bg-blue-50" : ""
                          }`}>
                          {branch.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div ref={invoiceDropdownRef} className="relative">
              <label className="block text-sm font-medium mb-2">
                Hóa đơn <span className="text-red-500">*</span>
              </label>
              <div
                className="w-full border rounded px-3 py-2 min-h-[42px] cursor-text flex flex-wrap gap-2 items-center"
                onClick={() => setShowInvoiceDropdown(true)}>
                {selectedInvoices.map((invoice) => (
                  <span
                    key={invoice.id}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {invoice.code}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleInvoice(invoice.id);
                      }}
                      className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  onFocus={() => setShowInvoiceDropdown(true)}
                  placeholder={
                    selectedInvoices.length === 0 ? "Chọn hóa đơn" : ""
                  }
                  className="flex-1 outline-none min-w-[120px] bg-transparent"
                />
              </div>

              {showInvoiceDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                  {filteredInvoices.length > 0 ? (
                    <div className="p-2">
                      {filteredInvoices.map((invoice) => (
                        <label
                          key={invoice.id}
                          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedInvoiceIds.includes(invoice.id)}
                            onChange={() => toggleInvoice(invoice.id)}
                            className="cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {invoice.code}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {invoice.customer?.name} -{" "}
                              {formatCurrency(invoice.grandTotal)}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Không tìm thấy hóa đơn
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Số kiện <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formatCurrency(numberOfPackages)}
                onChange={(e) => {
                  const value = parseFormattedNumber(e.target.value);
                  setNumberOfPackages(value);
                }}
                className="w-full border rounded px-3 py-3 sm:py-2 text-base sm:text-sm"
                min="1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hình ảnh</label>
              <div className="flex flex-wrap gap-3">
                {images.map((url, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover rounded border cursor-pointer"
                      onClick={() => setPreviewImage(url)}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                      ×
                    </button>
                  </div>
                ))}

                <label className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Upload className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Upload</span>
                </label>

                <label
                  className={`w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Chụp</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                  <QrCode className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">QR</span>
                </button>
              </div>
              {isUploading && (
                <p className="text-sm text-gray-500 mt-2">Đang upload...</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Hình thức thanh toán
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span>Chuyển khoản</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span>Tiền mặt</span>
                </label>
              </div>

              {paymentMethod === "cash" && (
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-2">
                    Số tiền
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(cashAmount)}
                    onChange={(e) => {
                      const value = parseFormattedNumber(e.target.value);
                      setCashAmount(value);
                    }}
                    className="w-full border rounded px-3 py-3 sm:py-2 text-base sm:text-sm"
                    min="0"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                maxLength={1000}
                className="w-full text-md px-2 py-1.5 border rounded disabled:bg-gray-100 resize-none"
                placeholder="Nhập ghi chú..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Chi phí</label>

              {/* Người chi tiền — single-select, có search, được phép trống */}
              <div ref={payerDropdownRef} className="relative mb-3">
                <label className="block text-xs text-gray-600 mb-1">
                  Người chi
                </label>
                <div
                  className="w-full border rounded px-3 py-2 min-h-[42px] cursor-text flex items-center gap-2"
                  onClick={() => setShowPayerDropdown(true)}>
                  {selectedPayer ? (
                    <>
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {selectedPayer.name}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpensePayerId(null);
                            setPayerSearch("");
                          }}
                          className="hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center">
                          ×
                        </button>
                      </span>
                      <input
                        type="text"
                        value={payerSearch}
                        onChange={(e) => setPayerSearch(e.target.value)}
                        onFocus={() => setShowPayerDropdown(true)}
                        placeholder=""
                        className="flex-1 outline-none min-w-[120px] bg-transparent"
                      />
                    </>
                  ) : (
                    <input
                      type="text"
                      value={payerSearch}
                      onChange={(e) => setPayerSearch(e.target.value)}
                      onFocus={() => setShowPayerDropdown(true)}
                      placeholder="Tìm và chọn người chi (tùy chọn)"
                      className="flex-1 outline-none min-w-[120px] bg-transparent"
                    />
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                </div>

                {showPayerDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-[260px] overflow-y-auto">
                    <div
                      onClick={() => {
                        setExpensePayerId(null);
                        setPayerSearch("");
                        setShowPayerDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-400 border-b">
                      Không chọn
                    </div>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setExpensePayerId(u.id);
                            setPayerSearch("");
                            setShowPayerDropdown(false);
                          }}
                          className={`px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm ${
                            expensePayerId === u.id ? "bg-blue-50" : ""
                          }`}>
                          {u.name}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Không tìm thấy người dùng
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasFeeGuiBen}
                    onChange={(e) => setHasFeeGuiBen(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>Phí gửi bến</span>
                </label>
                {hasFeeGuiBen && (
                  <input
                    type="text"
                    value={formatCurrency(feeGuiBen)}
                    onChange={(e) => {
                      const value = parseFormattedNumber(e.target.value);
                      setFeeGuiBen(value);
                    }}
                    className="w-full border rounded px-3 py-3 sm:py-2 text-base sm:text-sm"
                    placeholder="Nhập số tiền phí gửi bến"
                    min="0"
                  />
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasFeeGrab}
                    onChange={(e) => {
                      setHasFeeGrab(e.target.checked);
                    }}
                    className="cursor-pointer"
                  />
                  <span>Phí Grab</span>
                </label>
                {hasFeeGrab && (
                  <input
                    type="text"
                    value={formatCurrency(feeGrab)}
                    onChange={(e) => {
                      const value = parseFormattedNumber(e.target.value);
                      setFeeGrab(value);
                    }}
                    className="w-full border rounded px-3 py-3 sm:py-2 text-base sm:text-sm"
                    placeholder="Nhập số tiền phí Grab"
                    min="0"
                  />
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasCuocGuiHang}
                    onChange={(e) => setHasCuocGuiHang(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>Cước gửi hàng</span>
                </label>
                {hasCuocGuiHang && (
                  <input
                    type="text"
                    value={formatCurrency(cuocGuiHang)}
                    onChange={(e) => {
                      const value = parseFormattedNumber(e.target.value);
                      setCuocGuiHang(value);
                    }}
                    className="w-full border rounded px-3 py-3 sm:py-2 text-base sm:text-sm"
                    placeholder="Nhập cước gửi hàng"
                    min="0"
                  />
                )}
              </div>

              {/* Chứng từ chi phí — chỉ hiển thị khi tick ít nhất 1 phí */}
              {hasAnyFee && (
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium mb-2">
                    Chứng từ chi phí
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {expenseFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative w-24 h-24 group">
                        {isImageFile(file) ? (
                          <img
                            src={file.fileUrl}
                            alt={file.fileName || ""}
                            className="w-full h-full object-cover rounded border cursor-pointer"
                            onClick={() => setPreviewImage(file.fileUrl)}
                          />
                        ) : (
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-full rounded border bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center p-2 text-center"
                            title={file.fileName || file.fileUrl}>
                            <FileText className="w-7 h-7 text-gray-500" />
                            <span className="text-[10px] text-gray-600 mt-1 line-clamp-2 break-all">
                              {file.fileName ||
                                file.fileUrl.split("/").pop() ||
                                "File"}
                            </span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExpenseFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          ×
                        </button>
                      </div>
                    ))}

                    <label
                      className={`w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 ${
                        isUploadingExpense
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }`}>
                      <input
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar"
                        multiple
                        onChange={handleExpenseFileSelect}
                        className="hidden"
                        disabled={isUploadingExpense}
                      />
                      <Upload className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">
                        Upload
                      </span>
                    </label>

                    <label
                      className={`w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 ${
                        isUploadingExpense
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }`}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleExpenseFileSelect}
                        className="hidden"
                        disabled={isUploadingExpense}
                      />
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Chụp</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowExpenseQrModal(true)}
                      className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                      <QrCode className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">QR</span>
                    </button>
                  </div>
                  {isUploadingExpense && (
                    <p className="text-sm text-gray-500 mt-2">
                      Đang upload...
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Hỗ trợ ảnh, PDF, Word, Excel, CSV, TXT, ZIP
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        <div className="border-t p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm border rounded hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 text-base sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
            {packingSlip ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewImage(null)}>
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-2xl hover:bg-black/70">
            ×
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showQrModal && (
        <QrUploadModal
          subfolder="bao-don"
          onUploaded={handleQrUploaded}
          onClose={() => setShowQrModal(false)}
        />
      )}

      {showExpenseQrModal && (
        <QrUploadModal
          subfolder="bao-don/chi-phi"
          onUploaded={handleExpenseQrUploaded}
          onClose={() => setShowExpenseQrModal(false)}
        />
      )}
    </div>
  );
}
