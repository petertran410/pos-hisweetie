"use client";

import { useMemo, type ReactNode } from "react";
import { Loader2, Send, X, type LucideIcon } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { confirmAction } from "@/lib/chat/confirm";
import {
  useLarkRecipients,
  useSettings,
  useTestLarkNotify,
  useUpdateSettings,
} from "@/lib/hooks/useSettings";
import type { LarkNotifyKind } from "@/lib/api/settings";

type RecipientField = "larkTaxCodeNotifyUserIds" | "larkNewCustomerTaskUserIds";

/**
 * Chọn người nhận 1 loại thông báo Lark (chip + ô thêm như trang Smax), lưu ngay khi thêm / gỡ.
 * Danh sách rỗng = tính năng tắt.
 */
export function LarkNotifyRecipientsCard({
  icon: Icon,
  title,
  description,
  field,
  kind,
  recipientLabel,
  testLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  field: RecipientField;
  kind: LarkNotifyKind;
  recipientLabel: string;
  testLabel: string;
  children?: ReactNode;
}) {
  const { data: settings, isLoading: loadingSettings, error } = useSettings();
  const { data: recipients, isLoading: loadingRecipients } =
    useLarkRecipients();
  const update = useUpdateSettings();
  const test = useTestLarkNotify();

  const byId = useMemo(
    () => new Map((recipients ?? []).map((r) => [r.id, r])),
    [recipients],
  );
  const selectedIds = useMemo(() => settings?.[field] ?? [], [settings, field]);
  // Người đã chọn trước đó nhưng nay nghỉ việc / bị gỡ Lark ID → không nhận được, tự bỏ khi lưu lần sau
  const validIds = selectedIds.filter((id) => byId.has(id));

  const options = useMemo(
    () =>
      (recipients ?? [])
        .filter((r) => !selectedIds.includes(r.id))
        .map((r) => ({
          value: String(r.id),
          label: `${r.name}${r.email ? ` — ${r.email}` : ""}`,
        })),
    [recipients, selectedIds],
  );

  const save = (ids: number[]) => update.mutate({ [field]: ids });

  const handleAdd = (value: string) => {
    const id = Number(value);
    if (!id || validIds.includes(id)) return;
    save([...validIds, id]);
  };

  const handleRemove = async (id: number, name: string) => {
    const ok = await confirmAction(
      `Gỡ ${name} khỏi danh sách nhận "${title}"?`,
      {
        title: "Gỡ người nhận",
        confirmText: "Gỡ",
        danger: true,
      },
    );
    if (ok) save(validIds.filter((x) => x !== id));
  };

  const loading = loadingSettings || loadingRecipients;

  return (
    <div className="max-w-2xl rounded-lg border bg-white">
      <div className="border-b p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-brand" aria-hidden />
          {title}
          {!loading &&
            !error &&
            (validIds.length > 0 ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Đang bật · {validIds.length} người
              </span>
            ) : (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Đang tắt
              </span>
            ))}
        </h2>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {recipientLabel}
          </label>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
            </p>
          ) : error ? (
            <p className="text-sm text-red-600">
              {(error as Error).message || "Không tải được cài đặt"}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {selectedIds.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedIds.map((id) => {
                    const r = byId.get(id);
                    const name = r?.name ?? `Người dùng #${id}`;
                    return (
                      <span
                        key={id}
                        title={
                          r
                            ? r.email
                            : "Đã nghỉ hoặc chưa gắn Lark — không nhận được, sẽ tự bỏ khi lưu"
                        }
                        className={`inline-flex items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-xs ${
                          r
                            ? "bg-gray-50"
                            : "bg-gray-100 text-gray-400 line-through"
                        }`}>
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemove(id, name)}
                          disabled={update.isPending}
                          className="rounded-full p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Gỡ người nhận">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Chưa chọn ai — tính năng đang tắt.
                </p>
              )}
              <SearchableSelect
                options={options}
                value=""
                onChange={handleAdd}
                placeholder={
                  selectedIds.length
                    ? "+ Thêm người nhận"
                    : "— Chọn người nhận —"
                }
                searchPlaceholder="Tìm theo tên hoặc email..."
                disabled={update.isPending}
                size="sm"
              />
              <p className="text-xs text-gray-500">
                Chỉ hiện người dùng đang hoạt động đã gắn Lark ID (Cài đặt →
                Người dùng → Sửa → Lark ID).
              </p>
            </div>
          )}
        </div>

        {children}

        <div className="flex justify-end border-t pt-3">
          <LoadingButton
            onClick={() => test.mutate(kind)}
            loading={test.isPending}
            loadingText="Đang gửi..."
            disabled={!validIds.length}
            title={validIds.length ? undefined : "Chọn người nhận trước"}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {!test.isPending && <Send className="h-4 w-4" />}
            {testLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
