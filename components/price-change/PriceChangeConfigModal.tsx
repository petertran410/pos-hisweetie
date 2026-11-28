"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, BellRing, Loader2, Settings2, X } from "lucide-react";
import { FilterMultiSelect } from "@/components/ui/filters";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  usePriceChangeConfig,
  useRunPcReminders,
  useUpdatePcConfig,
} from "@/lib/hooks/usePriceChange";
import { PC_GROUP_HINT, PC_GROUP_LABEL } from "@/lib/price-change/constants";
import type { PcConfig, PcGroup } from "@/lib/types/price-change";

const GROUPS = Object.keys(PC_GROUP_LABEL) as PcGroup[];

/** Cấu hình người duyệt từng bước + nhóm Lark dạng topic (khuôn NewProductPriceConfigModal). */
export function PriceChangeConfigModal({ onClose }: { onClose: () => void }) {
  const { data: config, isLoading } = usePriceChangeConfig();
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-brand" />
            Cấu hình duyệt thay đổi giá
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        {isLoading || !config ? (
          <p className="p-5 text-sm text-gray-500">
            <Loader2 className="inline h-4 w-4 animate-spin" /> Đang tải cấu
            hình…
          </p>
        ) : (
          <ConfigForm config={config} onClose={onClose} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function ConfigForm({
  config,
  onClose,
}: {
  config: PcConfig;
  onClose: () => void;
}) {
  const { data: users } = useUsersForFilter();
  const save = useUpdatePcConfig();
  const reminders = useRunPcReminders();
  const [remindersEnabled, setRemindersEnabled] = useState(
    config.remindersEnabled,
  );
  const [approvers, setApprovers] = useState<Record<PcGroup, string[]>>(
    Object.fromEntries(
      GROUPS.map((g) => [g, (config.approvers[g] ?? []).map(String)]),
    ) as Record<PcGroup, string[]>,
  );
  const [larkChatId, setLarkChatId] = useState(config.larkChatId ?? "");
  const chatIdInvalid =
    larkChatId.trim() !== "" && !/^oc_[A-Za-z0-9]+$/.test(larkChatId.trim());
  const userOpts = (users ?? []).map((u: { id: number; name: string }) => ({
    value: String(u.id),
    label: u.name,
  }));
  const noLark = new Set(
    config.members.filter((m) => !m.hasLark).map((m) => String(m.id)),
  );
  const label = "block text-sm font-medium text-gray-700 mb-1";

  const submit = () =>
    save.mutate(
      {
        approvers: Object.fromEntries(
          GROUPS.map((g) => [g, approvers[g].map(Number)]),
        ),
        larkChatId: larkChatId.trim(),
        remindersEnabled,
      },
      { onSuccess: onClose },
    );

  return (
    <>
      <div className="flex-1 overflow-auto p-5 space-y-4 text-sm">
        <p className="text-xs text-gray-500">
          Bước Đề xuất do người tạo phiếu xử lý. Người trong nhóm nhận tin Lark
          khi phiếu tới bước của mình và được bấm duyệt / áp dụng.
        </p>
        {GROUPS.map((g) => {
          const missingLark = approvers[g].filter((id) => noLark.has(id));
          return (
            <div key={g}>
              <label className={label}>{PC_GROUP_LABEL[g]}</label>
              <FilterMultiSelect
                options={userOpts}
                values={approvers[g]}
                onChange={(v) => setApprovers((a) => ({ ...a, [g]: v }))}
                placeholder="Chưa chọn"
                searchPlaceholder="Tìm nhân viên..."
                multiLabel={(n) => `${n} người`}
                panelWidth={320}
              />
              <p className="mt-1 text-xs text-gray-500">{PC_GROUP_HINT[g]}</p>
              {missingLark.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Chưa liên kết Lark (không nhận được tin):{" "}
                  {config.members
                    .filter((m) => missingLark.includes(String(m.id)))
                    .map((m) => m.name)
                    .join(", ")}
                </p>
              )}
            </div>
          );
        })}
        <div className="border-t pt-4">
          <label className={label}>Nhóm chat Lark (dạng topic) — chat_id</label>
          <input
            value={larkChatId}
            onChange={(e) => setLarkChatId(e.target.value)}
            placeholder="oc_… (để trống = không gửi vào nhóm)"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${chatIdInvalid ? "border-red-300" : "border-gray-200"}`}
          />
          {chatIdInvalid ? (
            <p className="mt-1 text-xs text-red-600">
              chat_id phải có dạng oc_… (chỉ chữ và số).
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">
              Gửi song song với tin nhắn riêng: phiếu gửi duyệt lần đầu thì tạo
              1 topic trong nhóm; mỗi lần chuyển bước, trả lời trong topic đó và
              tag người phụ trách bước. Bot phải là thành viên nhóm.
            </p>
          )}
        </div>
        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                className="accent-brand"
              />
              Nhắc việc hằng ngày (17:00 Kế toán trưởng, CEO, Phòng Dữ Liệu)
            </label>
            <LoadingButton
              loading={reminders.isPending}
              onClick={() => reminders.mutate(undefined)}
              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600">
              <BellRing className="w-4 h-4" /> Gửi nhắc việc ngay
            </LoadingButton>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Mỗi người trong nhóm nhận 1 tin nhắn riêng liệt kê các phiếu đang
            chờ ở bước của mình (kèm số ngày đã chờ), gồm cả phiếu chưa từng
            được báo.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 px-5 py-3 border-t">
        <span className="text-xs text-gray-400">
          {config.updatedByName ? `Sửa lần cuối: ${config.updatedByName}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600">
            Đóng
          </button>
          <LoadingButton
            loading={save.isPending}
            disabled={chatIdInvalid}
            onClick={submit}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Lưu
          </LoadingButton>
        </div>
      </div>
    </>
  );
}
