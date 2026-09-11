"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Loader2,
  Search,
  Check,
  AlertCircle,
  Building2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useCreateProductQualityTicket } from "@/lib/hooks/useProductQuality";
import { productQualityApi } from "@/lib/api/product-quality";
import { useBranchStore } from "@/lib/store/branch";
import { useSearchCustomers } from "@/lib/hooks/useCustomers";
import { useProducts } from "@/lib/hooks/useProducts";
import { invoicesApi } from "@/lib/api/invoices";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  CLASSIFICATION_OPTIONS,
  FEEDBACK_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
} from "@/lib/types/product-quality";

export function ProductQualityForm() {
  const router = useRouter();
  const { selectedBranch } = useBranchStore();
  const { data: users = [] } = useUsersForFilter();
  const createTicket = useCreateProductQualityTicket();

  // Form fields
  const [branchId, setBranchId] = useState<number | undefined>(selectedBranch?.id);
  const [decisionMakerId, setDecisionMakerId] = useState<number | undefined>();
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id?: number;
    code?: string;
    name: string;
  } | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<{
    id?: number;
    code?: string;
    name: string;
    unit?: string;
    cargoType?: string;
  } | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [quantity, setQuantity] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [initialClassification, setInitialClassification] = useState<string>(
    CLASSIFICATION_OPTIONS[0]
  );
  const [feedbackType, setFeedbackType] = useState<string>(
    FEEDBACK_TYPE_OPTIONS[0]
  );
  const [severity, setSeverity] = useState<string>("Trung");
  const [note, setNote] = useState<string>("");

  // Đồng bộ branchId khi người dùng chuyển chi nhánh ở header
  useEffect(() => {
    if (selectedBranch?.id) {
      setBranchId(selectedBranch.id);
    }
  }, [selectedBranch?.id]);

  // Hóa đơn
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [debouncedInvoiceSearch, setDebouncedInvoiceSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<{
    id: number;
    code: string;
  } | null>(null);
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // Attachments
  const [images, setImages] = useState<
    Array<{ filename: string; url: string; originalName?: string; size?: number }>
  >([]);
  const [video, setVideo] = useState<{
    filename: string;
    url: string;
    originalName?: string;
    size?: number;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Debounce customer search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // Debounce product search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductSearch(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // Debounce invoice search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedInvoiceSearch(invoiceSearch), 300);
    return () => clearTimeout(t);
  }, [invoiceSearch]);

  const { data: customerResults } = useSearchCustomers(
    debouncedCustomerSearch.length >= 1 ? debouncedCustomerSearch : undefined
  );

  const { data: productResults } = useProducts({
    search: debouncedProductSearch.length >= 1 ? debouncedProductSearch : undefined,
    branchId,
    limit: 20,
  });

  useEffect(() => {
    if (debouncedInvoiceSearch.length >= 2) {
      invoicesApi
        .getInvoices({ search: debouncedInvoiceSearch, limit: 10 })
        .then((res: any) => setInvoiceList(res.data || []))
        .catch(() => setInvoiceList([]));
    } else {
      setInvoiceList([]);
    }
  }, [debouncedInvoiceSearch]);

  // Upload images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    try {
      const { items, errors } = await productQualityApi.uploadFiles(
        Array.from(files),
        "PROOF_IMAGE"
      );
      if (items.length > 0) {
        setImages((prev) => [...prev, ...items]);
        toast.success(`Đã tải lên ${items.length} hình ảnh`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} ảnh bị lỗi: ${errors[0].reason}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Tải ảnh thất bại");
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  // Upload video
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVideo(true);
    try {
      const { items, errors } = await productQualityApi.uploadFiles(
        [file],
        "PROOF_VIDEO"
      );
      if (items.length > 0) {
        setVideo(items[0]);
        toast.success("Đã tải lên video minh chứng");
      }
      if (errors.length > 0) {
        toast.error(errors[0].reason);
      }
    } catch (err: any) {
      toast.error(err.message || "Tải video thất bại");
    } finally {
      setIsUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!branchId) {
      toast.error("Vui lòng chọn chi nhánh làm việc ở góc trên trước khi tạo phiếu");
      return;
    }
    if (!decisionMakerId) {
      toast.error("Vui lòng chọn người phụ trách chính");
      return;
    }
    if (!selectedCustomer?.name?.trim()) {
      toast.error("Vui lòng chọn hoặc nhập tên khách hàng");
      return;
    }
    if (!selectedProduct?.name?.trim()) {
      toast.error("Vui lòng chọn hoặc nhập tên sản phẩm");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("Số lượng sự cố phải lớn hơn 0");
      return;
    }
    if (!reason.trim()) {
      toast.error("Vui lòng nhập mô tả nguyên nhân sự cố");
      return;
    }
    if (images.length === 0) {
      toast.error("Vui lòng tải lên ít nhất 1 hình ảnh minh chứng sự cố");
      return;
    }

    const attachments = [
      ...images.map((img) => ({
        filename: img.filename,
        url: img.url,
        originalName: img.originalName,
        size: img.size,
        kind: "PROOF_IMAGE",
      })),
      ...(video
        ? [
            {
              filename: video.filename,
              url: video.url,
              originalName: video.originalName,
              size: video.size,
              kind: "PROOF_VIDEO",
            },
          ]
        : []),
    ];

    const selectedUser = users.find((u: any) => u.id === decisionMakerId);

    createTicket.mutate(
      {
        branchId,
        decisionMakerId,
        decisionMakerName: selectedUser?.name,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerCode: selectedCustomer.code,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productCode: selectedProduct.code,
        unit: selectedProduct.unit,
        quantity,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        reason,
        initialClassification,
        feedbackType,
        severity,
        note: note || undefined,
        invoiceId: selectedInvoice?.id,
        invoiceCode: selectedInvoice?.code,
        attachments,
      },
      {
        onSuccess: (res: any) => {
          router.push(`/san-pham/chat-luong-hang-hoa/${res.id}`);
        },
      }
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 min-w-0">
      <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Form Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/san-pham/chat-luong-hang-hoa"
              className="p-1.5 border rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Thông báo chất lượng hàng hóa
              </h1>
              <p className="text-xs text-gray-500">
                Tạo phiếu tiếp nhận sự cố hàng hóa, đính kèm hình ảnh và gửi tới người quyết định
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. Chi nhánh & Người phụ trách chính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kho / Chi nhánh phát hiện <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-800">
                <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-semibold">
                  {selectedBranch?.name || "Chưa chọn chi nhánh"}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  (Tự động theo chi nhánh POS)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Người phụ trách chính <span className="text-red-500">*</span>
              </label>
              <select
                value={decisionMakerId || ""}
                onChange={(e) =>
                  setDecisionMakerId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                required>
                <option value="">-- Chọn nhân viên phụ trách chính --</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.email ? `(${u.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Khách hàng & Sản phẩm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Khách hàng autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Khách hàng <span className="text-red-500">*</span>
              </label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2 border border-brand/50 bg-brand-soft rounded-lg text-sm">
                  <div>
                    <span className="font-semibold text-brand-dark">
                      {selectedCustomer.name}
                    </span>
                    {selectedCustomer.code && (
                      <span className="text-xs text-gray-500 ml-1.5">
                        ({selectedCustomer.code})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                    }}
                    className="text-gray-400 hover:text-red-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Gõ tên hoặc SĐT khách hàng..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                  />
                  {showCustomerDropdown && customerResults && customerResults.data.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto divide-y divide-gray-100">
                      {customerResults.data.map((c: any) => (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer({ id: c.id, code: c.code, name: c.name });
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-brand-soft flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-800">{c.name}</span>
                            {c.phone && <span className="text-gray-400 ml-1.5">· {c.phone}</span>}
                          </div>
                          <span className="text-gray-400 font-mono text-[11px]">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. Sản phẩm & Số lượng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Sản phẩm autocomplete */}
            <div className="sm:col-span-2 relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sản phẩm sự cố <span className="text-red-500">*</span>
              </label>
              {selectedProduct ? (
                <div className="flex items-center justify-between p-2 border border-brand/50 bg-brand-soft rounded-lg text-sm">
                  <div>
                    <span className="font-semibold text-brand-dark">
                      {selectedProduct.name}
                    </span>
                    {selectedProduct.code && (
                      <span className="text-xs text-gray-500 ml-1.5">
                        ({selectedProduct.code})
                      </span>
                    )}
                    {selectedProduct.unit && (
                      <span className="text-xs bg-white px-1.5 py-0.5 rounded border ml-2 text-gray-600">
                        {selectedProduct.unit}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setProductSearch("");
                    }}
                    className="text-gray-400 hover:text-red-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    placeholder="Gõ mã hoặc tên sản phẩm..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                  />
                  {showProductDropdown && productResults && productResults.data.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto divide-y divide-gray-100">
                      {productResults.data.map((p: any) => (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct({
                              id: p.id,
                              code: p.code,
                              name: p.name,
                              unit: p.unit,
                              cargoType: p.cargoType,
                            });
                            setShowProductDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-brand-soft flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-800">{p.name}</span>
                            {p.unit && <span className="text-gray-400 ml-1.5">({p.unit})</span>}
                          </div>
                          <span className="text-gray-400 font-mono text-[11px]">{p.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Số lượng */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Số lượng lỗi <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                  placeholder="Ví dụ: 2"
                />
                {selectedProduct?.unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {selectedProduct.unit}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Phân loại sự cố & Loại phản hồi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phân loại ban đầu <span className="text-red-500">*</span>
              </label>
              <select
                value={initialClassification}
                onChange={(e) => setInitialClassification(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                {CLASSIFICATION_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Loại phản hồi <span className="text-red-500">*</span>
              </label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                {FEEDBACK_TYPE_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mức độ nghiêm trọng
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand">
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Hạn sử dụng & Hóa đơn liên kết */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Hạn sử dụng in trên bao bì
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Hóa đơn liên kết */}
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Hóa đơn bán hàng liên quan (nếu có)
              </label>
              {selectedInvoice ? (
                <div className="flex items-center justify-between p-2 border border-blue-200 bg-blue-50 rounded-lg text-sm">
                  <span className="font-semibold text-blue-800">
                    {selectedInvoice.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setInvoiceSearch("");
                    }}
                    className="text-gray-400 hover:text-red-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => {
                      setInvoiceSearch(e.target.value);
                      setShowInvoiceDropdown(true);
                    }}
                    onFocus={() => setShowInvoiceDropdown(true)}
                    placeholder="Gõ mã hóa đơn (HD...)"
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                  />
                  {showInvoiceDropdown && invoiceList.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-auto divide-y divide-gray-100">
                      {invoiceList.map((inv) => (
                        <button
                          type="button"
                          key={inv.id}
                          onClick={() => {
                            setSelectedInvoice({ id: inv.id, code: inv.code });
                            setShowInvoiceDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between">
                          <span className="font-medium text-gray-800">{inv.code}</span>
                          <span className="text-gray-400">
                            {inv.customer?.name || "Khách"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5. Nguyên nhân chi tiết & Ghi chú */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mô tả hiện tượng / Nguyên nhân sự cố <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Hàng bị bung seal xì nước, trân châu nấu 10p vẫn cứng, móp hộp..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Ghi chú thêm
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: hàng cont về ngày 8/9, đã liên hệ khách..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
              />
            </div>
          </div>

          {/* 6. Minh chứng Hình ảnh & Video */}
          <div className="border-t pt-4 space-y-4">
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand" />
              Minh chứng sự cố (Hình ảnh & Video)
            </h2>

            {/* Ảnh minh chứng (Bắt buộc) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  Hình ảnh minh chứng <span className="text-red-500">*</span> (tối thiểu 1 ảnh)
                </span>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="text-xs text-brand hover:underline flex items-center gap-1 font-medium">
                  {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Thêm ảnh
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg border overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="Minh chứng" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-brand cursor-pointer transition-colors bg-gray-50/50">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-600 block font-medium">
                    Nhấn để tải lên ảnh chụp sự cố (bao bì, date, lỗi)
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Hỗ trợ JPG, PNG, HEIC
                  </span>
                </div>
              )}
            </div>

            {/* Video minh chứng (Tùy chọn) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">
                  Video minh chứng (tùy chọn)
                </span>
                {!video && (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="text-xs text-brand hover:underline flex items-center gap-1 font-medium">
                    {isUploadingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Tải video
                  </button>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </div>

              {video ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="text-xs font-medium text-gray-800 block">
                        {video.originalName || video.filename}
                      </span>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-brand hover:underline">
                        Xem video
                      </a>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideo(null)}
                    className="text-gray-400 hover:text-red-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-gray-400 cursor-pointer text-xs text-gray-500">
                  Chưa có video. Nhấn để tải video nếu lỗi cần quay clip (độ dẻo, tan bọt, vón cục...)
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending}
              className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark flex items-center gap-2 disabled:opacity-50 shadow-sm transition-colors">
              {createTicket.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang gửi thông báo...</span>
                </>
              ) : (
                <span>Gửi phiếu sự cố</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
