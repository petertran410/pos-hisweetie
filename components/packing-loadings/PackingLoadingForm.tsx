"use client";

import { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, ChevronDown } from "lucide-react";
import { useBranches } from "@/lib/hooks/useBranches";
import { useInvoices } from "@/lib/hooks/useInvoices";
import { useUsers } from "@/lib/hooks/useUsers";
import { uploadPackingLoadingImage } from "@/lib/hooks/usePackingLoadings";
import { formatCurrency } from "@/lib/utils";
import type { PackingLoading } from "@/lib/types/packing-loading";
import { toast } from "sonner";

interface PackingLoadingFormProps {
  packingLoading?: PackingLoading;
  onClose: () => void;
  onSubmit: (data: any) => void;
  preselectedInvoiceIds?: number[];
  preselectedBranchId?: number | null;
}

export function PackingLoadingForm({
  packingLoading,
  onClose,
  onSubmit,
  preselectedInvoiceIds = [],
  preselectedBranchId = null,
}: PackingLoadingFormProps) {
  const { data: branches } = useBranches();
  const { data: users } = useUsers();
  const [branchId, setBranchId] = useState(
    packingLoading?.branchId || preselectedBranchId || 0
  );
  const [loadingById, setLoadingById] = useState(
    packingLoading?.loadingById || 0
  );
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>(
    packingLoading?.invoices?.map((i) => i.invoiceId) || preselectedInvoiceIds
  );

  const [numberOfPackages, setNumberOfPackages] = useState(
    packingLoading?.numberOfPackages || 0
  );
  const [note, setNote] = useState(packingLoading?.note || "");

  const parseFormattedNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, "")) || 0;
  };

  const [images, setImages] = useState<string[]>(
    packingLoading?.images?.map((img) => img.imageUrl) || []
  );
  const [isUploading, setIsUploading] = useState(false);

  const [showLoadingByDropdown, setShowLoadingByDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const loadingByDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  const { data: invoicesData } = useInvoices({
    branchId: branchId || undefined,
    pageSize: 100,
  });

  const availableInvoices = invoicesData?.data || [];
  const selectedBranch = branches?.find((b) => b.id === branchId);
  const selectedLoadingBy = users?.find((u) => u.id === loadingById);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        loadingByDropdownRef.current &&
        !loadingByDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLoadingByDropdown(false);
      }
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
      const url = await uploadPackingLoadingImage(file);
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
      const invoice = availableInvoices.find((inv) => inv.id === invoiceId);
      if (invoice) {
        if (selectedInvoiceIds.length === 0) {
          setBranchId(invoice.branchId || 0);
          setSelectedInvoiceIds([...selectedInvoiceIds, invoiceId]);
        } else {
          const firstInvoice = availableInvoices.find(
            (inv) => inv.id === selectedInvoiceIds[0]
          );
          if (firstInvoice?.branchId !== invoice.branchId) {
            toast.error("Chỉ được chọn hóa đơn cùng chi nhánh");
            return;
          }
          setSelectedInvoiceIds([...selectedInvoiceIds, invoiceId]);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!loadingById) {
      toast.error("Vui lòng chọn người loading");
      return;
    }

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

    const data = {
      branchId,
      loadingById,
      invoiceIds: selectedInvoiceIds,
      numberOfPackages,
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

  const uniqueCustomerNames = Array.from(
    new Set(
      selectedInvoices.map((inv) => inv.customer?.name).filter((name) => name)
    )
  ).join(", ");

  const purchaseDates = selectedInvoices
    .map((inv) => new Date(inv.purchaseDate).toLocaleDateString("vi-VN"))
    .join(", ");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {packingLoading ? "Cập nhật loading" : "Tạo loading"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div ref={loadingByDropdownRef} className="relative">
              <label className="block text-sm font-medium mb-2">
                Người loading <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => setShowLoadingByDropdown(!showLoadingByDropdown)}
                className="w-full border rounded px-3 py-2 cursor-pointer flex items-center justify-between">
                <span className={!selectedLoadingBy ? "text-gray-400" : ""}>
                  {selectedLoadingBy?.name || "Chọn người loading"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </div>

              {showLoadingByDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {users?.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setLoadingById(user.id);
                        setShowLoadingByDropdown(false);
                      }}
                      className={`px-4 py-2 hover:bg-gray-50 cursor-pointer ${
                        user.id === loadingById ? "bg-blue-50" : ""
                      }`}>
                      {user.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Mã loading
                </label>
                <input
                  type="text"
                  value={packingLoading?.code || "Tự động tạo"}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div ref={branchDropdownRef} className="relative">
                <label className="block text-sm font-medium mb-2">
                  Chi nhánh <span className="text-red-500">*</span>
                </label>
                <div
                  onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                  className="w-full border rounded px-3 py-2 cursor-pointer bg-gray-50 flex items-center justify-between">
                  <span className={!selectedBranch ? "text-gray-400" : ""}>
                    {selectedBranch?.name || "Chọn chi nhánh"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </div>

                {showBranchDropdown && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {branches?.map((branch) => (
                      <div
                        key={branch.id}
                        onClick={() => {
                          if (selectedInvoiceIds.length > 0) {
                            toast.error(
                              "Không thể đổi chi nhánh khi đã chọn hóa đơn"
                            );
                            return;
                          }
                          setBranchId(branch.id);
                          setShowBranchDropdown(false);
                        }}
                        className={`px-4 py-2 hover:bg-gray-50 cursor-pointer ${
                          branch.id === branchId ? "bg-blue-50" : ""
                        }`}>
                        {branch.name}
                      </div>
                    ))}
                  </div>
                )}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tên khách hàng
                </label>
                <input
                  type="text"
                  value={uniqueCustomerNames || ""}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ngày</label>
                <input
                  type="text"
                  value={purchaseDates || ""}
                  disabled
                  className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>
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
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ghi chú</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border rounded px-3 py-2"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hình ảnh</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label className="flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Chọn hình từ máy
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleCamera}
                    className="flex-1 border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50">
                    <Camera className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <span className="text-sm text-gray-600">Chụp hình</span>
                  </button>
                </div>

                {isUploading && (
                  <div className="text-center text-sm text-gray-500">
                    Đang upload...
                  </div>
                )}

                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt=""
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded hover:bg-gray-50">
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {packingLoading ? "Cập nhật" : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
