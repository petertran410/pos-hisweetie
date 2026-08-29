"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Loader2, AlertTriangle, Info, Search } from "lucide-react";
import {
  DebtTrackingRow,
  MIN_PAYMENT_RATIO_WARN,
} from "@/lib/api/debt-tracking";
import { useCreateDebtTicket } from "@/lib/hooks/useDebtTickets";
import { useUsersForFilter } from "@/lib/hooks/useUsers";
import { useDebtTrackingSearch } from "@/lib/hooks/useDebtTracking";
import { DatePickerInput } from "@/components/ui/DatePickerInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
} from "@/lib/utils";

interface TicketLine {
  customerId: number;
  customerName: string;
  customerCode: string | null;
  contactNumber: string | null;
  totalDebt: number;
  minimumPayment: string;
  confirmedAmount: string;
  confirmedDate: string;
  note: string;
}

/** Số tiền tối thiểu mặc định là khoản hệ thống đã so sánh giữa hạn mức và
 * hóa đơn đến hạn. Không có khoản nào cần thu thì để 0, không tự lấy toàn nợ. */
const toLine = (r: DebtTrackingRow): TicketLine => {
  const suggested = r.requiredPaymentAmount;
  return {
    customerId: r.customerId,
    customerName: r.name,
    customerCode: r.code,
    contactNumber: r.contactNumber,
    totalDebt: r.totalDebt,
    minimumPayment: formatNumberInput(String(Math.round(suggested))),
    confirmedAmount: "",
    confirmedDate: "",
    note: "",
  };
};

