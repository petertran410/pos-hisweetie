import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { messageIntelApi, type IntelMessagesParams, type IntelRangeParams } from "@/lib/api/messageIntel";
import type { IntelControl, ReviewLabels } from "@/lib/types/messageIntel";

const KEY = "message-intel";

/** Trạng thái worker: tự làm mới khi đang chạy. */
export function useIntelStatus(enabled = true) {
  return useQuery({
    queryKey: [KEY, "status"],
    queryFn: messageIntelApi.status,
    enabled,
    // Đang gửi AI hoặc đang quét tin cũ (quét chạy cả khi tạm dừng gửi AI) → làm mới 5 giây
    refetchInterval: (q) =>
      q.state.data && (!q.state.data.runtime.paused || q.state.data.runtime.backfillStatus === "running") ? 5_000 : false,
    retry: false,
  });
}

export function useIntelOverview(params: IntelRangeParams) {
  return useQuery({
    queryKey: [KEY, "overview", params],
    queryFn: () => messageIntelApi.overview(params),
    staleTime: 30_000,
    retry: false,
  });
}

export function useIntelMessages(params: IntelMessagesParams) {
  return useQuery({
    queryKey: [KEY, "messages", params],
    queryFn: () => messageIntelApi.messages(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    retry: false,
  });
}

export function useNextReview(enabled: boolean) {
  return useQuery({
    queryKey: [KEY, "review-next"],
    queryFn: messageIntelApi.nextReview,
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

export function useReviewSummary(enabled: boolean) {
  return useQuery({ queryKey: [KEY, "review-summary"], queryFn: messageIntelApi.reviewSummary, enabled, retry: false });
}

export function useSaveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { msgPid: string; labels: ReviewLabels; note?: string }) => messageIntelApi.saveReview(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, "review-next"] });
      qc.invalidateQueries({ queryKey: [KEY, "review-summary"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useIntelControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: IntelControl) => messageIntelApi.control(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSandbox() {
  return useMutation({
    mutationFn: messageIntelApi.sandbox,
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Danh sách hội thoại loại trừ khỏi phân loại tin. */
export function useIntelExclusions(enabled = true) {
  return useQuery({ queryKey: [KEY, "exclusions"], queryFn: messageIntelApi.exclusions, enabled, retry: false });
}

/** Tìm hội thoại theo tên để thêm vào danh sách loại trừ (≥ 2 ký tự). */
export function useIntelThreadSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: [KEY, "thread-search", term],
    queryFn: () => messageIntelApi.searchThreads(term),
    enabled: term.length >= 2,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    retry: false,
  });
}

/** Loại trừ / bỏ loại trừ hội thoại: làm mới màn hình phân tích + danh sách chat (nhãn "Không phân tích AI"). */
export function useToggleIntelExclusion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      v: { exclude: true; pagePid: string; tid: string } | { exclude: false; groupKey?: string; pagePid?: string; tid?: string }
    ): Promise<{ groupKey: string; threads?: number; skipped?: number; requeued?: number }> =>
      v.exclude
        ? messageIntelApi.exclude({ pagePid: v.pagePid, tid: v.tid })
        : messageIntelApi.include({ groupKey: v.groupKey, pagePid: v.pagePid, tid: v.tid }),
    onSuccess: (r, v) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: ["smaxRecentChats"] });
      if (v.exclude) {
        const n = r.threads ?? 0;
        toast.success(n > 1 ? `Đã loại trừ khỏi phân tích AI (${n} kênh cùng nhóm)` : "Đã loại trừ khỏi phân tích AI");
      } else {
        const n = r.requeued ?? 0;
        toast.success(n ? `Đã bỏ loại trừ, ${n} tin được phân loại lại` : "Đã bỏ loại trừ khỏi danh sách");
      }
    },
    onError: (e: Error) => toast.error(e.message || "Không cập nhật được danh sách loại trừ"),
  });
}
