"use client";

import { useState, useEffect } from "react";
import { useSearchCustomers, useCustomer } from "@/lib/hooks/useCustomers";
import { CodeLink } from "@/components/shared/CodeLink";
import { CustomerDebtsTab } from "@/components/customers/CustomerDebtsTab";
import { formatCurrency } from "@/lib/utils";
import { Search, Loader2, X, UserSearch } from "lucide-react";

/** Modal tìm khách hàng */
function SearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isFetching } = useSearchCustomers(debounced || undefined);
  const customers = data?.data || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col max-h-[75vh]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-800">
            Tra cứu khách hàng
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã hoặc tên khách hàng..."
              className="pl-9 pr-3 py-2.5 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isFetching ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Đang tìm...
            </div>
          ) : customers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              {debounced
                ? "Không tìm thấy khách hàng"
                : "Nhập mã hoặc tên để tìm khách hàng"}
            </div>
          ) : (
            customers.map(
              (c: {
                id: number;
                code: string;
                name: string;
                contactNumber?: string | null;
                totalDebt?: number;
              }) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className="w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors border-b last:border-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {c.code}
                      {c.contactNumber ? ` - ${c.contactNumber}` : ""}
                    </div>
                  </div>
                  {typeof c.totalDebt === "number" && (
                    <span
                      className={`text-xs whitespace-nowrap shrink-0 ${c.totalDebt > 0 ? "text-red-600" : "text-gray-400"}`}>
                      Nợ: {formatCurrency(c.totalDebt)}
                    </span>
                  )}
                </button>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal chi tiết khách hàng + công nợ */
function DetailModal({
  customerId,
  onClose,
  onBack,
}: {
  customerId: number;
  onClose: () => void;
  onBack: () => void;
}) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const [tab, setTab] = useState<"info" | "debt" | "debtAll">("debt");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const childrenDebt =
    customer?.children?.reduce((s, c) => s + Number(c.totalDebt || 0), 0) ?? 0;
  const hasChildren = (customer?.children?.length ?? 0) > 0;

  const tabs: { key: "info" | "debt" | "debtAll"; label: string }[] = [
    { key: "debt", label: "Công nợ (chỉ KH này)" },
    ...(hasChildren
      ? [{ key: "debtAll" as const, label: "Công nợ (gồm con)" }]
      : []),
    { key: "info", label: "Thông tin" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-12"
      onMouseDown={onClose}>
      <div
        className="w-full max-w-5xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[88vh]"
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-800 truncate">
              {customer ? customer.name : "Thông tin khách hàng"}
            </h3>
            {customer && (
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <CodeLink entity="customer" code={customer.code} />
                <span>
                  Nợ hiện tại:{" "}
                  <b
                    className={
                      Number(customer.totalDebt) > 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }>
                    {formatCurrency(Number(customer.totalDebt))}
                  </b>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onBack}
              className="px-2.5 py-1.5 text-xs border rounded-lg text-gray-600 hover:bg-gray-50">
              Tìm khác
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {customer && (
          <div className="flex gap-1 px-5 pt-3 border-b">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto px-5 py-4">
          {isLoading || !customer ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Đang tải...
            </div>
          ) : tab === "debt" ? (
            <CustomerDebtsTab
              customerId={customer.id}
              customerDebt={Number(customer.totalDebt)}
              hidePaymentButton
              includeChildren={false}
            />
          ) : tab === "debtAll" ? (
            <CustomerDebtsTab
              customerId={customer.id}
              customerDebt={Number(customer.totalDebt) + childrenDebt}
              hidePaymentButton
              includeChildren
            />
          ) : (
            <div className="space-y-4">
              {/* Công nợ — nổi bật nhất */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-lg border ${Number(customer.totalDebt) > 0 ? "bg-red-50 border-red-200" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-500">Công nợ hiện tại</div>
                  <div
                    className={`text-xl font-bold ${Number(customer.totalDebt) > 0 ? "text-red-600" : "text-gray-700"}`}>
                    {formatCurrency(Number(customer.totalDebt))}
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-gray-50">
                  <div className="text-xs text-gray-500">Tổng đã mua</div>
                  <div className="text-xl font-bold text-gray-700">
                    {formatCurrency(Number(customer.totalPurchased))}
                  </div>
                </div>
              </div>

              {hasChildren && (
                <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                  <div className="text-xs text-gray-500">
                    Tổng công nợ gồm {customer.children!.length} khách con
                  </div>
                  <div className="text-lg font-bold text-blue-700">
                    {formatCurrency(Number(customer.totalDebt) + childrenDebt)}
                  </div>
                </div>
              )}

              {/* Thông tin thêm */}
              <div className="text-sm space-y-1.5">
                {(customer.contactNumber || customer.phone) && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Điện thoại</span>
                    <span className="text-gray-800 text-right">
                      {customer.contactNumber || customer.phone}
                    </span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-800 text-right break-all">
                      {customer.email}
                    </span>
                  </div>
                )}
                {customer.addresses?.[0]?.address && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500 shrink-0">Địa chỉ</span>
                    <span className="text-gray-800 text-right">
                      {customer.addresses[0].address}
                    </span>
                  </div>
                )}
                {customer.parent && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Khách cha</span>
                    <span className="text-gray-800 text-right">
                      {customer.parent.name} ({customer.parent.code})
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-gray-500">Trạng thái</span>
                  <span
                    className={
                      customer.isActive ? "text-emerald-600" : "text-gray-400"
                    }>
                    {customer.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </span>
                </div>
              </div>

              {/* Danh sách khách con */}
              {hasChildren && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-2">
                    Khách hàng con
                  </div>
                  <div className="border rounded-lg divide-y">
                    {customer.children!.map((ch) => (
                      <div
                        key={ch.id}
                        className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="text-gray-800 truncate">
                            {ch.name}
                          </div>
                          <div className="text-xs text-gray-500">{ch.code}</div>
                        </div>
                        <span
                          className={`text-xs whitespace-nowrap ${Number(ch.totalDebt) > 0 ? "text-red-600" : "text-gray-400"}`}>
                          {formatCurrency(Number(ch.totalDebt))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Nút tra cứu khách hàng + 2 modal (search → detail) */
export function CustomerLookup() {
  const [mode, setMode] = useState<"closed" | "search" | "detail">("closed");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <button
        onClick={() => setMode("search")}
        className="inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap">
        <UserSearch className="w-4 h-4" />
        Tra cứu khách hàng
      </button>

      {mode === "search" && (
        <SearchModal
          onSelect={(id) => {
            setSelectedId(id);
            setMode("detail");
          }}
          onClose={() => setMode("closed")}
        />
      )}

      {mode === "detail" && selectedId && (
        <DetailModal
          customerId={selectedId}
          onClose={() => setMode("closed")}
          onBack={() => setMode("search")}
        />
      )}
    </>
  );
}