export function CreateDebtTicketModal({
  rows,
  onClose,
  onCreated,
}: {
  rows: DebtTrackingRow[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { data: usersData } = useUsersForFilter();
  const create = useCreateDebtTicket();
  const users = usersData ?? [];

  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Khách ban đầu = các dòng đã tick ở trang theo dõi công nợ; sau đó có thể
  // tìm thêm trực tiếp trong phiếu.
  const [lines, setLines] = useState<TicketLine[]>(() => rows.map(toLine));

  // ------------------ Tìm kiếm thêm khách ------------------
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: searchData, isFetching: searching } = useDebtTrackingSearch(
    searchDebounced || undefined
  );

  // Bỏ những khách đã nằm trong phiếu khỏi kết quả gợi ý.
  const results = useMemo(
    () =>
      (searchData?.data ?? []).filter(
        (r) => !lines.some((l) => l.customerId === r.customerId)
      ),
    [searchData, lines]
  );

  // Highlight luôn nằm trong phạm vi kết quả hiện có.
  const activeIndex = Math.min(
    highlightedIndex,
    Math.max(results.length - 1, 0)
  );

  useEffect(() => {
    if (showDropdown && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addCustomer = (row: DebtTrackingRow) => {
    setLines((prev) =>
      prev.some((l) => l.customerId === row.customerId)
        ? prev
        : [...prev, toLine(row)]
    );
    setSearch("");
    setSearchDebounced("");
    setShowDropdown(false);
  };

  const removeLine = (customerId: number) =>
    setLines((prev) => prev.filter((l) => l.customerId !== customerId));

  // ------------------ Tổng hợp & submit ------------------
  const setLine = (i: number, patch: Partial<TicketLine>) => {
    setLines((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
    );
  };

  const totalDebt = lines.reduce((s, l) => s + l.totalDebt, 0);
  const totalMinimum = lines.reduce(
    (s, l) => s + parseNumberInput(l.minimumPayment),
    0
  );

  /** Cảnh báo mềm: tối thiểu dưới 30% nợ hiện tại. */
  const isBelowRatio = (l: TicketLine) =>
    l.totalDebt > 0 &&
    parseNumberInput(l.minimumPayment) < l.totalDebt * MIN_PAYMENT_RATIO_WARN;

  const belowCount = lines.filter(isBelowRatio).length;

  const handleSubmit = () => {
    setError(null);
    if (!assigneeId) {
      setError("Vui lòng chọn nhân viên phụ trách");
      return;
    }
    if (lines.length === 0) {
      setError("Vui lòng thêm ít nhất một khách hàng");
      return;
    }

    create.mutate(
      {
        title: title.trim() || undefined,
        assigneeId: Number(assigneeId),
        note: note.trim() || undefined,
        customers: lines.map((l) => ({
          customerId: l.customerId,
          minimumPayment:
            l.minimumPayment !== ""
              ? parseNumberInput(l.minimumPayment)
              : undefined,
          confirmedAmount:
            l.confirmedAmount !== ""
              ? parseNumberInput(l.confirmedAmount)
              : undefined,
          confirmedDate: l.confirmedDate || undefined,
          note: l.note.trim() || undefined,
        })),
      },
      {
        onSuccess: () => {
          onCreated?.();
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div>
            <h3 className="font-semibold">Tạo phiếu thu hồi nợ</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {lines.length} khách hàng · Tổng nợ {formatCurrency(totalDebt)} đ
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Nhân viên phụ trách <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={users.map((u) => ({
                  value: String(u.id),
                  label: u.name,
                }))}
                value={assigneeId ? String(assigneeId) : ""}
                onChange={(v) => setAssigneeId(v ? Number(v) : "")}
                placeholder="— Chọn nhân viên —"
                searchPlaceholder="Tìm nhân viên…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Tiêu đề
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Thu hồi nợ khu vực Hà Nội tuần 12"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm resize-y"
              placeholder="Ghi chú chung cho phiếu…"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Danh sách khách ({lines.length})
              </label>
              <span className="text-xs text-gray-500">
                Tổng tối thiểu cần thu:{" "}
                <b className="text-gray-800">
                  {formatCurrency(totalMinimum)} đ
                </b>
              </span>
            </div>

            {/* Tìm thêm khách trực tiếp trong phiếu */}
            <div className="relative mb-2" ref={searchRef}>
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                  setShowDropdown(true);
                }}
                onFocus={() => search && setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowDropdown(false);
                    return;
                  }
                  if (!showDropdown || results.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightedIndex((i) =>
                      Math.min(i + 1, results.length - 1)
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (results[activeIndex]) {
                      addCustomer(results[activeIndex]);
                    }
                  }
                }}
                placeholder="Tìm thêm khách theo mã, tên, số điện thoại…"
                className="w-full border rounded pl-8 pr-3 py-2 text-sm"
              />

              {showDropdown && searchDebounced && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-72 overflow-y-auto z-20">
                  {searching && results.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tìm…
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">
                      Không tìm thấy khách phù hợp trong theo dõi công nợ
                    </div>
                  ) : (
                    results.map((r, index) => (
                      <button
                        key={r.customerId}
                        ref={(el) => {
                          itemRefs.current[index] = el;
                        }}
                        onClick={() => addCustomer(r)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 ${
                          index === activeIndex
                            ? "bg-gray-100"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium truncate">
                            {r.name}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {r.code}
                            {r.contactNumber ? ` · ${r.contactNumber}` : ""}
                          </span>
                        </span>
                        <span className="text-right shrink-0">
                          <span className="block text-sm tabular-nums">
                            {formatCurrency(r.totalDebt)} đ
                          </span>
                          {r.overdueAmount > 0 && (
                            <span className="block text-xs text-red-600 tabular-nums">
                              Quá hạn {formatCurrency(r.overdueAmount)}
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">
                      Khách hàng
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Nợ đầu kì
                    </th>
                    <th className="text-right px-3 py-2 font-medium w-44">
                      Số tiền tối thiểu
                    </th>
                    <th className="text-right px-3 py-2 font-medium w-44">
                      Khách xác nhận
                    </th>
                    <th className="text-left px-3 py-2 font-medium w-36">
                      Ngày xác nhận
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-6 text-center text-sm text-gray-400"
                      >
                        Chưa có khách nào — tìm và thêm khách qua ô tìm kiếm
                        phía trên.
                      </td>
                    </tr>
                  )}
                  {lines.map((l, i) => {
                    const below = isBelowRatio(l);
                    return (
                      <tr key={l.customerId}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{l.customerName}</div>
                          <div className="text-xs text-gray-400">
                            {l.customerCode}
                            {l.contactNumber ? ` · ${l.contactNumber}` : ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatCurrency(l.totalDebt)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.minimumPayment}
                            onChange={(e) =>
                              setLine(i, {
                                minimumPayment: formatNumberInput(
                                  e.target.value
                                ),
                              })
                            }
                            className={`w-full border rounded px-2 py-1 text-sm text-right tabular-nums ${
                              below ? "border-amber-400 bg-amber-50" : ""
                            }`}
                          />
                          {below && (
                            <div className="text-[11px] text-amber-600 mt-0.5 text-right">
                              Dưới 30% nợ
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={l.confirmedAmount}
                            onChange={(e) =>
                              setLine(i, {
                                confirmedAmount: formatNumberInput(
                                  e.target.value
                                ),
                              })
                            }
                            placeholder="Chưa xác nhận"
                            className="w-full border rounded px-2 py-1 text-sm text-right tabular-nums"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <DatePickerInput
                            value={l.confirmedDate}
                            onChange={(v) => setLine(i, { confirmedDate: v })}
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <button
                            onClick={() => removeLine(l.customerId)}
                            title="Xóa khỏi phiếu"
                            className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="flex items-start gap-1.5 text-xs text-gray-500">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <b>Số tiền tối thiểu</b> do hệ thống gợi ý (phần nợ đã đến
                  hạn), sửa được. <b>Khách xác nhận</b> là số khách cam kết trả
                  — có thể nhỏ hơn mức tối thiểu và chính là mốc đối chiếu để
                  đánh dấu đã thu.
                </span>
              </div>
              {belowCount > 0 && (
                <div className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    {belowCount} khách có số tiền tối thiểu dưới 30% nợ hiện
                    tại. Vẫn lưu được, chỉ là nhắc để bạn kiểm tra lại.
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="px-4 py-2 text-sm bg-brand text-white rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Tạo phiếu
          </button>
        </div>
      </div>
    </div>
  );
}
