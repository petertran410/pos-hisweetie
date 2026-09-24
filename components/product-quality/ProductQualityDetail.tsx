"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  Package,
  FileText,
  Image as ImageIcon,
  Video,
  Building2,
  Send,
  CheckSquare,
  XCircle,
  Upload,
  Loader2,
  ExternalLink,
  Plus,
  X,
  RotateCcw,
  Factory,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProductQualityTicket,
  useAssignProductQualityTicket,
  useUpdateProductQualityTask,
  useCloseProductQualityTicket,
  useMoveToRemediatingProductQualityTicket,
  useProductQualityFactorySearch,
  useProductQualityInvoiceSearch,
} from "@/lib/hooks/useProductQuality";
import { productQualityApi } from "@/lib/api/product-quality";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "@/components/shared/CodeLink";
import {
  type ProductQualityTicket,
  type ProductQualityTask,
  DEPARTMENT_OPTIONS,
  RESPONSIBILITY_OPTIONS,
  QUALITY_STATUS_CONFIG,
} from "@/lib/types/product-quality";

interface ProductQualityDetailProps {
  ticketId: number;
}

const QUALITY_STAGES = [
  { key: "NEW", label: "Tạo mới" },
  { key: "IN_PROGRESS", label: "Đang xử lý" },
  { key: "REMEDIATING", label: "Đang khắc phục" },
  { key: "COMPLETED", label: "Hoàn thành" },
] as const;

/** Ảnh minh chứng: mimetype là ảnh, hoặc thiếu mimetype và không phải video. */
function isImageAttachment(a: {
  kind?: string | null;
  mimetype?: string | null;
}): boolean {
  const mime = (a.mimetype || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("video/")) return false;
  return a.kind !== "PROOF_VIDEO";
}

/**
 * Thumbnail video: dùng chính thẻ <video> với media fragment #t=0.1 để trình
 * duyệt hiển thị khung hình đầu, kèm nút play overlay.
 */
