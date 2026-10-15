import type { WeeklyBatch } from "@/lib/api/internal-finance";

// Approval Lark đã kết thúc mà không duyệt: batch tuần được phép hủy.
const ENDED_APPROVAL_STATUSES = [
  "CANCELED",
  "REJECTED",
  "DELETED",
  "REVERTED",
  "CREATE_FAILED",
];

/** Cùng luật với backend: chưa gửi Lark, hoặc Approval Lark đã hủy/từ chối. */
export function canCancelBatch(
  batch: Pick<WeeklyBatch, "status" | "approvalRequest">,
) {
  if (["IN_APPROVAL", "APPROVED", "CANCELLED"].includes(batch.status))
    return false;
  const approvalStatus = batch.approvalRequest?.status;
  return !approvalStatus || ENDED_APPROVAL_STATUSES.includes(approvalStatus);
}

/** Batch đã có Approval Lark bị hủy/từ chối (không phải chưa gửi). */
export function hasEndedApproval(batch: Pick<WeeklyBatch, "approvalRequest">) {
  const approvalStatus = batch.approvalRequest?.status;
  return Boolean(
    approvalStatus &&
    approvalStatus !== "CREATE_FAILED" &&
    ENDED_APPROVAL_STATUSES.includes(approvalStatus),
  );
}

// Tên thao tác trong lịch sử duyệt Lark.
const APPROVAL_STEP_LABELS: Record<string, string> = {
  START: "Gửi duyệt",
  PASS: "Đồng ý",
  APPROVED: "Đồng ý",
  REJECT: "Từ chối",
  CANCEL: "Thu hồi",
  DELETE: "Xóa đơn",
  REVERTED: "Hoàn tác duyệt",
  TRANSFER: "Chuyển duyệt",
  ADD_APPROVER_BEFORE: "Thêm người duyệt",
  ADD_APPROVER: "Thêm người duyệt",
  ADD_APPROVER_AFTER: "Thêm người duyệt",
  DELETE_APPROVER: "Bỏ người duyệt",
  ROLLBACK_SELECTED: "Trả về bước trước",
  ROLLBACK: "Trả về bước trước",
  CC: "Gửi CC",
  REMOVE_REPEAT: "Tự bỏ qua (trùng người duyệt)",
};

export const approvalStepLabel = (type: string) =>
  APPROVAL_STEP_LABELS[type] || "Thao tác khác";

export const approvalStepTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
