"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Trash2,
  Upload,
  Loader2,
  ExternalLink,
  Plus,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProductQualityTicket,
  useAssignProductQualityTicket,
  useUpdateProductQualityTask,
  useCloseProductQualityTicket,
  useDeleteProductQualityTicket,
} from "@/lib/hooks/useProductQuality";
import { productQualityApi } from "@/lib/api/product-quality";
import { usePermission } from "@/lib/hooks/usePermissions";
import { CodeLink } from "@/components/shared/CodeLink";
import {
  type ProductQualityTicket,
  type ProductQualityTask,
  DEPARTMENT_OPTIONS,
  QUALITY_STATUS_CONFIG,
} from "@/lib/types/product-quality";

interface ProductQualityDetailProps {
  ticketId: number;
}

export function ProductQualityDetail({ ticketId }: ProductQualityDetailProps) {
  const router = useRouter();
  const { data: ticket, isLoading } = useProductQualityTicket(ticketId);

  const canAssign = usePermission("product_quality", "assign");
  const canComplete = usePermission("product_quality", "complete");
  const canClose = usePermission("product_quality", "close");
  const canDelete = usePermission("product_quality", "delete");

  const assignMutation = useAssignProductQualityTicket();
  const updateTaskMutation = useUpdateProductQualityTask();
  const closeMutation = useCloseProductQualityTicket();
  const deleteMutation = useDeleteProductQualityTicket();

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState<string | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);

  // Assign form state
  const [handlingDirection, setHandlingDirection] = useState("");
  const [assignedDepts, setAssignedDepts] = useState<string[]>([]);
  const [severity, setSeverity] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [outboundInvoiceCode, setOutboundInvoiceCode] = useState("");

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
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand mb-2" />
        <span>Đang tải thông tin phiếu sự cố...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
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
    setAssignedDepts(
      ticket.assignedDepartments?.length > 0
        ? [...ticket.assignedDepartments]
        : [...DEPARTMENT_OPTIONS]
    );
    setSeverity(ticket.severity || "Trung");
    setFactoryName(ticket.factoryName || "");
    setOutboundInvoiceCode(ticket.outboundInvoiceCode || "");
    setShowAssignModal(true);
  };

  // Submit Assign Modal
  const handleSaveAssign = (e: React.FormEvent) => {
    e.preventDefault();
    assignMutation.mutate(
      {
        id: ticket.id,
        data: {
          handlingDirection,
          assignedDepartments: assignedDepts,
          severity,
          factoryName: factoryName || undefined,
          outboundInvoiceCode: outboundInvoiceCode || undefined,
        },
      },
      {
        onSuccess: () => setShowAssignModal(false),
      }
    );
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
      toast.error("Vui lòng nhập lý do kết thúc phiếu");
      return;
    }
    closeMutation.mutate(
      { id: ticket.id, reason: closeReason },
      {
        onSuccess: () => setShowCloseModal(false),
      }
    );
  };

  // Delete ticket
  const handleDelete = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa phiếu sự cố này?")) {
      deleteMutation.mutate(ticket.id, {
        onSuccess: () => router.push("/san-pham/chat-luong-hang-hoa"),
      });
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 min-w-0">
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
          <div className="flex items-center gap-2">
            {canAssign && ticket.status !== "ENDED" && (
              <button
                onClick={handleOpenAssign}
                className="px-3.5 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-dark flex items-center gap-1.5 transition-colors shadow-sm">
                <CheckSquare className="w-4 h-4" />
                {ticket.handlingDirection ? "Sửa hướng xử lý" : "Nhập hướng xử lý"}
              </button>
            )}

            {canClose && ticket.status !== "ENDED" && (
              <button
                onClick={() => {
                  setCloseReason("");
                  setShowCloseModal(true);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-gray-500" />
                Dừng / Kết thúc
              </button>
            )}

            {canDelete && ticket.status === "NEW" && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            )}
          </div>
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

                {ticket.invoiceCode && (
                  <div>
                    <span className="text-xs text-gray-400 block">Hóa đơn mua hàng</span>
                    <CodeLink entity="invoice" code={ticket.invoiceCode} />
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
                        onClick={() => !isVid && setSelectedImagePreview(att.url)}
                        className="relative group aspect-square rounded-lg border overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer">
                        {isVid ? (
                          <video
                            src={att.url}
                            controls
                            className="w-full h-full object-cover"
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

                {ticket.closeReason && (
                  <div className="pt-2 border-t">
                    <span className="text-red-500 font-medium block">Lý do kết thúc:</span>
                    <span className="text-gray-700">{ticket.closeReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Nhiệm vụ các bộ phận (Tasks) */}
        <div className="bg-white rounded-xl border p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand" />
                Nhiệm vụ các bộ phận phối hợp
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Phiếu sẽ tự động chuyển trạng thái &ldquo;Hoàn thành&rdquo; khi tất cả bộ phận được giao hoàn tất
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEPARTMENT_OPTIONS.map((dept) => {
              const isAssigned = ticket.assignedDepartments?.includes(dept);
              const task = ticket.tasks?.find((t) => t.department === dept);
              const isDone = task?.isCompleted;

              return (
                <div
                  key={dept}
                  className={`border rounded-xl p-4 transition-all ${
                    isDone
                      ? "border-green-200 bg-green-50/30"
                      : isAssigned
                      ? "border-amber-200 bg-amber-50/20"
                      : "border-gray-200 bg-gray-50/40 opacity-70"
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isDone ? "bg-green-500" : isAssigned ? "bg-amber-500" : "bg-gray-300"
                        }`}
                      />
                      <span className="font-bold text-sm text-gray-800">{dept}</span>
                      {!isAssigned && (
                        <span className="text-[11px] text-gray-400 font-normal">
                          (Không yêu cầu)
                        </span>
                      )}
                    </div>

                    {/* Status badge */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        isDone
                          ? "bg-green-100 text-green-700"
                          : isAssigned
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                      {isDone ? "Đã xong" : isAssigned ? "Chờ xử lý" : "Bỏ qua"}
                    </span>
                  </div>

                  {/* Task details */}
                  <div className="space-y-2 text-xs text-gray-600 mt-2">
                    {task?.assignedUserName && (
                      <div>
                        Phụ trách: <strong className="text-gray-800">{task.assignedUserName}</strong>
                      </div>
                    )}

                    <div>
                      <span className="text-gray-400 block mb-0.5">Phản hồi của bộ phận:</span>
                      {task?.feedback ? (
                        <div className="p-2 bg-white rounded border text-gray-800 whitespace-pre-wrap">
                          {task.feedback}
                        </div>
                      ) : (
                        <span className="italic text-gray-400">Chưa có phản hồi</span>
                      )}
                    </div>

                    {isDone && task?.completedAt && (
                      <div className="text-[11px] text-gray-400 pt-1">
                        Hoàn tất ngày {new Date(task.completedAt).toLocaleString("vi-VN")} bởi{" "}
                        {task.completedByName || "Thành viên"}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {canComplete && ticket.status !== "ENDED" && (
                    <div className="border-t border-gray-200/60 pt-3 mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenTask(dept)}
                        className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {isDone ? "Chỉnh sửa phản hồi / Mở lại" : "Cập nhật kết quả"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Modal Hướng Xử Lý & Phân Công */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900">
                Cập nhật hướng xử lý & Giao nhiệm vụ
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hướng xử lý chốt cho sự cố này <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={handlingDirection}
                  onChange={(e) => setHandlingDirection(e.target.value)}
                  placeholder="Ví dụ: Claim NCC bục rách, kho làm phiếu xuất hủy, kế toán điều chỉnh công nợ khách..."
                  className="w-full p-2.5 border rounded-lg text-sm focus:ring-1 focus:ring-brand focus:outline-none"
                  required
                />
              </div>

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

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nhà máy sản xuất
                  </label>
                  <input
                    type="text"
                    value={factoryName}
                    onChange={(e) => setFactoryName(e.target.value)}
                    placeholder="Guanling, Meijia..."
                    className="w-full p-2 border rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã hóa đơn xuất bù / hoàn (nếu có)
                </label>
                <input
                  type="text"
                  value={outboundInvoiceCode}
                  onChange={(e) => setOutboundInvoiceCode(e.target.value)}
                  placeholder="HD..."
                  className="w-full p-2 border rounded-lg text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark flex items-center gap-2">
                  {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Lưu hướng xử lý</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal Cập Nhật Task Bộ Phận */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
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
                    Xác nhận việc khắc phục thuộc trách nhiệm của bộ phận đã hoàn tất
                  </span>
                </div>
              </label>

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
                    onChange={handleTaskFileUpload}
                    className="hidden"
                  />
                </div>

                {taskAttachments.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-auto">
                    {taskAttachments.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded border bg-gray-50 text-xs">
                        <span className="truncate max-w-[300px]">
                          {f.originalName || f.filename}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTaskAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-gray-400 hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* 6. Modal Kết thúc phiếu */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900">
                Dừng / Kết thúc phiếu sự cố
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
                  Lý do kết thúc phiếu <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Ví dụ: Khách không khiếu nại nữa, giải quyết ngoài quy trình..."
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
                  <span>Xác nhận kết thúc</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Image preview modal */}
      {selectedImagePreview && (
        <div
          onClick={() => setSelectedImagePreview(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 cursor-zoom-out">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImagePreview}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
