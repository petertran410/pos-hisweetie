"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { priceChangeApi } from "@/lib/api/price-change";
import { useAuthStore } from "@/lib/store/auth";
import { PC_STAGE_LABEL } from "@/lib/price-change/constants";
import type {
  PcConfigInput,
  PcDecision,
  PcListParams,
  PcTicketDetail,
  PcUpsertInput,
} from "@/lib/types/price-change";

const LIST_KEY = ["price-changes"];
const SUMMARY_KEY = ["price-change-summary"];
const detailKey = (id: number) => ["price-change", id];
const PREVIEW_KEY = "price-change-apply-preview";

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

export function usePriceChanges(params: PcListParams) {
  const ready = useReady();
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => priceChangeApi.list(params),
    enabled: ready,
    placeholderData: (prev) => prev,
  });
}

export function usePriceChangeSummary(params: PcListParams) {
  const ready = useReady();
  return useQuery({
    queryKey: [...SUMMARY_KEY, params],
    queryFn: () => priceChangeApi.summary(params),
    enabled: ready,
  });
}

export function usePriceChange(id: number | null) {
  const ready = useReady();
  return useQuery({
    queryKey: detailKey(id ?? 0),
    queryFn: () => priceChangeApi.get(id!),
    enabled: ready && !!id,
    // Mở phiếu luôn lấy bản mới (kết quả gửi tin Lark ghi sau khi thao tác)
    refetchOnMount: "always",
  });
}

