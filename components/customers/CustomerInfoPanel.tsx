"use client";

// Phần "Thông tin" của khách hàng — dùng chung cho dòng chi tiết ở trang
// Khách hàng và modal khách ở trang Bán hàng, để 2 nơi luôn giống nhau.
// Sửa khách luôn đi qua CustomerForm (nút onEdit); riêng ghi chú sửa nhanh tại chỗ.

import { useEffect, useState } from "react";
import {
  Loader2,
  Mail,
  MapPin,
  Phone,
  Receipt,
  StickyNote,
} from "lucide-react";
import { DEBT_FORM_LABELS } from "@/lib/api/debt-tracking";
import { useUpdateCustomerComments } from "@/lib/hooks/useCustomers";
import { useCan } from "@/lib/hooks/useCan";
import type { Customer } from "@/lib/types/customer";
import { InfoCard, InfoItem } from "./CustomerTabUI";

interface CustomerInfoPanelProps {
  customer: Customer;
  /** Mở CustomerForm để sửa — không truyền thì ẩn nút "Bổ sung". */
  onEdit?: () => void;
  /** Chuyển sang tab Địa chỉ — không truyền thì ẩn link "Xem tất cả". */
  onViewAddresses?: () => void;
}

export function CustomerInfoPanel({
  customer,
  onEdit,
  onViewAddresses,
}: CustomerInfoPanelProps) {
  const canUpdateCustomer = useCan("customers", "update");
  const canViewDebt = useCan("customers", "view_debt");

  // ─── Ghi chú sửa trực tiếp ───
  // Sửa được khi có quyền sửa khách hàng HOẶC quyền riêng sửa ghi chú.
  const canUpdateComments = useCan("customers", "update_comments");
  const canEditComments = canUpdateCustomer || canUpdateComments;
  const updateComments = useUpdateCustomerComments();
  const [comments, setComments] = useState(customer.comments ?? "");
  useEffect(() => {
    setComments(customer.comments ?? "");
  }, [customer.id, customer.comments]);
  const handleSaveComments = () => {
    if (updateComments.isPending) return;
    updateComments.mutate({ id: customer.id, comments: comments.trim() });
  };
  const commentsDirty = comments.trim() !== (customer.comments ?? "").trim();

  const groups: string[] =
    customer.customerGroupDetails
      ?.map((d: any) => d.customerGroup?.name)
      .filter(Boolean) || [];

  const isOrg = Number(customer.type) === 1;
  const debtForm = customer.debtPolicy?.debtForm;

  const addresses = customer.addresses ?? [];
  const defaultAddress =
    addresses.find((a: any) => a.isDefault) || addresses[0];
  const defaultAddressLine = defaultAddress
    ? [
        defaultAddress.address,
        defaultAddress.newWardName || defaultAddress.wardName,
        defaultAddress.newCityName || defaultAddress.cityName,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  // Thông tin xuất hóa đơn — chỉ hiện trường có dữ liệu, nhãn theo loại khách
  const invoiceItems = (
    isOrg
      ? [
          { label: "Tên công ty", value: customer.organization },
          { label: "Mã số thuế", value: customer.taxCode },
          { label: "Địa chỉ", value: customer.invoiceAddress, wide: true },
          { label: "Email", value: customer.invoiceEmail },
          { label: "Số điện thoại", value: customer.invoicePhone },
          { label: "Tên người mua", value: customer.invoiceBuyerName },
          { label: "Mã ĐVQHNS", value: customer.invoiceDvqhnsCode },
        ]
      : [
          { label: "Tên người mua", value: customer.invoiceBuyerName },
          { label: "Mã số thuế", value: customer.taxCode },
          { label: "Địa chỉ", value: customer.invoiceAddress, wide: true },
          { label: "Email", value: customer.invoiceEmail },
          { label: "Số điện thoại", value: customer.invoicePhone },
          { label: "Số CCCD/CMND", value: customer.invoiceCccdCmnd },
          { label: "Số hộ chiếu", value: customer.invoiceBankAccount },
        ]
  ).filter((i) => i.value && String(i.value).trim());

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* ── Liên hệ & phân loại ── */}
        <InfoCard title="Liên hệ & phân loại">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <InfoItem
              icon={Phone}
              label="Điện thoại"
              value={customer.contactNumber}
            />
            <InfoItem label="SĐT phụ" value={customer.phone} />
            <InfoItem icon={Mail} label="Email" value={customer.email} />
            {/* Chỉ hiện khi API chi tiết có trả debtPolicy */}
            {canViewDebt && debtForm && (
              <InfoItem
                label="Hình thức công nợ"
                value={DEBT_FORM_LABELS[debtForm]}
              />
            )}
            {customer.misaEmployeeName && (
              <InfoItem
                label="NV phụ trách (Misa)"
                value={customer.misaEmployeeName}
              />
            )}
            <div className="col-span-2 sm:col-span-3">
              <dt className="mb-1 text-xs text-gray-500">Nhóm khách hàng</dt>
              <dd className="flex flex-wrap gap-1.5">
                {groups.length > 0 ? (
                  groups.map((g) => (
                    <span
                      key={g}
                      className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">Chưa có</span>
                )}
              </dd>
            </div>
          </dl>
        </InfoCard>

        {/* ── Địa chỉ giao hàng mặc định ── */}
        <InfoCard
          title="Địa chỉ giao hàng"
          action={
            addresses.length > 0 &&
            onViewAddresses && (
              <button
                type="button"
                onClick={onViewAddresses}
                className="text-xs font-medium text-brand hover:underline">
                Xem tất cả ({addresses.length})
              </button>
            )
          }>
          {defaultAddress ? (
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div className="min-w-0 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {defaultAddress.label ||
                      defaultAddress.receiver ||
                      "Địa chỉ mặc định"}
                  </span>
                  {defaultAddress.isDefault && (
                    <span className="rounded bg-brand px-1.5 py-0.5 text-[11px] font-medium text-white">
                      Mặc định
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-gray-700">
                  {defaultAddressLine || (
                    <span className="italic text-gray-400">
                      Chưa có địa chỉ chi tiết
                    </span>
                  )}
                </p>
                {(defaultAddress.receiver || defaultAddress.contactNumber) && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[defaultAddress.receiver, defaultAddress.contactNumber]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Chưa có địa chỉ giao hàng</p>
          )}
        </InfoCard>

        {/* ── Thông tin xuất hóa đơn ── */}
        <InfoCard title="Thông tin xuất hóa đơn">
          {invoiceItems.length > 0 ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {invoiceItems.map((item) => (
                <InfoItem
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  className={item.wide ? "sm:col-span-2" : ""}
                />
              ))}
            </dl>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-gray-400">
                <Receipt className="h-4 w-4" />
                Chưa có thông tin xuất hóa đơn
              </p>
              {canUpdateCustomer && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="text-xs font-medium text-brand hover:underline">
                  Bổ sung
                </button>
              )}
            </div>
          )}
        </InfoCard>
      </div>

      {/* ── Ghi chú ── */}
      <InfoCard title="Ghi chú" className="flex flex-col">
        {canEditComments ? (
          <div className="flex flex-1 flex-col">
            <textarea
              id={`customer-comments-${customer.id}`}
              aria-label="Ghi chú khách hàng"
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 1000))}
              onKeyDown={(e) => {
                // Ctrl/Cmd + Enter để lưu nhanh
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSaveComments();
                }
              }}
              maxLength={1000}
              rows={8}
              placeholder="Nhập ghi chú về khách hàng..."
              className="min-h-[180px] w-full flex-1 resize-y rounded-lg border bg-white px-3 py-2 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand focus:shadow-[0_0_0_3px_var(--dt-color-primary-ring)] focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-400">
                {comments.length}/1000 · Ctrl + Enter để lưu
              </span>
              <button
                type="button"
                onClick={handleSaveComments}
                disabled={!commentsDirty || updateComments.isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40">
                {updateComments.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {updateComments.isPending ? "Đang lưu..." : "Lưu ghi chú"}
              </button>
            </div>
          </div>
        ) : customer.comments ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {customer.comments}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <StickyNote className="h-4 w-4" />
            Chưa có ghi chú
          </p>
        )}
      </InfoCard>
    </div>
  );
}
