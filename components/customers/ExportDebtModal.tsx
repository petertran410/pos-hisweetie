"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Calendar } from "lucide-react";
import { createPortal } from "react-dom";
import { MiniCalendar } from "@/components/shared/MiniCalendar";

const TIME_PRESETS = [
  { label: "Hôm nay", value: "today" },
  { label: "Tuần này", value: "this_week" },
  { label: "7 ngày qua", value: "last_7_days" },
  { label: "30 ngày qua", value: "last_30_days" },
  { label: "Tháng này", value: "this_month" },
  { label: "Tháng trước", value: "last_month" },
  { label: "Toàn thời gian", value: "all_time" },
];

export interface ExportDebtOptions {
  preset: string;
  fromDate?: string;
  toDate?: string;
  includeDetails: boolean;
  showUnit: boolean;
  showQty: boolean;
  showPrice: boolean;
  showDiscount: boolean;
  showTotal: boolean;
  showNote: boolean;
}

interface ExportDebtModalProps {
  isExporting: boolean;
  onClose: () => void;
  onConfirm: (opts: ExportDebtOptions) => void;
}

export function ExportDebtModal({
  isExporting,
  onClose,
  onConfirm,
}: ExportDebtModalProps) {
  const [preset, setPreset] = useState("all_time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [openCal, setOpenCal] = useState<"from" | "to" | null>(null);
  const customDateRef = useRef<HTMLDivElement>(null);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [showUnit, setShowUnit] = useState(true);
  const [showQty, setShowQty] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showTotal, setShowTotal] = useState(true);
  const [showNote, setShowNote] = useState(true);

  // Đóng MiniCalendar khi click ngoài
  useEffect(() => {
    if (!openCal) return;
    const onDown = (e: MouseEvent) => {
      if (
        customDateRef.current &&
        !customDateRef.current.contains(e.target as Node)
      ) {
        setOpenCal(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openCal]);

  const handleConfirm = () => {
    onConfirm({
      preset,
      fromDate: preset === "custom" ? fromDate : undefined,
      toDate: preset === "custom" ? toDate : undefined,
      includeDetails,
      showUnit,
      showQty,
      showPrice,
      showDiscount,
      showTotal,
      showNote,
    });
  };

  const detailCheckboxes = [
    { label: "DVT", value: showUnit, onChange: setShowUnit },
    { label: "Số lượng", value: showQty, onChange: setShowQty },
    { label: "Đơn giá", value: showPrice, onChange: setShowPrice },
    { label: "Giảm giá", value: showDiscount, onChange: setShowDiscount },
    { label: "Giá bán/trả", value: showTotal, onChange: setShowTotal },
    { label: "Ghi chú", value: showNote, onChange: setShowNote },
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">
            Xuất file công nợ
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Thời gian */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Thời gian</p>
            <div className="flex flex-wrap gap-2">
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    preset === p.value
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-gray-600 border-gray-300 hover:border-brand"
                  }`}>
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPreset("custom")}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  preset === "custom"
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-gray-600 border-gray-300 hover:border-brand"
                }`}>
                Lựa chọn khác
              </button>
            </div>

            {preset === "custom" && (
              <div ref={customDateRef} className="flex gap-2 mt-2">
                {(["from", "to"] as const).map((field) => {
                  const isFrom = field === "from";
                  const val = isFrom ? fromDate : toDate;
                  const label = isFrom ? "Từ ngày" : "Đến ngày";
                  const setVal = isFrom ? setFromDate : setToDate;
                  const isOpen = openCal === field;

                  return (
                    <div key={field} className="flex-1 relative">
                      <button
                        type="button"
                        onClick={() => setOpenCal(isOpen ? null : field)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 border rounded-lg text-sm transition-all ${
                          val
                            ? "border-brand bg-brand-soft text-gray-800"
                            : "border-gray-200 text-gray-400"
                        } ${
                          isOpen
                            ? "ring-2 ring-brand-soft border-brand"
                            : "hover:border-gray-300"
                        }`}>
                        <span className="truncate">
                          {val
                            ? new Date(val + "T00:00:00").toLocaleDateString(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                }
                              )
                            : label}
                        </span>
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </button>
                      {isOpen && (
                        <div
                          className={`absolute z-10 top-full mt-1 w-64 ${
                            isFrom ? "left-0" : "right-0"
                          }`}>
                          <MiniCalendar
                            value={val}
                            onChange={setVal}
                            onClose={() => setOpenCal(null)}
                            minDate={
                              field === "to" ? fromDate || undefined : undefined
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thông tin xuất file */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Thông tin xuất file
            </p>

            {/* Dữ liệu tổng quan — luôn có */}
            <div className="bg-gray-50 rounded-lg p-3 mb-2">
              <p className="text-sm font-medium text-gray-700">
                Dữ liệu tổng quan{" "}
                <span className="text-gray-400 font-normal">(luôn có)</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Thời gian, Mã, Ghi nợ, Ghi có
              </p>
            </div>

            {/* Chi tiết từng hàng */}
            <div className="border rounded-lg overflow-hidden">
              <label className="flex items-start gap-2.5 px-3 py-2.5 bg-gray-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="mt-0.5 accent-brand"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Chi tiết từng hàng giao dịch
                  </p>
                  <p className="text-xs text-gray-500">
                    Diễn giải chi tiết từng dòng sản phẩm/dịch vụ
                  </p>
                </div>
              </label>

              {includeDetails && (
                <div className="px-3 py-2 space-y-1.5 border-t">
                  {detailCheckboxes.map((cb) => (
                    <label
                      key={cb.label}
                      className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cb.value}
                        onChange={(e) => cb.onChange(e.target.checked)}
                        className="accent-brand"
                      />
                      <span className="text-sm text-gray-700">{cb.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">
            Bỏ qua
          </button>
          <button
            onClick={handleConfirm}
            disabled={isExporting}
            className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 flex items-center gap-2">
            {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
            Đồng ý
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
