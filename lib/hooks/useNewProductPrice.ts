"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { newProductPriceApi } from "@/lib/api/new-product-price";
import { useAuthStore } from "@/lib/store/auth";
import { NPP_STAGE_LABEL } from "@/lib/new-product-price/constants";
import type {
  NppConfigInput,
  NppDecision,
  NppListParams,
  NppTicketDetail,
  NppUpdateInput,
} from "@/lib/types/new-product-price";

const LIST_KEY = ["new-product-prices"];
const SUMMARY_KEY = ["new-product-price-summary"];
const detailKey = (id: number) => ["new-product-price", id];

function useReady() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  return hasHydrated && isAuthenticated;
}

export function useNewProductPrices(params: NppListParams) {
  const ready = useReady();
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => newProductPriceApi.list(params),
    enabled: ready,
    placeholderData: (prev) => prev,
  });
}

export function useNewProductPriceSummary(params: NppListParams) {
  const ready = useReady();
  return useQuery({
    queryKey: [...SUMMARY_KEY, params],
    queryFn: () => newProductPriceApi.summary(params),
    enabled: ready,
  });
}

export function useNewProductPrice(id: number | null) {
  const ready = useReady();
  return useQuery({
    queryKey: detailKey(id ?? 0),
    queryFn: () => newProductPriceApi.get(id!),
    enabled: ready && !!id,
    // Mở phiếu luôn lấy bản mới (lịch sử gửi tin Lark ghi sau khi thao tác)
    refetchOnMount: "always",
  });
}

export function useNewProductPriceReference() {
  const ready = useReady();
  return useQuery({
    queryKey: ["new-product-price-reference"],
    queryFn: () => newProductPriceApi.reference(),
    enabled: ready,
    staleTime: 5 * 60_000,
  });
}

export function useNewProductPriceConfig(enabled = true) {
  const ready = useReady();
  return useQuery({
    queryKey: ["new-product-price-config"],
    queryFn: () => newProductPriceApi.getConfig(),
    enabled: ready && enabled,
  });
}

export function useNppApplyPreview(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ["new-product-price-apply-preview", id],
    queryFn: () => newProductPriceApi.applyPreview(id),
    enabled,
  });
}

/** Ghi kết quả chi tiết mới vào cache + làm mới danh sách & bộ đếm. */
function useRefresh() {
  const qc = useQueryClient();
  return (detail?: NppTicketDetail | null) => {
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

export function useCreateNewProductPrice() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: NppUpdateInput & { submit?: boolean }) =>
      newProductPriceApi.create(body),
    onSuccess: (d, body) => {
      refresh(d);
      toast.success(
        body.submit
          ? `Đã tạo ${d.code} và gửi Phòng Thu Mua`
          : `Đã lưu nháp ${d.code}`,
      );
    },
    onError: errorToast("Không tạo được đề xuất"),
  });
}

export function useUpdateNewProductPrice(id: number) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: NppUpdateInput) => newProductPriceApi.update(id, body),
    onSuccess: (d) => {
      refresh(d);
      toast.success("Đã lưu");
    },
    onError: errorToast("Không lưu được"),
  });
}

export type NppAdvance = "save" | "complete" | "sendKtt";

/**
 * Modal Xử lý bước: lưu trường đã đổi rồi (tuỳ chọn) chuyển bước / gửi KTT, chỉ 1 toast.
 * Lưu được mà chuyển bước lỗi → vẫn làm mới phiếu để không mất phần đã lưu.
 */
export function useNppSaveAndAdvance(id: number) {
  const refresh = useRefresh();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      patch,
      then,
    }: {
      patch: NppUpdateInput;
      then: NppAdvance;
    }) => {
      let detail: NppTicketDetail | null = null;
      if (Object.keys(patch).length) {
        detail = await newProductPriceApi.update(id, patch);
      }
      try {
        if (then === "complete") detail = await newProductPriceApi.complete(id);
        if (then === "sendKtt") detail = await newProductPriceApi.sendKtt(id);
      } catch (e) {
        if (!detail) throw e;
        refresh(detail);
        throw new Error(
          `Đã lưu, nhưng chưa chuyển được: ${(e as Error).message}`,
        );
      }
      return detail;
    },
    onSuccess: (detail, { then }) => {
      refresh(detail);
      qc.invalidateQueries({
        queryKey: ["new-product-price-apply-preview", id],
      });
      toast.success(
        then === "complete" && detail
          ? `Đã chuyển sang ${NPP_STAGE_LABEL[detail.stage]}`
          : then === "sendKtt"
            ? "Đã lưu và gửi Kế toán trưởng duyệt"
            : "Đã lưu",
      );
    },
    onError: errorToast("Không lưu được"),
  });
}