export function usePriceChangeReference() {
  const ready = useReady();
  return useQuery({
    queryKey: ["price-change-reference"],
    queryFn: () => priceChangeApi.reference(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

/** Giá vốn / giá bán hiện tại trên POS của các sản phẩm trong form. */
export function usePriceChangeCurrentValues(
  productIds: number[],
  branchIds: number[],
  priceBookIds: number[],
) {
  const ready = useReady();
  const ids = [...productIds].sort((a, b) => a - b);
  return useQuery({
    queryKey: [
      "price-change-current",
      ids,
      [...branchIds].sort(),
      [...priceBookIds].sort(),
    ],
    queryFn: () => priceChangeApi.currentValues(ids, branchIds, priceBookIds),
    enabled: ready && ids.length > 0,
    placeholderData: (prev) => prev,
  });
}

export function usePriceChangeConfig(enabled = true) {
  const ready = useReady();
  return useQuery({
    queryKey: ["price-change-config"],
    queryFn: () => priceChangeApi.getConfig(),
    enabled: ready && enabled,
  });
}

export function usePcApplyPreview(id: number, enabled: boolean) {
  return useQuery({
    queryKey: [PREVIEW_KEY, id],
    queryFn: () => priceChangeApi.applyPreview(id),
    enabled,
    refetchOnMount: "always",
  });
}

/** Ghi kết quả chi tiết mới vào cache + làm mới danh sách & bộ đếm. */
function useRefresh() {
  const qc = useQueryClient();
  return (detail?: PcTicketDetail | null) => {
    if (detail) {
      qc.setQueryData(detailKey(detail.id), detail);
      // Tin Lark gửi nền sau khi lưu → tải lại để hiện kết quả gửi trong lịch sử
      setTimeout(
        () => qc.invalidateQueries({ queryKey: detailKey(detail.id) }),
        3000,
      );
    }
    qc.invalidateQueries({ queryKey: LIST_KEY });
    qc.invalidateQueries({ queryKey: SUMMARY_KEY });
  };
}

const errorToast = (fallback: string) => (e: Error) =>
  toast.error(e.message || fallback);

/**
 * Lưu phiếu (tạo mới / sửa) rồi tùy chọn gửi duyệt, chỉ 1 toast.
 * Lưu được mà gửi duyệt lỗi → vẫn làm mới phiếu để không mất phần đã lưu.
 */
export function useSavePriceChange(id: number | null) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({
      body,
      submit,
    }: {
      body: PcUpsertInput;
      submit: boolean;
    }) => {
      if (!id) return priceChangeApi.create({ ...body, submit });
      const saved = await priceChangeApi.update(id, body);
      if (!submit) return saved;
      try {
        return await priceChangeApi.submit(id);
      } catch (e) {
        refresh(saved);
        throw new Error(
          `Đã lưu, nhưng chưa gửi duyệt được: ${(e as Error).message}`,
        );
      }
    },
    onSuccess: (d, { submit }) => {
      refresh(d);
      toast.success(
        submit
          ? `Đã gửi ${d.code} cho ${PC_STAGE_LABEL[d.stage]} duyệt`
          : id
            ? `Đã lưu ${d.code}`
            : `Đã lưu nháp ${d.code}`,
      );
    },
    onError: errorToast("Không lưu được phiếu"),
  });
}

/** Các thao tác chuyển bước trên 1 phiếu (mỗi hàm 1 mutation). */
export function usePcActions(id: number) {
  const refresh = useRefresh();
  const qc = useQueryClient();
  const done = (msg: string) => (d: PcTicketDetail) => {
    refresh(d);
    qc.invalidateQueries({ queryKey: [PREVIEW_KEY, id] });
    toast.success(msg);
  };
  type DecisionVars = { decision: PcDecision; note?: string; end?: boolean };
  return {
    submit: useMutation({
      mutationFn: () => priceChangeApi.submit(id),
      onSuccess: (d) => done(`Đã gửi ${PC_STAGE_LABEL[d.stage]} duyệt`)(d),
      onError: errorToast("Không gửi duyệt được"),
    }),
    kttDecision: useMutation({
      mutationFn: (v: DecisionVars) =>
        priceChangeApi.kttDecision(id, v.decision, v.note, v.end),
      onSuccess: done("Đã ghi quyết định của Kế toán trưởng"),
      onError: errorToast("Không ghi được"),
    }),
    ceoDecision: useMutation({
      mutationFn: (v: DecisionVars) =>
        priceChangeApi.ceoDecision(id, v.decision, v.note, v.end),
      onSuccess: done("Đã ghi quyết định của CEO"),
      onError: errorToast("Không ghi được"),
    }),
    sendBack: useMutation({
      mutationFn: (reason: string) => priceChangeApi.sendBack(id, reason),
      onSuccess: done("Đã trả về người đề xuất"),
      onError: errorToast("Không trả về được"),
    }),
    apply: useMutation({
      mutationFn: () => priceChangeApi.apply(id),
      onSuccess: done("Đã áp dụng giá mới lên POS"),
      onError: errorToast("Không áp dụng được"),
    }),
    end: useMutation({
      mutationFn: (reason: string) => priceChangeApi.end(id, reason),
      onSuccess: done("Đã kết thúc phiếu"),
      onError: errorToast("Không kết thúc được"),
    }),
    comment: useMutation({
      mutationFn: (content: string) => priceChangeApi.comment(id, content),
      onSuccess: (events) => {
        qc.setQueryData<PcTicketDetail>(detailKey(id), (old) =>
          old ? { ...old, events } : old,
        );
      },
      onError: errorToast("Không gửi được bình luận"),
    }),
  };
}

export function useUpdatePcConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PcConfigInput) => priceChangeApi.updateConfig(body),
    onSuccess: (cfg) => {
      qc.setQueryData(["price-change-config"], cfg);
      qc.invalidateQueries({ queryKey: ["price-change"] });
      toast.success("Đã lưu cấu hình");
    },
    onError: errorToast("Không lưu được cấu hình"),
  });
}

export function useRunPcReminders() {
  return useMutation({
    mutationFn: (stage?: string) => priceChangeApi.runReminders(stage),
    onSuccess: (res) => {
      const sent = Object.values(res).reduce((s, r) => s + r.recipients, 0);
      const tickets = Object.values(res).reduce((s, r) => s + r.tickets, 0);
      toast.success(
        tickets
          ? `Đã gửi nhắc việc tới ${sent} lượt người nhận`
          : "Không có phiếu nào đang chờ duyệt",
      );
    },
    onError: errorToast("Không gửi được nhắc việc"),
  });
}
