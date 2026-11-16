"use client";

import { useState } from "react";
import { FileText, UserPlus } from "lucide-react";
import { PagePermissionGuard } from "@/components/permissions/PagePermissionGuard";
import { LarkNotifyRecipientsCard } from "@/components/settings/LarkNotifyRecipientsCard";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { NumericInput } from "@/components/ui/NumericInput";
import { useSettings, useUpdateSettings } from "@/lib/hooks/useSettings";

const MAX_DUE_DAYS = 30;

/** Hạn task KH mới = lúc tạo + N ngày (mặc định 1). */
function DueDaysField({ initial }: { initial: number }) {
  const update = useUpdateSettings();
  const [days, setDays] = useState(initial);
  const valid = Number.isInteger(days) && days >= 1 && days <= MAX_DUE_DAYS;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Hạn xử lý task
      </label>
      <div className="flex items-center gap-2">
        <NumericInput
          value={days}
          onValueChange={setDays}
          maxFractionDigits={0}
          className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <span className="text-sm text-gray-600">
          ngày sau khi tạo khách hàng
        </span>
        <LoadingButton
          onClick={() => update.mutate({ larkNewCustomerTaskDueDays: days })}
          loading={update.isPending}
          disabled={!valid || days === initial}
          className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-40">
          Lưu
        </LoadingButton>
      </div>
      {!valid && (
        <p className="mt-1 text-xs text-red-600">
          Nhập từ 1 đến {MAX_DUE_DAYS} ngày.
        </p>
      )}
    </div>
  );
}

export default function LarkNotificationSettingsPage() {
  const { data: settings } = useSettings();

  return (
    <PagePermissionGuard resource="settings" action="update">
      <div className="flex flex-col h-full">
        <div className="p-6 border-b bg-white">
          <h1 className="text-2xl font-bold">Thông báo Lark</h1>
          <p className="text-gray-600 mt-1">
            Tự động nhắn tin riêng và tạo task trên Lark khi khách hàng được tạo
            hoặc sửa tay trên POS (web, app). Import Excel và đồng bộ KiotViet
            không gửi thông báo.
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <LarkNotifyRecipientsCard
            icon={FileText}
            title="Khách hàng đổi mã số thuế"
            description="Gửi tin nhắn riêng trên Lark cho từng người dưới đây khi mã số thuế của khách hàng được thêm, sửa hoặc xoá."
            field="larkTaxCodeNotifyUserIds"
            kind="taxCode"
            recipientLabel="Người nhận tin nhắn"
            testLabel="Gửi tin thử"
          />
          <LarkNotifyRecipientsCard
            icon={UserPlus}
            title="Khách hàng mới"
            description="Tạo 1 task trên Lark, giao cho tất cả người dưới đây, mỗi khi có khách hàng mới."
            field="larkNewCustomerTaskUserIds"
            kind="newCustomerTask"
            recipientLabel="Người được giao task"
            testLabel="Tạo task thử">
            {settings && (
              <DueDaysField
                // lưu xong → nhận giá trị mới từ server
                key={settings.larkNewCustomerTaskDueDays}
                initial={settings.larkNewCustomerTaskDueDays ?? 1}
              />
            )}
          </LarkNotifyRecipientsCard>
        </div>
      </div>
    </PagePermissionGuard>
  );
}