/** Các thao tác chuyển bước trên 1 phiếu (mỗi hàm 1 mutation). */
export function useNppActions(id: number) {
  const refresh = useRefresh();
  const qc = useQueryClient();
  const done = (msg: string) => (d: NppTicketDetail) => {
    refresh(d);
    qc.invalidateQueries({ queryKey: ["new-product-price-apply-preview", id] });
    toast.success(msg);
  };
  return {
    complete: useMutation({
      mutationFn: () => newProductPriceApi.complete(id),
      onSuccess: done("Đã hoàn tất bước"),
      onError: errorToast("Không hoàn tất được"),
    }),
    sendBack: useMutation({
      mutationFn: (reason: string) => newProductPriceApi.sendBack(id, reason),
      onSuccess: done("Đã trả về Phòng Thu Mua"),
      onError: errorToast("Không trả về được"),
    }),
    sendKtt: useMutation({
      mutationFn: () => newProductPriceApi.sendKtt(id),
      onSuccess: done("Đã gửi Kế toán trưởng duyệt"),
      onError: errorToast("Không gửi được"),
    }),
    kttDecision: useMutation({
      mutationFn: (v: { decision: NppDecision; note?: string }) =>
        newProductPriceApi.kttDecision(id, v.decision, v.note),
      onSuccess: done("Đã ghi quyết định của Kế toán trưởng"),
      onError: errorToast("Không ghi được"),
    }),
    ceoDecision: useMutation({
      mutationFn: (v: {
        decision: NppDecision;
        note?: string;
        end?: boolean;
      }) => newProductPriceApi.ceoDecision(id, v.decision, v.note, v.end),
      onSuccess: done("Đã ghi quyết định của CEO"),
      onError: errorToast("Không ghi được"),
    }),
    apply: useMutation({
      mutationFn: () => newProductPriceApi.apply(id),
      onSuccess: (d) => done(`Đã tạo sản phẩm ${d.productCode ?? ""}`)(d),
      onError: errorToast("Không tạo được sản phẩm"),
    }),
    end: useMutation({
      mutationFn: (reason: string) => newProductPriceApi.end(id, reason),
      onSuccess: done("Đã kết thúc phiếu"),
      onError: errorToast("Không kết thúc được"),
    }),
    comment: useMutation({
      mutationFn: (content: string) => newProductPriceApi.comment(id, content),
      onSuccess: (events) => {
        qc.setQueryData<NppTicketDetail>(detailKey(id), (old) =>
          old ? { ...old, events } : old,
        );
      },
      onError: errorToast("Không gửi được bình luận"),
    }),
  };
}

export function useUpdateNppConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NppConfigInput) => newProductPriceApi.updateConfig(body),
    onSuccess: (cfg) => {
      qc.setQueryData(["new-product-price-config"], cfg);
      qc.invalidateQueries({ queryKey: ["new-product-price-reference"] });
      qc.invalidateQueries({ queryKey: ["new-product-price"] });
      toast.success("Đã lưu cấu hình");
    },
    onError: errorToast("Không lưu được cấu hình"),
  });
}

export function useRunNppReminders() {
  return useMutation({
    mutationFn: (stage?: string) => newProductPriceApi.runReminders(stage),
    onSuccess: (res) => {
      const sent = Object.values(res).reduce((s, r) => s + r.recipients, 0);
      toast.success(`Đã gửi nhắc việc tới ${sent} lượt người nhận`);
    },
    onError: errorToast("Không gửi được nhắc việc"),
  });
}
