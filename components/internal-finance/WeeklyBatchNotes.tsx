import type {
  ApprovalHistoryItem,
  WeeklyBatch,
} from "@/lib/api/internal-finance";
import {
  approvalStepLabel,
  approvalStepTime,
} from "@/lib/internal-finance/weekly-batch";

const byLine = (userName: string | null, time: string | null) =>
  [userName, approvalStepTime(time)].filter(Boolean).join(" · ");

/** Lý do đơn Lark bị từ chối / thu hồi, dưới nhãn trạng thái Approval. */
export function ApprovalEndNote({
  note,
}: {
  note?: ApprovalHistoryItem | null;
}) {
  if (!note) return null;
  const by = byLine(note.userName, note.time);
  return (
    <div className="mt-0.5 max-w-64 text-[11px] leading-snug">
      {note.comment && (
        <div className="line-clamp-2 text-red-600" title={note.comment}>
          {note.comment}
        </div>
      )}
      {by && <div className="text-gray-400">{by}</div>}
    </div>
  );
}

/** Batch đã hủy: ai hủy, lúc nào, vì sao. */
export function CancelledNote({
  batch,
}: {
  batch: Pick<WeeklyBatch, "cancelReason" | "cancelledAt" | "canceller">;
}) {
  const by = byLine(
    batch.canceller?.name || "Tự hủy khi Lark từ chối",
    batch.cancelledAt || null,
  );
  return (
    <div className="mt-0.5 max-w-64 text-[11px] leading-snug">
      {batch.cancelReason && (
        <div className="line-clamp-2 text-gray-600" title={batch.cancelReason}>
          {batch.cancelReason}
        </div>
      )}
      <div className="text-gray-400">{by}</div>
    </div>
  );
}

/** Lịch sử duyệt Lark của batch (chi tiết batch). */
export function ApprovalHistoryList({
  items,
}: {
  items?: ApprovalHistoryItem[];
}) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-gray-900">
        Lịch sử duyệt
      </div>
      <ol className="space-y-2 border-l border-gray-200 pl-3">
        {items.map((item, index) => {
          const ended = ["REJECT", "CANCEL", "DELETE"].includes(item.type);
          return (
            <li key={index} className="relative text-sm">
              <span
                className={`absolute -left-[17px] top-1.5 h-2 w-2 rounded-full ${
                  ended
                    ? "bg-red-500"
                    : item.type === "PASS" || item.type === "APPROVED"
                      ? "bg-green-500"
                      : "bg-gray-300"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span
                  className={`font-medium ${ended ? "text-red-600" : "text-gray-900"}`}>
                  {approvalStepLabel(item.type)}
                </span>
                <span className="text-xs text-gray-500">
                  {byLine(item.userName, item.time)}
                </span>
              </div>
              {item.comment && (
                <div className="whitespace-pre-wrap break-words text-xs text-gray-600">
                  {item.comment}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
