"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, ChevronDown } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { uploadPackingSlipImage } from "@/lib/hooks/usePackingSlips";
import { formatCurrency } from "@/lib/utils";
import type { PackingSlip } from "@/lib/types/packing-slip";
import { toast } from "sonner";

interface PackingSlipFormProps {
  packingSlip?: PackingSlip;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function PackingSlipForm({
  packingSlip,
  onClose,
  onSubmit,
}: PackingSlipFormProps) {
  const { data: branches } = useBranches();
  const [branchId, setBranchId] = useState(packingSlip?.branchId || 0);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>(
    packingSlip?.invoices?.map((i) => i.invoiceId) || []
  );
  const [numberOfPackages, setNumberOfPackages] = useState(
    packingSlip?.numberOfPackages || 0
  );
  const [paymentMethod, setPaymentMethod] = useState(
    packingSlip?.paymentMethod || "transfer"
  );
  const [cashAmount, setCashAmount] = useState(packingSlip?.cashAmount || 0);
  const [note, setNote] = useState(packingSlip?.note || "");

  const [hasFeeGuiBen, setHasFeeGuiBen] = useState(
    packingSlip?.hasFeeGuiBen || false
  );
  const [feeGuiBen, setFeeGuiBen] = useState(packingSlip?.feeGuiBen || 0);
  const [hasFeeGrab, setHasFeeGrab] = useState(
    packingSlip?.hasFeeGrab || false
  );
  const [feeGrab, setFeeGrab] = useState(packingSlip?.feeGrab || 0);
  const [hasCuocGuiHang, setHasCuocGuiHang] = useState(
    packingSlip?.hasCuocGuiHang || false
  );
  const [cuocGuiHang, setCuocGuiHang] = useState(packingSlip?.cuocGuiHang || 0);

  const [images, setImages] = useState<string[]>(
    packingSlip?.images?.map((img) => img.imageUrl) || []
  );
  const [isUploading, setIsUploading] = useState(false);

  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  const { data: invoicesData } = useInvoices({
    branchId: branchId || undefined,
    pageSize: 100,
  });

  const availableInvoices = invoicesData?.data || [];
  const selectedBranch = branches?.find((b) => b.id === branchId);

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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await uploadPackingSlipImage(file);
      setImages([...images, url]);
      toast.success("Upload hình thành công");
    } catch (error) {
      toast.error("Upload hình thất bại");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        handleImageUpload(file);
      });
    }
  };

  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context?.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `camera-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            await handleImageUpload(file);
          }
          stream.getTracks().forEach((track) => track.stop());
        }, "image/jpeg");
      });
    } catch (error) {
      toast.error("Không thể truy cập camera");
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleInvoice = (invoiceId: number) => {
    if (selectedInvoiceIds.includes(invoiceId)) {
      setSelectedInvoiceIds(
        selectedInvoiceIds.filter((id) => id !== invoiceId)
      );
    } else {
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
      note,
      imageUrls: images,
    };

    onSubmit(data);
  };

  const selectedInvoices = availableInvoices.filter((inv) =>
    selectedInvoiceIds.includes(inv.id)
  );

  const filteredInvoices = availableInvoices.filter(
    (inv) =>
      inv.code.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {packingSlip ? "Cập nhật báo đơn" : "Tạo báo đơn"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                      {branches?.map((branch) => (
                        <div
                          key={branch.id}
                          onClick={() => {
                            setBranchId(branch.id);
                            setSelectedInvoiceIds([]);
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
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
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
                type="number"
                value={numberOfPackages}
                onChange={(e) => setNumberOfPackages(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
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
                      className="w-full h-full object-cover rounded border"
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

                <button
                  type="button"
                  onClick={handleCamera}
                  disabled={isUploading}
                  className="w-24 h-24 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 disabled:opacity-50">
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Chụp</span>
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
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="Nhập ghi chú..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Chi phí</label>
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
                    type="number"
                    value={feeGuiBen}
                    onChange={(e) => setFeeGuiBen(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 ml-6"
                    placeholder="Nhập số tiền phí gửi bến"
                    min="0"
                  />
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasFeeGrab}
                    onChange={(e) => setHasFeeGrab(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>Phí Grab</span>
                </label>
                {hasFeeGrab && (
                  <input
                    type="number"
                    value={feeGrab}
                    onChange={(e) => setFeeGrab(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 ml-6"
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
                    type="number"
                    value={cuocGuiHang}
                    onChange={(e) => setCuocGuiHang(Number(e.target.value))}
                    className="w-full border rounded px-3 py-2 ml-6"
                    placeholder="Nhập cước gửi hàng"
                    min="0"
                  />
                )}
              </div>
            </div>
          </div>
        </form>

        <div className="border-t p-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {packingSlip ? "Cập nhật" : "Tạo mới"}
          </button>
        </div>
      </div>
    </div>
  );
}
