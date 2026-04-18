// components/cashflows/EditCashFlowModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  useUpdateCashFlow,
  useCancelCashFlow,
  useRelatedInvoicePayments,
} from "@/lib/hooks/useCashflows";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { formatCurrency } from "@/lib/utils";
import { printEntity } from "@/lib/utils/print";
import {
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { CashFlow } from "@/lib/types/cashflow";
import { createPortal } from "react-dom";
import { useBankAccountsForPayment } from "@/lib/hooks/useBankAccounts";

// ── Constants ────────────────────────────────────────────────────────────────
const METHOD_OPTIONS = [
  { value: "cash", label: "Tiền mặt" },
  { value: "transfer", label: "Chuyển khoản" },
  { value: "ewallet", label: "Ví điện tử" },
];

const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ── MiniCalendar (single-date) ───────────────────────────────────────────────
function MiniCalendar({
  value,
  onChange,
  onClose,
}: {
  value: string; // "YYYY-MM-DD"
  onChange: (d: string) => void;
  onClose: () => void;
}) {
  const todayObj = new Date();
  const init = value ? new Date(value + "T00:00:00") : todayObj;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const startOffset = (new Date(vy, vm, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: number) =>
    `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prev = () =>
    vm === 0 ? (setVm(11), setVy((y) => y - 1)) : setVm((m) => m - 1);
  const next = () =>
    vm === 11 ? (setVm(0), setVy((y) => y + 1)) : setVm((m) => m + 1);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl p-3 shadow-lg select-none w-64">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prev}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">
          {MONTH_NAMES[vm]} {vy}
        </span>
        <button
          type="button"
          onClick={next}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-medium text-gray-400 py-0.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const ds = fmt(day);
          const isSel = value === ds;
          const isToday =
            todayObj.getFullYear() === vy &&
            todayObj.getMonth() === vm &&
            todayObj.getDate() === day;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(ds);
                onClose();
              }}
              className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-colors ${
                isSel
                  ? "bg-blue-600 text-white font-semibold"
                  : isToday
                    ? "border border-blue-400 text-blue-600 font-medium hover:bg-blue-50"
                    : "text-gray-700 hover:bg-gray-100"
              }`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TimePicker ───────────────────────────────────────────────────────────────
function TimePicker({
  hour,
  minute,
  onChange,
  onClose,
}: {
  hour: number;
  minute: number;
  onChange: (h: number, m: number) => void;
  onClose: () => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
      <p className="text-xs font-semibold text-gray-500 mb-2">
        Chọn giờ : phút
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1 text-center">Giờ</p>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {hours.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => onChange(h, minute)}
                className={`w-full text-center py-0.5 text-sm rounded transition-colors ${
                  hour === h
                    ? "bg-blue-600 text-white font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}>
                {String(h).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 mb-1 text-center">Phút</p>
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {minutes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(hour, m);
                  onClose();
                }}
                className={`w-full text-center py-0.5 text-sm rounded transition-colors ${
                  minute === m
                    ? "bg-blue-600 text-white font-medium"
                    : "hover:bg-gray-100 text-gray-700"
                }`}>
                {String(m).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
interface EditCashFlowModalProps {
  cashFlow: CashFlow;
  invoicePayments: any[];
  isOpen: boolean;
  onClose: () => void;
  onCancelCashFlow: () => void;
}

export function EditCashFlowModal({
  cashFlow,
  invoicePayments,
  isOpen,
  onClose,
  onCancelCashFlow,
}: EditCashFlowModalProps) {
  const updateCashFlow = useUpdateCashFlow();
  const { data: usersData } = useUsersForFilter();
  const users = usersData || [];
  const { data: bankAccountsData } = useBankAccountsForPayment();
  const bankAccounts: any[] = bankAccountsData || [];
  const [accountId, setAccountId] = useState<number | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // ── Parse transDate → date string + hour + minute
  const parseInitialDate = () => {
    if (!cashFlow.transDate) return new Date();
    return new Date(cashFlow.transDate);
  };

  const [dateStr, setDateStr] = useState(""); // "YYYY-MM-DD"
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [collectorId, setCollectorId] = useState<number | null>(null);
  const [method, setMethod] = useState("cash");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Dropdown states
  const [showCal, setShowCal] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  const calRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const methodRef = useRef<HTMLDivElement>(null);

  // Init state khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const d = parseInitialDate();
    setDateStr(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setCollectorId(cashFlow.createdBy ?? null);
    setMethod(cashFlow.method || "cash");
    setDescription(cashFlow.description || "");
    setAccountId(cashFlow.accountId ?? null);
  }, [isOpen, cashFlow]);

  // Click outside để đóng dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node))
        setShowCal(false);
      if (timeRef.current && !timeRef.current.contains(e.target as Node))
        setShowTime(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setShowUserDropdown(false);
      if (methodRef.current && !methodRef.current.contains(e.target as Node))
        setShowMethodDropdown(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setShowAccountDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // ── Derived values ──────────────────────────────────────────────────────
  const selectedUser = users.find((u: any) => u.id === collectorId);
  const selectedMethod = METHOD_OPTIONS.find((m) => m.value === method);

  const partnerName =
    cashFlow.customer?.name ||
    cashFlow.supplier?.name ||
    cashFlow.partnerName ||
    null;

  const partnerCode =
    cashFlow.partnerType === "C" ? cashFlow.customer?.code : null;

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dateStr) {
      toast.error("Vui lòng chọn thời gian");
      return;
    }

    const transDateTime = new Date(dateStr + "T00:00:00");
    transDateTime.setHours(hour);
    transDateTime.setMinutes(minute);
    transDateTime.setSeconds(0);

    setIsSaving(true);
    try {
      await updateCashFlow.mutateAsync({
        id: cashFlow.id,
        data: {
          transDate: transDateTime.toISOString(),
          method,
          description: description || undefined,
          ...(collectorId ? { collectorId } : {}),
          ...(accountId ? { accountId } : { accountId: undefined }),
        },
      });
      onClose();
    } catch {
      // toast handled by hook
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printEntity("cashflows", cashFlow.id);
    } catch (err: any) {
      toast.error(err?.message || "In thất bại");
    } finally {
      setIsPrinting(false);
    }
  };

  const formatCurrencyDisplay = (n: number) =>
    new Intl.NumberFormat("vi-VN").format(n);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {cashFlow.isReceipt ? "Sửa phiếu thu" : "Sửa phiếu chi"}
            </h2>
            {partnerName && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm text-gray-500">{partnerName}</span>
                {partnerCode && (
                  <Link
                    href={`/khach-hang?Code=${partnerCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700" />
                  </Link>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Row 1: Mã phiếu + Người tạo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Mã phiếu {cashFlow.isReceipt ? "thu" : "chi"}
              </label>
              <input
                type="text"
                value={cashFlow.code}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Người tạo
              </label>
              <input
                type="text"
                value={cashFlow.creatorName || cashFlow.creator?.name || "-"}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 2: Thời gian + Người thu/chi */}
          <div className="grid grid-cols-2 gap-4">
            {/* Thời gian */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Thời gian
              </label>
              <div className="flex gap-2">
                {/* Date trigger */}
                <div ref={calRef} className="relative flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCal((v) => !v);
                      setShowTime(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors ${
                      showCal
                        ? "border-blue-400 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <span className="text-gray-800">
                      {dateStr
                        ? dateStr.split("-").reverse().join("/")
                        : "Chọn ngày"}
                    </span>
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {showCal && (
                    <MiniCalendar
                      value={dateStr}
                      onChange={(d) => {
                        setDateStr(d);
                        setShowCal(false);
                      }}
                      onClose={() => setShowCal(false)}
                    />
                  )}
                </div>

                {/* Time trigger */}
                <div ref={timeRef} className="relative w-28">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTime((v) => !v);
                      setShowCal(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors ${
                      showTime
                        ? "border-blue-400 ring-2 ring-blue-100"
                        : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <span className="text-gray-800">
                      {String(hour).padStart(2, "0")}:
                      {String(minute).padStart(2, "0")}
                    </span>
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                  {showTime && (
                    <TimePicker
                      hour={hour}
                      minute={minute}
                      onChange={(h, m) => {
                        setHour(h);
                        setMinute(m);
                      }}
                      onClose={() => setShowTime(false)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Người thu/chi */}
            <div ref={userRef} className="relative">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                {cashFlow.isReceipt ? "Người thu" : "Người chi"}
              </label>
              <button
                type="button"
                onClick={() => setShowUserDropdown((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors ${
                  showUserDropdown
                    ? "border-blue-400 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <span
                  className={selectedUser ? "text-gray-800" : "text-gray-400"}>
                  {selectedUser?.name || "Chọn người"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                  {users.map((u: any) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setCollectorId(u.id);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        collectorId === u.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}>
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div ref={methodRef} className="relative">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Phương thức thanh toán
            </label>
            <button
              type="button"
              onClick={() => setShowMethodDropdown((v) => !v)}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors ${
                showMethodDropdown
                  ? "border-blue-400 ring-2 ring-blue-100"
                  : "border-gray-200 hover:border-gray-300"
              }`}>
              <span className="text-gray-800">
                {selectedMethod?.label || "-"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showMethodDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {METHOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setMethod(opt.value);
                      setShowMethodDropdown(false);
                      if (opt.value === "cash" || opt.value === "card")
                        setAccountId(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      method === opt.value
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tài khoản ngân hàng — chỉ hiện khi method là transfer hoặc ewallet */}
          {(method === "transfer" || method === "ewallet") && (
            <div ref={accountRef} className="relative">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Tài khoản {method === "transfer" ? "ngân hàng" : "ví điện tử"}
              </label>
              <button
                type="button"
                onClick={() => setShowAccountDropdown((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm transition-colors ${
                  showAccountDropdown
                    ? "border-blue-400 ring-2 ring-blue-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <span className={accountId ? "text-gray-800" : "text-gray-400"}>
                  {accountId
                    ? (() => {
                        const acc = bankAccounts.find(
                          (a: any) => a.id === accountId
                        );
                        return acc
                          ? `${acc.bankName} - ${acc.accountNumber}`
                          : "Chọn tài khoản";
                      })()
                    : "Chọn tài khoản"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showAccountDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-52 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountId(null);
                      setShowAccountDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">
                    Không chọn
                  </button>
                  {bankAccounts.map((acc: any) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setAccountId(acc.id);
                        setShowAccountDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        accountId === acc.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}>
                      {"  "}
                      <span className="font-extrabold">{acc.bankCode}</span>
                      {" - "}
                      <span className="text-gray-500">{acc.accountNumber}</span>
                      {" - "}
                      <span className="font-medium">{acc.bankName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tổng tiền — readonly */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              {cashFlow.isReceipt ? "Tổng tiền thu" : "Tổng tiền chi"}
            </label>
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-right font-semibold text-gray-800 cursor-not-allowed">
              {formatCurrencyDisplay(Number(cashFlow.amount))}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Nhập ghi chú..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Hóa đơn liên quan */}
          {invoicePayments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="accent-blue-600"
                  id="allocate-check"
                />
                <label
                  htmlFor="allocate-check"
                  className="text-sm font-medium text-gray-700 cursor-default">
                  Phân bổ vào hóa đơn
                </label>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">
                        Mã phiếu
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">
                        Thời gian
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">
                        Giá trị phiếu
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">
                        Đã thu trước
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">
                        Tiền thu/chi
                      </th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600">
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoicePayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-blue-600">
                          {p.invoice?.code || "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {p.paymentDate
                            ? new Date(p.paymentDate).toLocaleString("vi-VN")
                            : "-"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {formatCurrencyDisplay(
                            Number(p.invoice?.grandTotal || 0)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {formatCurrencyDisplay(
                            Number(p.invoice?.paidAmount || 0) -
                              Number(p.amount)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600">
                          {formatCurrencyDisplay(Number(p.amount))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              p.invoice?.status === 1
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                            {p.invoice?.status === 1
                              ? "Đã thanh toán"
                              : "Đang xử lý"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-200 bg-gray-50">
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-2 text-sm font-semibold text-gray-700">
                        Tiền chưa phân bổ:
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                        {formatCurrencyDisplay(
                          Math.max(
                            0,
                            Number(cashFlow.amount) -
                              invoicePayments.reduce(
                                (sum, p) => sum + Number(p.amount),
                                0
                              )
                          )
                        )}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          {/* Left: Hủy phiếu */}
          <button
            onClick={onCancelCashFlow}
            disabled={cashFlow.status === 2}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-4 h-4" />
            Hủy
          </button>

          {/* Right: Bỏ qua | In | Lưu */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Bỏ qua
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting || cashFlow.status === 2}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              {isPrinting ? "Đang in..." : "In"}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || cashFlow.status === 2}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
