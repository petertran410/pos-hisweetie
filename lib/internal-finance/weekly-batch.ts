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
  if (["IN_APPROVAL", "APPROVED"].includes(batch.status)) return false;
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
