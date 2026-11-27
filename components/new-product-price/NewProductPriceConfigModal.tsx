"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, BellRing, Loader2, Settings2, X } from "lucide-react";
import {
  FilterMultiSelect,
  FilterSearchableSelect,
} from "@/components/ui/filters";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import {
  useNewProductPriceConfig,
  useNewProductPriceReference,
  useRunNppReminders,
  useUpdateNppConfig,
} from "@/lib/hooks/useNewProductPrice";
import {
  NPP_COST_GROUP_LABEL,
  NPP_GROUP_HINT,
  NPP_GROUP_LABEL,
  NPP_PRICE_TARGET_LABEL,
} from "@/lib/new-product-price/constants";
import type {
  NppConfig,
  NppCostGroupKey,
  NppGroup,
  NppPriceTarget,
  NppPriceTargetKey,
} from "@/lib/types/new-product-price";

type Tab = "approvers" | "targets";
const GROUPS = Object.keys(NPP_GROUP_LABEL) as NppGroup[];
const TARGET_KEYS = Object.keys(NPP_PRICE_TARGET_LABEL) as NppPriceTargetKey[];
const COST_KEYS = Object.keys(NPP_COST_GROUP_LABEL) as NppCostGroupKey[];

/** Cấu hình người duyệt từng bước (thay bảng "Cấu Hình Duyệt" Lark) + đích áp dụng giá bán / giá vốn. */
export function NewProductPriceConfigModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { data: config, isLoading } = useNewProductPriceConfig();
  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full max-w-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-brand" />
            Cấu hình duyệt bảng giá sản phẩm mới
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
  config: NppConfig;
  onClose: () => void;
}) {
  const { data: users } = useUsersForFilter();
  const { data: ref } = useNewProductPriceReference();
  const save = useUpdateNppConfig();
  const reminders = useRunNppReminders();
  const [tab, setTab] = useState<Tab>("approvers");
  const [approvers, setApprovers] = useState<Record<NppGroup, string[]>>(
    Object.fromEntries(
      GROUPS.map((g) => [g, (config.approvers[g] ?? []).map(String)]),
    ) as Record<NppGroup, string[]>,
  );
  const [targets, setTargets] = useState<Record<NppPriceTargetKey, string>>(
    Object.fromEntries(
      TARGET_KEYS.map((k) => [
        k,
        config.priceTargets[k] === null ? "" : String(config.priceTargets[k]),
      ]),
    ) as Record<NppPriceTargetKey, string>,
  );
  const [branches, setBranches] = useState<Record<NppCostGroupKey, string[]>>(
    Object.fromEntries(
      COST_KEYS.map((k) => [k, (config.costBranches[k] ?? []).map(String)]),
    ) as Record<NppCostGroupKey, string[]>,
  );
  const [larkChatId, setLarkChatId] = useState(config.larkChatId ?? "");
  const [remindersEnabled, setRemindersEnabled] = useState(
    config.remindersEnabled,
  );

  const userOpts = (users ?? []).map((u: { id: number; name: string }) => ({
    value: String(u.id),
    label: u.name,
  }));
  const noLark = new Set(
    config.members.filter((m) => !m.hasLark).map((m) => String(m.id)),
  );
  const targetOpts = [
    {
      value: "BASE_PRICE",
      label: "Bảng giá chung (giá bán chung của hàng hóa)",
    },
    ...(ref?.priceBooks ?? []).map((p) => ({
      value: String(p.id),
      label: p.name,
    })),
  ];
  const branchOpts = (ref?.branches ?? []).map((b) => ({
    value: String(b.id),
    label: b.name,
  }));

  const submit = () => {
    save.mutate(
      {
        approvers: Object.fromEntries(
          GROUPS.map((g) => [g, approvers[g].map(Number)]),
        ),
        priceTargets: Object.fromEntries(
          TARGET_KEYS.map((k) => [
            k,
            (targets[k] === "BASE_PRICE"
              ? "BASE_PRICE"
              : targets[k]
                ? Number(targets[k])
                : null) as NppPriceTarget,
          ]),
        ),
        costBranches: Object.fromEntries(
          COST_KEYS.map((k) => [k, branches[k].map(Number)]),
        ),
        larkChatId: larkChatId.trim() || null,
        remindersEnabled,
      },
      { onSuccess: onClose },
    );
  };

  const label = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <>
      <div className="flex border-b px-5">
        {(
          [
            ["approvers", "Người duyệt"],
            ["targets", "Áp dụng giá & giá vốn"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              tab === k
                ? "border-brand text-brand"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-4 text-sm">
        {tab === "approvers" && (
          <>
            <p className="text-xs text-gray-500">
              Bước Đề xuất do người tạo phiếu xử lý. Người trong nhóm nhận tin
              Lark khi phiếu tới bước, nhận nhắc việc hằng ngày và được bấm hoàn
              tất/duyệt.
            </p>
            {GROUPS.map((g) => {
              const missingLark = approvers[g].filter((id) => noLark.has(id));
              return (
                <div key={g}>
                  <label className={label}>{NPP_GROUP_LABEL[g]}</label>
                  <FilterMultiSelect
                    options={userOpts}
                    values={approvers[g]}
                    onChange={(v) => setApprovers((a) => ({ ...a, [g]: v }))}
                    placeholder="Chưa chọn"
                    searchPlaceholder="Tìm nhân viên..."
                    multiLabel={(n) => `${n} người`}
                    panelWidth={320}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {NPP_GROUP_HINT[g]}
                  </p>
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
            <div>
              <label className={label}>
                Nhóm Lark theo dõi phiếu (nhóm dạng chủ đề)
              </label>
              <input
                value={larkChatId}
                onChange={(e) => setLarkChatId(e.target.value)}
                placeholder="oc_… (bỏ trống = không gửi vào nhóm)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="mt-1 text-xs text-gray-500">
                Phiếu được gửi đi sẽ mở 1 chủ đề trong nhóm. Mỗi lần tới bước
                mới, người phụ trách được tag trong chủ đề đó. Tin nhắn riêng
                vẫn gửi như cũ. Bot POS phải có trong nhóm.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={remindersEnabled}
                  onChange={(e) => setRemindersEnabled(e.target.checked)}
                  className="accent-brand"
                />
                Nhắc việc hằng ngày (16:00 Kế Toán · 17:00 Thu Mua, Kinh Doanh,
                CEO)
              </label>
              <LoadingButton
                loading={reminders.isPending}
                onClick={() => reminders.mutate(undefined)}
                className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-1.5 text-gray-600">
                <BellRing className="w-4 h-4" /> Gửi nhắc việc ngay
              </LoadingButton>
            </div>
          </>
        )}
        {tab === "targets" && (
          <>
            <p className="text-xs text-gray-500">
              Khi Phòng Dữ Liệu bấm “Áp dụng tạo sản phẩm mới”, giá bán đưa vào
              các bảng giá dưới đây; giá vốn ghi theo nhóm chi nhánh (chi nhánh
              không thuộc nhóm nào nhận giá vốn Hà Nội).
              {(config.defaults.priceTargets.length > 0 ||
                config.defaults.costBranches.length > 0) &&
                " Mục chưa lưu đang dùng giá trị dò theo tên."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {TARGET_KEYS.map((k) => (
                <div key={k}>
                  <label className={label}>{NPP_PRICE_TARGET_LABEL[k]}</label>
                  <FilterSearchableSelect
                    size="form"
                    options={targetOpts}
                    value={targets[k]}
                    onChange={(v) => setTargets((t) => ({ ...t, [k]: v }))}
                    placeholder="Không áp dụng"
                    allowDeselect
                  />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t pt-4">
              {COST_KEYS.map((k) => (
                <div key={k}>
                  <label className={label}>{NPP_COST_GROUP_LABEL[k]}</label>
                  <FilterMultiSelect
                    options={branchOpts}
                    values={branches[k]}
                    onChange={(v) => setBranches((b) => ({ ...b, [k]: v }))}
                    placeholder="Chưa chọn chi nhánh"
                    searchPlaceholder="Tìm chi nhánh..."
                    multiLabel={(n) => `${n} chi nhánh`}
                  />
                </div>
              ))}
            </div>
          </>
        )}
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
            onClick={submit}
            className="px-3 py-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark text-sm font-medium">
            Lưu
          </LoadingButton>
        </div>
      </div>
    </>
  );
}