function VideoThumbnail({
  url,
  className,
  badgeClassName,
}: {
  url: string;
  className?: string;
  badgeClassName?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-gray-900 ${className ?? ""}`}>
      <video
        src={`${url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/25">
        <span
          className={`rounded-full bg-white/90 flex items-center justify-center ${
            badgeClassName ?? "w-7 h-7"
          }`}>
          <Video className="w-3.5 h-3.5 text-gray-800" />
        </span>
      </span>
    </div>
  );
}

export function ProductQualityDetail({ ticketId }: ProductQualityDetailProps) {
  const { data: ticket, isLoading } = useProductQualityTicket(ticketId);

  const canAssign = usePermission("product_quality", "assign");
  const canComplete = usePermission("product_quality", "complete");
  const canClose = usePermission("product_quality", "close");

  const assignMutation = useAssignProductQualityTicket();
  const moveToRemediatingMutation = useMoveToRemediatingProductQualityTicket();
  const updateTaskMutation = useUpdateProductQualityTask();
  const closeMutation = useCloseProductQualityTicket();

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [selectedVideoPreview, setSelectedVideoPreview] = useState<string | null>(null);

  // Assign form state
  const [handlingDirection, setHandlingDirection] = useState("");
  const [assignedDepts, setAssignedDepts] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [severity, setSeverity] = useState("");
  const [factoryId, setFactoryId] = useState<number | undefined>(undefined);
  const [factorySearch, setFactorySearch] = useState("");
  const [showFactoryDropdown, setShowFactoryDropdown] = useState(false);
  const factoryDropdownRef = useRef<HTMLDivElement>(null);
  const [outboundInvoiceId, setOutboundInvoiceId] = useState<number | undefined>(
    undefined
  );
  const [outboundInvoiceSearch, setOutboundInvoiceSearch] = useState("");
  const [showOutboundInvoiceDropdown, setShowOutboundInvoiceDropdown] =
    useState(false);
  const outboundInvoiceDropdownRef = useRef<HTMLDivElement>(null);

  // Menu nhanh "Cập nhật kết quả" ở thanh tiêu đề (khi có nhiều bộ phận).
  const [showQuickTaskMenu, setShowQuickTaskMenu] = useState(false);
  const quickTaskMenuRef = useRef<HTMLDivElement>(null);

  // Chỉnh sửa hiện tượng / ghi chú / minh chứng ngay trong bước xử lý
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [newAttachments, setNewAttachments] = useState<
    Array<{
      filename: string;
      url: string;
      originalName?: string;
      mimetype?: string;
      size?: number;
      kind: string;
      localId: number;
    }>
  >([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<number[]>([]);
  const [isUploadingProcessingFiles, setIsUploadingProcessingFiles] =
    useState(false);
  const newAttachmentSeq = useRef(0);
  const processingImageInputRef = useRef<HTMLInputElement>(null);
  const processingVideoInputRef = useRef<HTMLInputElement>(null);

  const factorySearchResult = useProductQualityFactorySearch(factorySearch, {
    enabled: showFactoryDropdown,
  });
  const outboundInvoiceSearchResult = useProductQualityInvoiceSearch({
    search: outboundInvoiceSearch,
    enabled: showOutboundInvoiceDropdown,
  });
  const factoryOptions = factorySearchResult.data?.data ?? [];
  const outboundInvoiceOptions = outboundInvoiceSearchResult.data?.data ?? [];

  // Chỉ hiển thị nhiệm vụ của các bộ phận thực sự được giao.
  const assignedDepartmentList = useMemo(
    () =>
      (ticket?.assignedDepartments ?? []).filter((d) =>
        (DEPARTMENT_OPTIONS as readonly string[]).includes(d)
      ),
    [ticket?.assignedDepartments]
  );

  // Danh sách mã hóa đơn bán hàng liên quan (ưu tiên quan hệ nhiều-nhiều).
  const relatedInvoiceCodes = useMemo(() => {
    const fromRelation = (ticket?.relatedInvoices ?? [])
      .map((r) => r.invoice?.code)
      .filter((c): c is string => !!c);
    if (fromRelation.length > 0) return fromRelation;
    return (ticket?.invoiceCode || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }, [ticket?.relatedInvoices, ticket?.invoiceCode]);

  const existingImages = useMemo(
    () =>
      (ticket?.attachments ?? []).filter(
        (a) => a.kind !== "COMPLETION_PROOF" && isImageAttachment(a)
      ),
    [ticket?.attachments]
  );
  const existingVideos = useMemo(
    () =>
      (ticket?.attachments ?? []).filter(
        (a) => a.kind !== "COMPLETION_PROOF" && !isImageAttachment(a)
      ),
    [ticket?.attachments]
  );
  const newProcessingImages = newAttachments.filter(
    (a) => a.kind === "PROOF_IMAGE"
  );
  const newProcessingVideos = newAttachments.filter(
    (a) => a.kind === "PROOF_VIDEO"
  );

  // Chứng từ hoàn thành đã lưu của bộ phận đang mở trong modal nhiệm vụ.
  const existingCompletionAttachments = (ticket?.attachments ?? []).filter(
    (a) => a.kind === "COMPLETION_PROOF" && a.department === showTaskModal
  );

  // Đóng dropdown nhà máy / hóa đơn xuất bù khi click ra ngoài.
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        factoryDropdownRef.current &&
        !factoryDropdownRef.current.contains(target)
      ) {
        setShowFactoryDropdown(false);
      }
      if (
        outboundInvoiceDropdownRef.current &&
        !outboundInvoiceDropdownRef.current.contains(target)
      ) {
        setShowOutboundInvoiceDropdown(false);
      }
      if (
        quickTaskMenuRef.current &&
        !quickTaskMenuRef.current.contains(target)
      ) {
        setShowQuickTaskMenu(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // Task form state
  const [taskFeedback, setTaskFeedback] = useState("");
  const [taskIsCompleted, setTaskIsCompleted] = useState(false);
  const [taskAttachments, setTaskAttachments] = useState<any[]>([]);
  const [isUploadingTaskFile, setIsUploadingTaskFile] = useState(false);
  const taskFileInputRef = useRef<HTMLInputElement>(null);

  // Close form state
  const [closeReason, setCloseReason] = useState("");

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand mb-2" />
        <span>Đang tải thông tin phiếu sự cố...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-gray-400">
        <AlertTriangle className="w-8 h-8 text-yellow-500 mb-2" />
        <span className="font-medium text-gray-700">Không tìm thấy phiếu sự cố</span>
        <Link href="/san-pham/chat-luong-hang-hoa" className="mt-3 text-sm text-brand hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const st = QUALITY_STATUS_CONFIG[ticket.status] || QUALITY_STATUS_CONFIG.NEW;
  const isOverdue =
    ticket.status !== "COMPLETED" &&
    ticket.status !== "ENDED" &&
    ticket.dueAt &&
    new Date(ticket.dueAt).getTime() < Date.now();

  // Open Assign Modal
  const handleOpenAssign = () => {
    setHandlingDirection(ticket.handlingDirection || "");
    // Không mặc định chọn cả 4 bộ phận: chỉ giữ các bộ phận đã giao trước đó.
    setAssignedDepts(
      ticket.assignedDepartments?.length > 0
        ? [...ticket.assignedDepartments]
        : []
    );
    setSeverity(ticket.severity || "Trung");
    setResponsibilities(ticket.responsibilities || []);
    setFactoryId(ticket.factoryId || undefined);
    setFactorySearch(ticket.factoryName || "");
    setOutboundInvoiceId(ticket.outboundInvoiceId || undefined);
    setOutboundInvoiceSearch(ticket.outboundInvoiceCode || "");
    setReason(ticket.reason || "");
    setNote(ticket.note || "");
    setNewAttachments([]);
    setRemovedAttachmentIds([]);
    setSelectedImagePreview(null);
    setSelectedVideoPreview(null);
    setShowAssignModal(true);
  };

  // Tải ảnh/video mới trong bước cập nhật hướng xử lý
  const handleUploadProcessingFiles = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "PROOF_IMAGE" | "PROOF_VIDEO"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingProcessingFiles(true);
    try {
      const { items, errors } = await productQualityApi.uploadFiles(
        Array.from(files),
        kind
      );
      if (items.length > 0) {
        setNewAttachments((prev) => [
          ...prev,
          ...items.map((it) => ({ ...it, kind, localId: ++newAttachmentSeq.current })),
        ]);
        toast.success(`Đã tải lên ${items.length} tệp minh chứng`);
      }
      if (errors.length > 0) {
        toast.error(errors[0].reason);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Tải tệp minh chứng thất bại"
      );
    } finally {
      setIsUploadingProcessingFiles(false);
      e.target.value = "";
    }
  };

  const toggleRemoveAttachment = (attachmentId: number) => {
    setRemovedAttachmentIds((prev) =>
      prev.includes(attachmentId)
        ? prev.filter((id) => id !== attachmentId)
        : [...prev, attachmentId]
    );
  };

  // Submit Assign Modal
  const handleSaveAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handlingDirection.trim()) {
      toast.error("Vui lòng nhập hướng xử lý");
      return;
    }
    if (assignedDepts.length === 0) {
      toast.error("Vui lòng chọn ít nhất một bộ phận thực hiện");
      return;
    }
    assignMutation.mutate(
      {
        id: ticket.id,
        data: {
          handlingDirection,
          assignedDepartments: assignedDepts,
          responsibilities,
          severity,
          factoryId,
          outboundInvoiceId,
          reason,
          note,
          removeAttachmentIds: removedAttachmentIds,
          attachments: newAttachments.map((a) => ({
            filename: a.filename,
            url: a.url,
            originalName: a.originalName,
            mimetype: a.mimetype,
            size: a.size,
            kind: a.kind,
          })),
        },
      },
      {
        onSuccess: () => setShowAssignModal(false),
      }
    );
  };

  // Chuyển phiếu sang giai đoạn Đang khắc phục
  const handleMoveToRemediating = () => {
    if (!ticket.handlingDirection?.trim()) {
      toast.error("Vui lòng nhập hướng xử lý trước khi chuyển sang Đang khắc phục");
      return;
    }
    if (!ticket.assignedDepartments || ticket.assignedDepartments.length === 0) {
      toast.error("Vui lòng chọn ít nhất một bộ phận thực hiện");
      return;
    }
    moveToRemediatingMutation.mutate(ticket.id);
  };

  // Open Task Modal
  const handleOpenTask = (dept: string) => {
    const currentTask = ticket.tasks?.find((t) => t.department === dept);
    setTaskFeedback(currentTask?.feedback || "");
    setTaskIsCompleted(currentTask?.isCompleted ?? false);
    setTaskAttachments([]);
    setShowTaskModal(dept);
  };

  // Upload Task file
  const handleTaskFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingTaskFile(true);
    try {
      const { items, errors } = await productQualityApi.uploadFiles(
        Array.from(files),
        "COMPLETION_PROOF",
        showTaskModal || undefined
      );
      if (items.length > 0) {
        setTaskAttachments((prev) => [...prev, ...items]);
        toast.success(`Đã tải lên ${items.length} tệp đính kèm`);
      }
      if (errors.length > 0) {
        toast.error(errors[0].reason);
      }
    } catch (err: any) {
      toast.error(err.message || "Tải tệp thất bại");
    } finally {
      setIsUploadingTaskFile(false);
      if (taskFileInputRef.current) taskFileInputRef.current.value = "";
    }
  };

  // Submit Task Modal
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTaskModal) return;
    if (taskIsCompleted) {
      const existingImages = (ticket.attachments || []).filter(
        (a) => a.department === showTaskModal && isImageAttachment(a)
      );
      const newImages = taskAttachments.filter(isImageAttachment);
      if (existingImages.length === 0 && newImages.length === 0) {
        toast.error(
          `Vui lòng tải lên ít nhất 1 hình ảnh minh chứng hoàn thành cho bộ phận ${showTaskModal}`
        );
        return;
      }
    }
    updateTaskMutation.mutate(
      {
        id: ticket.id,
        department: showTaskModal,
        data: {
          feedback: taskFeedback,
          isCompleted: taskIsCompleted,
          attachments: taskAttachments,
        },
      },
      {
        onSuccess: () => setShowTaskModal(null),
      }
    );
  };

  // Submit Close
  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy phiếu");
      return;
    }
    closeMutation.mutate(
      { id: ticket.id, reason: closeReason },
      {
        onSuccess: () => setShowCloseModal(false),
      }
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 p-6 min-w-0">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 1. Header Toolbar */}
        <div className="bg-white rounded-xl border p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/san-pham/chat-luong-hang-hoa"
              className="p-2 border rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{ticket.code}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${st.badgeCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dotCls}`} />
                  {st.label}
                </span>
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Quá hạn xử lý 5 ngày
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tạo ngày{" "}
                {new Date(ticket.createdAt).toLocaleString("vi-VN")} bởi{" "}
                <strong className="text-gray-700">{ticket.createdByName || "Nhân viên"}</strong>
                {ticket.branch && <span> · Chi nhánh {ticket.branch.name}</span>}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {canAssign && ticket.status !== "ENDED" && (
              <button
                onClick={handleOpenAssign}
                className="px-3.5 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark flex items-center gap-1.5 transition-colors shadow-sm">
                <CheckSquare className="w-4 h-4" />
                {ticket.status === "NEW"
                  ? "Nhập hướng xử lý"
                  : "Sửa hướng xử lý"}
              </button>
            )}

            {canComplete &&
              ["REMEDIATING", "COMPLETED"].includes(ticket.status) &&
              assignedDepartmentList.length > 0 && (
                <div className="relative" ref={quickTaskMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (assignedDepartmentList.length === 1) {
                        handleOpenTask(assignedDepartmentList[0]);
                        return;
                      }
                      setShowQuickTaskMenu((prev) => !prev);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-sm">
                    <CheckSquare className="w-4 h-4" />
                    Cập nhật kết quả
                    {assignedDepartmentList.length > 1 && (
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showQuickTaskMenu ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {showQuickTaskMenu && assignedDepartmentList.length > 1 && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white border rounded-lg shadow-xl z-40 overflow-hidden divide-y divide-gray-100">
                      {assignedDepartmentList.map((dept) => {
                        const task = ticket.tasks?.find(
                          (t) => t.department === dept
                        );
                        const isDone = !!task?.isCompleted;
                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => {
                              setShowQuickTaskMenu(false);
                              handleOpenTask(dept);
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs hover:bg-brand-soft/70 flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800 truncate">
                              {dept}
                            </span>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isDone
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                              {isDone ? "Đã xong" : "Chờ xử lý"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            {canAssign && ticket.status === "IN_PROGRESS" && (
              <button
                onClick={handleMoveToRemediating}
                disabled={moveToRemediatingMutation.isPending}
                className="px-3.5 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-60 flex items-center gap-1.5 transition-colors shadow-sm">
                {moveToRemediatingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Chuyển sang Đang khắc phục
              </button>
            )}

            {canClose &&
              ["NEW", "IN_PROGRESS", "REMEDIATING"].includes(ticket.status) && (
              <button
                onClick={() => {
                  setCloseReason("");
                  setShowCloseModal(true);
                }}
                className="px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Hủy phiếu
              </button>
            )}
          </div>
        </div>

        {/* Thanh tiến trình 4 giai đoạn */}
        <div className="bg-white rounded-xl border px-5 py-4 shadow-sm">
          <div className="flex items-center overflow-x-auto">
            {QUALITY_STAGES.map((stage, idx) => {
              const activeIndex = QUALITY_STAGES.findIndex(
                (s) => s.key === ticket.status
              );
              const isDone = activeIndex >= 0 && idx < activeIndex;
              const isActive = idx === activeIndex;
              return (
                <div
                  key={stage.key}
                  className="flex items-center flex-1 last:flex-none min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border ${
                        isDone
                          ? "bg-brand text-white border-brand"
                          : isActive
                          ? "bg-brand-soft text-brand border-brand"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}>
                      {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isDone || isActive ? "text-gray-900" : "text-gray-400"
                      }`}>
                      {stage.label}
                    </span>
                  </div>
                  {idx < QUALITY_STAGES.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 min-w-6 ${
                        isDone ? "bg-brand" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {ticket.status === "ENDED" && (
            <div className="mt-2 text-xs text-gray-500">
              Phiếu đã hủy. Lý do: {ticket.closeReason || "—"}
            </div>
          )}
        </div>

        {/* 2. Grid Overview: Thông tin sự cố + Hướng xử lý & SLA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left 2 Cols: Thông tin sự cố chi tiết */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-brand" />
                Thông tin sự cố hàng hóa
              </h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block">Kho / Chi nhánh phát hiện</span>
                  <span className="font-medium text-gray-800">
                    {ticket.branch?.name || ticket.branchName || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Khách hàng</span>
                  <div className="font-semibold text-gray-800 mt-0.5">
                    {ticket.customer ? (
                      <CodeLink
                        entity="customer"
                        code={ticket.customer.code || ""}
                        label={ticket.customerName}
                      />
                    ) : (
                      ticket.customerName
                    )}
                  </div>
                  {ticket.customer?.phone && (
                    <span className="text-xs text-gray-500">{ticket.customer.phone}</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Sản phẩm lỗi</span>
                  <div className="font-semibold text-gray-800 mt-0.5">
                    {ticket.product ? (
                      <CodeLink
                        entity="product"
                        code={ticket.product.code || ""}
                        label={ticket.productName}
                      />
                    ) : (
                      ticket.productName
                    )}
                  </div>
                  {ticket.sourceType && (
                    <span className="text-xs text-gray-400 block">{ticket.sourceType}</span>
                  )}
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Số lượng</span>
                  <span className="text-base font-bold text-red-600">
                    {Number(ticket.quantity)} {ticket.unit || ""}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Hạn sử dụng bao bì</span>
                  <span className="font-medium text-gray-800">
                    {ticket.expiryDate
                      ? new Date(ticket.expiryDate).toLocaleDateString("vi-VN")
                      : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Phân loại sự cố ban đầu</span>
                  <span className="font-medium text-gray-800">{ticket.initialClassification}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Loại phản hồi</span>
                  <span className="font-medium text-gray-800">{ticket.feedbackType}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Mức độ nghiêm trọng</span>
                  <span
                    className={`font-semibold text-xs px-2 py-0.5 rounded ${
                      ticket.severity === "Cao"
                        ? "bg-red-100 text-red-700"
                        : ticket.severity === "Trung"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                    {ticket.severity || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Nhà máy sản xuất</span>
                  <span className="font-medium text-gray-800">{ticket.factoryName || "—"}</span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Trách nhiệm thuộc về</span>
                  <span className="font-medium text-gray-800">
                    {ticket.responsibilities?.length
                      ? ticket.responsibilities.join(", ")
                      : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-gray-400 block">Nguồn hàng</span>
                  <span className="font-medium text-gray-800">{ticket.sourceType || "—"}</span>
                </div>

                {relatedInvoiceCodes.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 block">Hóa đơn mua hàng</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {relatedInvoiceCodes.map((code) => (
                        <CodeLink key={code} entity="invoice" code={code} />
                      ))}
                    </div>
                  </div>
                )}

                {ticket.outboundInvoiceCode && (
                  <div>
                    <span className="text-xs text-gray-400 block">Hóa đơn xuất bù / đổi</span>
                    <CodeLink entity="invoice" code={ticket.outboundInvoiceCode} />
                  </div>
                )}
              </div>

              {/* Hiện tượng / Nguyên nhân */}
              <div className="border-t pt-3">
                <span className="text-xs font-semibold text-gray-500 block mb-1">
                  Hiện tượng & Nguyên nhân sự cố:
                </span>
                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {ticket.reason || "Không có mô tả nguyên nhân."}
                </p>
              </div>

              {ticket.note && (
                <div className="text-xs text-gray-500 italic">
                  Ghi chú: {ticket.note}
                </div>
              )}
            </div>

            {/* Minh chứng ảnh & video */}
            <div className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand" />
                Hình ảnh & Video minh chứng
              </h2>

              {ticket.attachments?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {ticket.attachments.map((att) => {
                    const isVid = att.kind === "PROOF_VIDEO" || att.mimetype?.startsWith("video");
                    return (
                      <div
                        key={att.id}
                        onClick={() =>
                          isVid
                            ? setSelectedVideoPreview(att.url)
                            : setSelectedImagePreview(att.url)
                        }
                        className="relative group aspect-square rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer">
                        {isVid ? (
                          <VideoThumbnail
                            url={att.url}
                            className="w-full h-full transition-transform group-hover:scale-105"
                            badgeClassName="w-9 h-9"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={att.url}
                            alt={att.originalName || "Minh chứng"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        )}
                        {att.department && (
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {att.department}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400 py-6 text-center">
                  Chưa có ảnh hoặc video đính kèm.
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Hướng xử lý, người quyết định & SLA */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-5 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand" />
                Hướng xử lý & Tiến độ SLA
              </h2>

              <div>
                <span className="text-xs text-gray-400 block">Người quyết định</span>
                <div className="font-semibold text-gray-800 text-sm mt-0.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  {ticket.decisionMakerName || "Chưa phân công"}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 block">Hướng xử lý đã chốt</span>
                {ticket.handlingDirection ? (
                  <div className="text-sm font-medium text-gray-900 bg-amber-50/70 border border-amber-200/80 p-3 rounded-lg mt-1 whitespace-pre-wrap leading-relaxed">
                    {ticket.handlingDirection}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg mt-1">
                    Chưa có hướng xử lý từ người quyết định.
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Ngày có xử lý:</span>
                  <span className="font-medium text-gray-700">
                    {ticket.handledAt
                      ? new Date(ticket.handledAt).toLocaleString("vi-VN")
                      : "Chưa có"}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Hạn SLA (5 ngày):</span>
                  <span
                    className={`font-semibold ${
                      isOverdue ? "text-red-600" : "text-gray-800"
                    }`}>
                    {ticket.dueAt
                      ? new Date(ticket.dueAt).toLocaleDateString("vi-VN")
                      : "—"}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Thời gian hoàn thành:</span>
                  <span className="font-medium text-green-700">
                    {ticket.completedAt
                      ? new Date(ticket.completedAt).toLocaleString("vi-VN")
                      : "Chưa hoàn thành"}
                  </span>
                </div>

                {ticket.status === "ENDED" && (
                  <div className="pt-2 border-t space-y-1">
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Người hủy:</span>
                      <span className="font-medium text-gray-700">
                        {ticket.closer?.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-gray-400">Thời gian hủy:</span>
                      <span className="font-medium text-gray-700">
                        {ticket.closedAt
                          ? new Date(ticket.closedAt).toLocaleString("vi-VN")
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-red-500 font-medium block">Lý do hủy:</span>
                      <span className="text-gray-700">{ticket.closeReason || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bộ phận xử lý — nằm ngay dưới Hướng xử lý & Tiến độ SLA */}
            <div className="bg-white rounded-xl border p-5 space-y-3 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand" />
                Bộ phận xử lý
              </h2>

              {assignedDepartmentList.length === 0 ? (
                <div className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-lg">
                  Chưa giao bộ phận nào.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {assignedDepartmentList.map((dept) => {
                      const task = ticket.tasks?.find(
                        (t) => t.department === dept
                      );
                      const isDone = !!task?.isCompleted;
                      const deptProofs = (ticket.attachments ?? []).filter(
                        (a) =>
                          a.department === dept &&
                          a.kind === "COMPLETION_PROOF"
                      );
                      return (
                        <div
                          key={dept}
                          className="text-xs space-y-1.5 border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isDone ? "bg-green-500" : "bg-amber-500"
                                }`}
                              />
                              <span className="font-medium text-gray-800 truncate">
                                {dept}
                              </span>
                            </span>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full font-medium ${
                                isDone
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                              {isDone ? "Đã xong" : "Chờ xử lý"}
                            </span>
                          </div>

                          {task?.feedback ? (
                            <p className="text-[11px] text-gray-600 bg-gray-50 rounded p-2 whitespace-pre-wrap">
                              {task.feedback}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400 italic">
                              Chưa có phản hồi
                            </p>
                          )}

                          {deptProofs.length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5">
                              {deptProofs.map((att) => {
                                const isVid =
                                  att.kind === "PROOF_VIDEO" ||
                                  att.mimetype?.startsWith("video");
                                return (
                                  <div
                                    key={att.id}
                                    onClick={() =>
                                      isVid
                                        ? setSelectedVideoPreview(att.url)
                                        : setSelectedImagePreview(att.url)
                                    }
                                    className="relative aspect-square rounded border overflow-hidden bg-gray-100 cursor-pointer">
                                    {isVid ? (
                                      <VideoThumbnail
                                        url={att.url}
                                        className="w-full h-full"
                                        badgeClassName="w-6 h-6"
                                      />
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={att.url}
                                        alt={att.originalName || "Minh chứng"}
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t pt-2.5 text-[11px] text-gray-400 flex items-center justify-between">
                    <span>
                      Đã xong{" "}
                      {
                        assignedDepartmentList.filter(
                          (d) =>
                            ticket.tasks?.find((t) => t.department === d)
                              ?.isCompleted
                        ).length
                      }
                      /{assignedDepartmentList.length} bộ phận
                    </span>
                    {canComplete &&
                      ["REMEDIATING", "COMPLETED"].includes(ticket.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            // Mở nhanh bộ phận chưa hoàn tất đầu tiên.
                            const nextDept =
                              assignedDepartmentList.find(
                                (d) =>
                                  !ticket.tasks?.find(
                                    (t) => t.department === d
                                  )?.isCompleted
                              ) ?? assignedDepartmentList[0];
                            handleOpenTask(nextDept);
                          }}
                          className="text-brand font-semibold hover:underline">
                          Cập nhật kết quả
                        </button>
                      )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Modal Hướng Xử Lý & Phân Công */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[94vh] flex flex-col shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b px-7 py-4 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Cập nhật hướng xử lý &amp; Giao nhiệm vụ
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ticket.code} · {ticket.customerName}
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="shrink-0 text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto px-7 py-5 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cột trái: nội dung xử lý */}
              <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hướng xử lý chốt cho sự cố này <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={handlingDirection}
                  onChange={(e) => setHandlingDirection(e.target.value)}
                  placeholder="Ví dụ: Claim NCC bục rách, kho làm phiếu xuất hủy, kế toán điều chỉnh công nợ khách..."
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-1 focus:ring-brand focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hiện tượng &amp; Nguyên nhân sự cố
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mô tả hiện tượng hàng lỗi và nguyên nhân ghi nhận được..."
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-1 focus:ring-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: hàng cont về ngày 8/9, đã liên hệ khách..."
                  className="w-full p-2.5 border rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              </div>

              {/* Cột phải: phân công & liên kết */}
              <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Các bộ phận phối hợp thực hiện:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEPARTMENT_OPTIONS.map((dept) => {
                    const checked = assignedDepts.includes(dept);
                    return (
                      <label
                        key={dept}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          checked
                            ? "border-brand bg-brand-soft text-brand-dark"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssignedDepts((prev) => [...prev, dept]);
                            } else {
                              setAssignedDepts((prev) => prev.filter((d) => d !== dept));
                            }
                          }}
                          className="rounded text-brand"
                        />
                        <span>{dept}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Trách nhiệm thuộc về:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RESPONSIBILITY_OPTIONS.map((item) => {
                    const checked = responsibilities.includes(item);
                    return (
                      <label
                        key={item}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          checked
                            ? "border-brand bg-brand-soft text-brand-dark"
                            : "border-gray-200 hover:bg-gray-50 text-gray-700"
                        }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setResponsibilities((prev) => [...prev, item]);
                            } else {
                              setResponsibilities((prev) =>
                                prev.filter((r) => r !== item)
                              );
                            }
                          }}
                          className="rounded text-brand"
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full p-2 border rounded-lg text-xs bg-white">
                    <option value="Thấp">Thấp</option>
                    <option value="Trung">Trung</option>
                    <option value="Cao">Cao</option>
                  </select>
                </div>

                <div className="relative" ref={factoryDropdownRef}>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nhà máy sản xuất
                  </label>
                  <div className="relative">
                    <Factory className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={factorySearch}
                      onChange={(e) => {
                        setFactorySearch(e.target.value);
                        setFactoryId(undefined);
                        setShowFactoryDropdown(true);
                      }}
                      onFocus={() => setShowFactoryDropdown(true)}
                      placeholder="Tìm mã hoặc tên nhà máy..."
                      className="w-full pl-8 pr-7 p-2 border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    {factorySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setFactorySearch("");
                          setFactoryId(undefined);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {showFactoryDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl z-40 max-h-44 overflow-y-auto divide-y divide-gray-100">
                      {factorySearchResult.isLoading ? (
                        <div className="p-2 text-xs text-center text-gray-400">
                          Đang tải...
                        </div>
                      ) : factoryOptions.length === 0 ? (
                        <div className="p-2 text-xs text-center text-gray-400">
                          Không tìm thấy nhà máy phù hợp
                        </div>
                      ) : (
                        factoryOptions.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setFactoryId(f.id);
                              setFactorySearch(
                                f.code ? `${f.name} (${f.code})` : f.name
                              );
                              setShowFactoryDropdown(false);
                            }}
                            className="w-full text-left px-2.5 py-2 text-xs hover:bg-brand-soft flex items-center justify-between">
                            <span className="font-medium text-gray-800">
                              {f.name}
                            </span>
                            {f.code && (
                              <span className="text-gray-400 font-mono text-[10px]">
                                {f.code}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative" ref={outboundInvoiceDropdownRef}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hóa đơn xuất bù / hoàn (nếu có)
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={outboundInvoiceSearch}
                    onChange={(e) => {
                      setOutboundInvoiceSearch(e.target.value);
                      setOutboundInvoiceId(undefined);
                      setShowOutboundInvoiceDropdown(true);
                    }}
                    onFocus={() => setShowOutboundInvoiceDropdown(true)}
                    placeholder="Gõ mã hóa đơn (HD...)"
                    className="w-full pl-8 pr-7 p-2 border rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  {outboundInvoiceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setOutboundInvoiceSearch("");
                        setOutboundInvoiceId(undefined);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {showOutboundInvoiceDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-xl z-40 max-h-44 overflow-y-auto divide-y divide-gray-100">
                    {outboundInvoiceSearchResult.isLoading ? (
                      <div className="p-2 text-xs text-center text-gray-400">
                        Đang tải...
                      </div>
                    ) : outboundInvoiceOptions.length === 0 ? (
                      <div className="p-2 text-xs text-center text-gray-400">
                        Không tìm thấy hóa đơn phù hợp
                      </div>
                    ) : (
                      outboundInvoiceOptions.map((inv) => (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => {
                            setOutboundInvoiceId(inv.id);
                            setOutboundInvoiceSearch(inv.code);
                            setShowOutboundInvoiceDropdown(false);
                          }}
                          className="w-full text-left px-2.5 py-2 text-xs hover:bg-blue-50 flex items-center justify-between">
                          <span className="font-medium text-gray-800 font-mono">
                            {inv.code}
                          </span>
                          <span className="text-gray-400 truncate ml-2 max-w-[140px]">
                            {inv.customer?.name || "Khách"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              </div>
              </div>

              {/* Minh chứng: ảnh & video */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hình ảnh minh chứng: thêm/bớt ngay trong bước xử lý */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">
                    Hình ảnh minh chứng
                  </span>
                  <button
                    type="button"
                    onClick={() => processingImageInputRef.current?.click()}
                    disabled={isUploadingProcessingFiles}
                    className="text-xs text-brand hover:underline flex items-center gap-1 disabled:opacity-50">
                    {isUploadingProcessingFiles ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Thêm ảnh
                  </button>
                  <input
                    ref={processingImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleUploadProcessingFiles(e, "PROOF_IMAGE")}
                    className="hidden"
                  />
                </div>
                {existingImages.length === 0 && newProcessingImages.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-3 text-center border border-dashed rounded-lg">
                    Chưa có ảnh minh chứng.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {existingImages.map((att) => {
                      const removed = removedAttachmentIds.includes(att.id);
                      return (
                        <div
                          key={`img-${att.id}`}
                          onClick={() => setSelectedImagePreview(att.url)}
                          className={`relative aspect-square rounded-lg border overflow-hidden bg-gray-100 cursor-pointer ${
                            removed ? "opacity-40" : ""
                          }`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={att.url}
                            alt={att.originalName || "Minh chứng"}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRemoveAttachment(att.id);
                            }}
                            title={removed ? "Hoàn tác" : "Bỏ ảnh này"}
                            className={`absolute top-1 right-1 w-5 h-5 rounded-full text-white flex items-center justify-center ${
                              removed ? "bg-brand hover:bg-brand-dark" : "bg-black/60 hover:bg-red-600"
                            }`}>
                            {removed ? (
                              <RotateCcw className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                    {newProcessingImages.map((att) => (
                      <div
                        key={`new-img-${att.localId}`}
                        onClick={() => setSelectedImagePreview(att.url)}
                        className="relative aspect-square rounded-lg border overflow-hidden bg-gray-100 cursor-pointer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt={att.originalName || "Ảnh mới"}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 left-1 bg-brand text-white text-[10px] px-1 rounded">
                          Mới
                        </span>
                        <button
                          type="button"
                          title="Bỏ ảnh vừa thêm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewAttachments((prev) =>
                              prev.filter((a) => a.localId !== att.localId)
                            );
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Video minh chứng: thêm/bớt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">
                    Video minh chứng
                  </span>
                  <button
                    type="button"
                    onClick={() => processingVideoInputRef.current?.click()}
                    disabled={isUploadingProcessingFiles}
                    className="text-xs text-brand hover:underline flex items-center gap-1 disabled:opacity-50">
                    {isUploadingProcessingFiles ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Thêm video
                  </button>
                  <input
                    ref={processingVideoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleUploadProcessingFiles(e, "PROOF_VIDEO")}
                    className="hidden"
                  />
                </div>
                {existingVideos.length === 0 && newProcessingVideos.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-3 text-center border border-dashed rounded-lg">
                    Chưa có video minh chứng.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {existingVideos.map((att) => {
                      const removed = removedAttachmentIds.includes(att.id);
                      return (
                        <div
                          key={`video-${att.id}`}
                          onClick={() => setSelectedVideoPreview(att.url)}
                          className={`relative aspect-square rounded-lg border overflow-hidden bg-gray-100 cursor-pointer ${
                            removed ? "opacity-40" : ""
                          }`}>
                          <VideoThumbnail
                            url={att.url}
                            className="w-full h-full"
                            badgeClassName="w-7 h-7"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRemoveAttachment(att.id);
                            }}
                            title={removed ? "Hoàn tác" : "Bỏ video này"}
                            className={`absolute top-1 right-1 w-5 h-5 rounded-full text-white flex items-center justify-center ${
                              removed
                                ? "bg-brand hover:bg-brand-dark"
                                : "bg-black/60 hover:bg-red-600"
                            }`}>
                            {removed ? (
                              <RotateCcw className="w-3 h-3" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                    {newProcessingVideos.map((att) => (
                      <div
                        key={`new-video-${att.localId}`}
                        onClick={() => setSelectedVideoPreview(att.url)}
                        className="relative aspect-square rounded-lg border overflow-hidden bg-gray-100 cursor-pointer">
                        <VideoThumbnail
                          url={att.url}
                          className="w-full h-full"
                          badgeClassName="w-7 h-7"
                        />
                        <span className="absolute bottom-1 left-1 bg-brand text-white text-[10px] px-1 rounded">
                          Mới
                        </span>
                        <button
                          type="button"
                          title="Bỏ video vừa thêm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewAttachments((prev) =>
                              prev.filter((a) => a.localId !== att.localId)
                            );
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              </div>

              </div>

              <div className="shrink-0 flex justify-end gap-2 border-t bg-gray-50 px-7 py-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 border rounded-lg text-sm font-medium text-gray-600 hover:bg-white bg-white">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-6 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark disabled:opacity-60 flex items-center gap-2 shadow-sm">
                  {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {ticket.status === "NEW"
                      ? "Chuyển sang Đang xử lý"
                      : "Lưu hướng xử lý"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Cập Nhật Task Bộ Phận */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900">
                Nhiệm vụ bộ phận: {showTaskModal}
              </h2>
              <button
                onClick={() => setShowTaskModal(null)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Phản hồi / Ghi chú kết quả xử lý
                </label>
                <textarea
                  rows={3}
                  value={taskFeedback}
                  onChange={(e) => setTaskFeedback(e.target.value)}
                  placeholder="Ghi rõ nội dung: đã liên hệ NCC, đã đổi hàng cho khách, đã cấn trừ tiền..."
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-1 focus:ring-brand focus:outline-none"
                />
              </div>

              {/* Checkbox hoàn thành */}
              <label className="flex items-center gap-2.5 p-3 rounded-lg border bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskIsCompleted}
                  onChange={(e) => setTaskIsCompleted(e.target.checked)}
                  className="rounded text-brand w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">
                    Đánh dấu bộ phận {showTaskModal} đã hoàn thành
                  </span>
                  <span className="text-xs text-gray-400 block">
                    Xác nhận việc khắc phục thuộc trách nhiệm của bộ phận đã hoàn tất. Bắt buộc có ít nhất 1 ảnh minh chứng.
                  </span>
                </div>
              </label>

              {taskIsCompleted &&
                !(ticket.attachments || []).some(
                  (a) => a.department === showTaskModal && isImageAttachment(a)
                ) &&
                !taskAttachments.some(isImageAttachment) && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Cần tải lên ít nhất 1 hình ảnh minh chứng để hoàn thành nhiệm vụ này.
                  </div>
                )}

              {/* Đính kèm chứng từ hoàn thành */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-gray-700">
                    Chứng từ / Ảnh xác nhận hoàn thành
                  </span>
                  <button
                    type="button"
                    onClick={() => taskFileInputRef.current?.click()}
                    disabled={isUploadingTaskFile}
                    className="text-xs text-brand hover:underline flex items-center gap-1">
                    {isUploadingTaskFile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Thêm file
                  </button>
                  <input
                    ref={taskFileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleTaskFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Chứng từ đã lưu trước đó của bộ phận (chỉ xem) */}
                {existingCompletionAttachments.length > 0 && (
                  <div className="mb-2.5">
                    <span className="text-[11px] text-gray-400 block mb-1">
                      Đã lưu trước đó ({existingCompletionAttachments.length})
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {existingCompletionAttachments.map((att) => {
                        const isVid =
                          att.kind === "PROOF_VIDEO" ||
                          att.mimetype?.startsWith("video");
                        return (
                          <div
                            key={att.id}
                            onClick={() =>
                              isVid
                                ? setSelectedVideoPreview(att.url)
                                : setSelectedImagePreview(att.url)
                            }
                            className="relative aspect-square rounded-lg border overflow-hidden bg-gray-100 cursor-pointer">
                            {isVid ? (
                              <VideoThumbnail
                                url={att.url}
                                className="w-full h-full"
                                badgeClassName="w-6 h-6"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.url}
                                alt={att.originalName || "Chứng từ"}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tệp mới thêm trong phiên này */}
                {taskAttachments.length > 0 ? (
                  <div>
                    <span className="text-[11px] text-brand font-medium block mb-1">
                      Sẽ lưu ({taskAttachments.length})
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {taskAttachments.map((f, i) => {
                        const isVid =
                          f.kind === "PROOF_VIDEO" ||
                          f.mimetype?.startsWith("video");
                        return (
                          <div
                            key={i}
                            onClick={() =>
                              isVid
                                ? setSelectedVideoPreview(f.url)
                                : setSelectedImagePreview(f.url)
                            }
                            className="relative aspect-square rounded-lg border overflow-hidden bg-gray-100 cursor-pointer">
                            {isVid ? (
                              <VideoThumbnail
                                url={f.url}
                                className="w-full h-full"
                                badgeClassName="w-6 h-6"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={f.url}
                                alt={f.originalName || "Chứng từ"}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <button
                              type="button"
                              title="Bỏ tệp vừa thêm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskAttachments((prev) =>
                                  prev.filter((_, idx) => idx !== i)
                                );
                              }}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : existingCompletionAttachments.length === 0 ? (
                  <div className="text-xs text-gray-400 italic py-3 text-center border border-dashed rounded-lg">
                    Chưa có chứng từ nào.
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(null)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateTaskMutation.isPending}
                  className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark flex items-center gap-2">
                  {updateTaskMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Cập nhật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Hủy phiếu */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900">
                Hủy phiếu chất lượng hàng hóa
              </h2>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lý do hủy phiếu <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Ví dụ: Tạo nhầm phiếu, khách rút khiếu nại, xử lý ngoài quy trình..."
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-1 focus:ring-brand focus:outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={closeMutation.isPending}
                  className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 flex items-center gap-2">
                  {closeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Xác nhận hủy phiếu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Xem ảnh / video minh chứng */}
      {(selectedImagePreview || selectedVideoPreview) && (
        <div
          onClick={() => {
            setSelectedImagePreview(null);
            setSelectedVideoPreview(null);
          }}
          className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[60]">
          <button
            type="button"
            onClick={() => {
              setSelectedImagePreview(null);
              setSelectedVideoPreview(null);
            }}
            title="Đóng"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>

          {selectedImagePreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedImagePreview}
              alt="Ảnh minh chứng"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          )}

          {selectedVideoPreview && (
            <video
              src={selectedVideoPreview}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[90vh] rounded-lg bg-black"
            />
          )}
        </div>
      )}
    </div>
  );
}
