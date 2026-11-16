import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  settingsApi,
  type LarkNotifyKind,
  type UpdateSettingsInput,
} from "@/lib/api/settings";

// Trùng key với trang /cai-dat/dong-bo để dùng chung cache
const SETTINGS_KEY = ["settings"];

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => settingsApi.get(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSettingsInput) => settingsApi.update(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(SETTINGS_KEY, updated);
      toast.success("Đã lưu cài đặt");
    },
    onError: (e: Error) => toast.error(e.message || "Lưu cài đặt thất bại"),
  });
}

export function useLarkRecipients() {
  return useQuery({
    queryKey: ["larkRecipients"],
    queryFn: () => settingsApi.getLarkRecipients(),
  });
}

export function useTestLarkNotify() {
  return useMutation({
    mutationFn: (kind: LarkNotifyKind) => settingsApi.testLarkNotify(kind),
    onSuccess: ({ sent, failed }, kind) => {
      if (sent.length) {
        toast.success(
          kind === "taxCode"
            ? `Đã gửi tin thử tới ${sent.join(", ")}`
            : `Đã tạo task thử giao cho ${sent.join(", ")}`,
        );
      }
      if (failed.length) {
        toast.error(`Lark báo lỗi với ${failed.length} người`, {
          description: failed.map((f) => `${f.name}: ${f.error}`).join("\n"),
        });
      }
    },
    onError: (e: Error) => toast.error(e.message || "Gửi thử thất bại"),
  });
}
